
/**
 * Enhanced WebSocket Service with Robust Error Handling and Reconnection
 * This service provides a reliable WebSocket connection with:
 * - Automatic reconnection with exponential backoff
 * - Proper error handling and logging
 * - Connection state management
 * - Message queuing during disconnection
 * - Cleanup on component unmount
 */

export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  timeout?: number;
  enableLogging?: boolean;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempt: number;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: WebSocketState = {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0
  };
  
  private messageQueue: string[] = [];
  private reconnectTimeout: number | null = null;
  private connectionTimeout: number | null = null;
  private isManualDisconnect = false;
  
  // Event handlers
  public onOpen?: () => void;
  public onMessage?: (data: any) => void;
  public onError?: (error: string) => void;
  public onClose?: (code: number, reason: string) => void;
  public onStateChange?: (state: WebSocketState) => void;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      timeout: 10000,
      protocols: [],
      enableLogging: true,
      ...config
    };
    
    this.log('🔌 WebSocketService initialized', { url: this.config.url });
  }

  async connect(): Promise<void> {
    if (this.state.connecting || this.state.connected) {
      this.log('⚠️ Connection already in progress or established');
      return;
    }

    return new Promise((resolve, reject) => {
      this.updateState({ connecting: true, error: null });
      this.isManualDisconnect = false;
      
      this.log('🔄 Attempting WebSocket connection...', { 
        attempt: this.state.reconnectAttempt + 1,
        maxAttempts: this.config.reconnectAttempts 
      });
      
      this.cleanup();
      
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        
        // Set connection timeout
        this.connectionTimeout = window.setTimeout(() => {
          this.log('⏰ Connection timeout exceeded');
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            this.handleError('Connection timeout');
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout);

        this.ws.onopen = () => {
          this.log('✅ WebSocket connection established');
          this.clearConnectionTimeout();
          
          this.updateState({ 
            connected: true, 
            connecting: false, 
            error: null,
            reconnectAttempt: 0
          });
          
          this.flushMessageQueue();
          this.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.log('📨 Message received', { type: data.type || 'unknown' });
            this.onMessage?.(data);
          } catch (error) {
            this.log('❌ Failed to parse message', { error, raw: event.data });
            this.handleError(`Message parse error: ${error}`);
          }
        };

        this.ws.onerror = (event) => {
          this.log('❌ WebSocket error occurred', { event });
          this.clearConnectionTimeout();
          this.handleError('WebSocket connection error');
          
          if (this.state.connecting) {
            reject(new Error('WebSocket connection failed'));
          }
        };

        this.ws.onclose = (event) => {
          this.log('🔌 WebSocket connection closed', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean 
          });
          
          this.clearConnectionTimeout();
          this.updateState({ connected: false, connecting: false });
          
          this.onClose?.(event.code, event.reason);
          
          // Handle specific error codes
          if (event.code === 1006) {
            this.handleError('Connection closed abnormally (1006) - network or server issue');
          } else if (event.code === 1011) {
            this.handleError('Server error (1011) - unexpected condition');
          }
          
          // Auto-reconnect if not manual disconnect and we haven't exceeded attempts
          if (!this.isManualDisconnect && this.shouldReconnect(event.code)) {
            this.scheduleReconnect();
          } else if (!this.isManualDisconnect) {
            this.handleError('Max reconnection attempts reached');
          }
        };

      } catch (error) {
        this.log('❌ Failed to create WebSocket', { error });
        this.clearConnectionTimeout();
        this.updateState({ connecting: false, error: `Failed to create WebSocket: ${error}` });
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.log('🔄 Manual disconnect requested');
    this.isManualDisconnect = true;
    this.cleanup();
    this.updateState({ 
      connected: false, 
      connecting: false, 
      error: null,
      reconnectAttempt: 0 
    });
  }

  send(data: any): boolean {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      this.log('📤 Message sent', { type: data.type || 'unknown' });
      return true;
    } else {
      this.log('⚠️ WebSocket not ready, queuing message', { 
        readyState: this.ws?.readyState,
        queueLength: this.messageQueue.length 
      });
      this.messageQueue.push(message);
      return false;
    }
  }

  private updateState(updates: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
  }

  private cleanup(): void {
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    
    if (this.ws) {
      // Remove event listeners to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Manual disconnect');
      }
      this.ws = null;
    }
    
    this.messageQueue = [];
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private shouldReconnect(code: number): boolean {
    // Don't reconnect on normal closure or certain error codes
    if (code === 1000 || code === 1001 || code === 1005) return false;
    return this.state.reconnectAttempt < this.config.reconnectAttempts;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.state.reconnectAttempt++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.state.reconnectAttempt - 1),
      this.config.maxReconnectDelay
    );
    
    this.log('🔄 Scheduling reconnection', { 
      attempt: this.state.reconnectAttempt,
      maxAttempts: this.config.reconnectAttempts,
      delay 
    });
    
    this.updateState({ error: `Reconnecting... (attempt ${this.state.reconnectAttempt}/${this.config.reconnectAttempts})` });
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(error => {
        this.log('❌ Reconnection attempt failed', { error });
        if (this.state.reconnectAttempt >= this.config.reconnectAttempts) {
          this.handleError('Max reconnection attempts reached');
        }
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    this.log('📤 Flushing message queue', { count: this.messageQueue.length });
    
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  private handleError(error: string): void {
    this.log('❌ Handling error', { error });
    this.updateState({ error });
    this.onError?.(error);
  }

  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      if (data) {
        console.log(`🔌 ${message}`, data);
      } else {
        console.log(`🔌 ${message}`);
      }
    }
  }

  // Public getters for component access
  get isConnected(): boolean {
    return this.state.connected;
  }

  get isConnecting(): boolean {
    return this.state.connecting;
  }

  get currentError(): string | null {
    return this.state.error;
  }

  get reconnectAttempt(): number {
    return this.state.reconnectAttempt;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get connectionState(): WebSocketState {
    return { ...this.state };
  }
}
