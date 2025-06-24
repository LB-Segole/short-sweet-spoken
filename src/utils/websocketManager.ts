
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  timeout?: number;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimeout: number | null = null;
  private connectionTimeout: number | null = null;
  private isManualDisconnect = false;
  private messageQueue: string[] = [];
  
  public onOpen?: () => void;
  public onMessage?: (data: any) => void;
  public onError?: (error: string) => void;
  public onClose?: (code: number, reason: string) => void;
  public onReconnect?: (attempt: number) => void;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      timeout: 10000,
      protocols: [],
      ...config
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.cleanup();
      this.isManualDisconnect = false;
      
      console.log(`🔄 WebSocket connecting to: ${this.config.url}`);
      
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        
        // Set connection timeout
        this.connectionTimeout = window.setTimeout(() => {
          console.log('⏰ WebSocket connection timeout');
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, this.config.timeout);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.onOpen?.();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.onMessage?.(data);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
            this.onError?.(`Message parse error: ${error}`);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          this.onError?.('WebSocket connection error');
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = (event) => {
          console.log(`🔌 WebSocket closed: code=${event.code}, reason=${event.reason}`);
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
          
          this.onClose?.(event.code, event.reason);
          
          if (!this.isManualDisconnect && this.shouldReconnect(event.code)) {
            this.scheduleReconnect();
          }
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  send(data: any): boolean {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      return true;
    } else {
      console.log('⚠️ WebSocket not ready, queuing message');
      this.messageQueue.push(message);
      return false;
    }
  }

  disconnect(): void {
    console.log('🔄 WebSocket manual disconnect');
    this.isManualDisconnect = true;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.messageQueue = [];
  }

  private shouldReconnect(code: number): boolean {
    // Don't reconnect on normal closure or certain error codes
    if (code === 1000 || code === 1001 || code === 1005) return false;
    return this.reconnectAttempts < this.config.reconnectAttempts;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts} in ${delay}ms`);
    this.onReconnect?.(this.reconnectAttempts);
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(error => {
        console.error('❌ Reconnect failed:', error);
        if (this.reconnectAttempts >= this.config.reconnectAttempts) {
          this.onError?.('Max reconnection attempts reached');
        }
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.ws.send(message);
      }
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
