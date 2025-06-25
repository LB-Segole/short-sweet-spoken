
export interface SimpleVoiceConfig {
  userId: string;
  callId?: string;
  assistantId?: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onAudioResponse?: (audioData: string) => void;
  onError?: (error: string) => void;
}

export class SimpleVoiceWebSocket {
  private ws: WebSocket | null = null;
  private config: SimpleVoiceConfig;
  private isConnecting = false;
  private isManualDisconnect = false;
  private connectionTimeout: number | null = null;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(config: SimpleVoiceConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) {
      console.log('🚫 Already connecting or connected, skipping...');
      return;
    }

    this.isConnecting = true;
    this.isManualDisconnect = false;

    try {
      console.log('🔄 Connecting to voice WebSocket...');
      
      // Use the correct deepgram-voice-agent endpoint
      const url = new URL('wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent');
      url.searchParams.set('userId', this.config.userId);
      url.searchParams.set('callId', this.config.callId || 'browser-test');
      url.searchParams.set('assistantId', this.config.assistantId || 'demo');

      console.log('🔗 WebSocket URL:', url.toString());
      console.log('🔗 URL Parameters:', {
        userId: this.config.userId,
        callId: this.config.callId || 'browser-test',
        assistantId: this.config.assistantId || 'demo'
      });

      this.ws = new WebSocket(url.toString());

      console.log('🔌 WebSocket created, current state:', this.ws.readyState);
      console.log('🔌 WebSocket ready states: CONNECTING=0, OPEN=1, CLOSING=2, CLOSED=3');

      // Set connection timeout - increased for Edge Function cold starts
      this.connectionTimeout = window.setTimeout(() => {
        console.log('⏰ Connection timeout after 30 seconds');
        console.log('🔌 WebSocket state during timeout:', this.ws?.readyState);
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.log('🔌 Closing WebSocket due to timeout');
          this.ws.close();
        }
        this.cleanup();
        this.config.onError?.('Connection timeout - Edge Function may be starting up. Check Edge Function logs.');
      }, 30000); // 30 seconds for cold starts

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        console.log('🔌 WebSocket state on open:', this.ws?.readyState);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Send initial connection message
        this.send({
          type: 'connected',
          userId: this.config.userId,
          callId: this.config.callId || 'browser-test',
          assistantId: this.config.assistantId || 'demo',
          timestamp: Date.now()
        });

        this.config.onConnected?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received message:', data.type, data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Message parsing error:', error);
          console.error('❌ Raw message data:', event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('🔌 WebSocket state during error:', this.ws?.readyState);
        this.isConnecting = false;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.config.onError?.('WebSocket connection error - Check Edge Function logs for details');
      };

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        console.log('🔌 Close event details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          type: event.type
        });
        this.isConnecting = false;
        
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        this.config.onDisconnected?.();

        // Handle reconnection for unexpected closures
        if (!this.isManualDisconnect && event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts}`);
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.log('❌ Max reconnection attempts reached');
          this.config.onError?.('Max reconnection attempts reached. Check Edge Function logs.');
        }
      };

    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.isConnecting = false;
      this.config.onError?.(`Connection failed: ${error}. Check Edge Function logs for more details.`);
      throw error;
    }
  }

  disconnect(): void {
    console.log('🔄 Disconnecting WebSocket...');
    this.isManualDisconnect = true;
    this.cleanup();
  }

  send(message: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message:', message.type || 'unknown', message);
      this.ws.send(JSON.stringify(message));
      return true;
    }
    console.warn('⚠️ Cannot send message - WebSocket not connected. State:', this.ws?.readyState);
    return false;
  }

  sendText(text: string): boolean {
    return this.send({
      type: 'text_input',
      text,
      timestamp: Date.now()
    });
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'transcript':
        if (data.text) {
          this.config.onTranscript?.(data.text, data.isFinal || false);
        }
        break;

      case 'ai_response':
        if (data.text) {
          this.config.onAIResponse?.(data.text);
        }
        break;

      case 'audio_response':
        if (data.audio) {
          this.config.onAudioResponse?.(data.audio);
        }
        break;

      case 'connection_ready':
      case 'ack':
        console.log('✅ Voice service ready');
        break;

      case 'pong':
        console.log('💓 Received pong');
        break;

      case 'error':
        console.error('❌ Voice service error:', data.error || data.details);
        this.config.onError?.(data.error || 'Voice service error');
        break;

      default:
        console.log(`📋 Unhandled message: ${data.type}`, data);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch(error => {
        console.error('❌ Reconnect failed:', error);
      });
    }, delay);
  }

  private cleanup(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        console.log('🔌 Closing WebSocket connection');
        this.ws.close(1000, 'Manual disconnect');
      }
      this.ws = null;
    }
  }
}
