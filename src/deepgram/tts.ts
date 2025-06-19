
export interface TTSConfig {
  apiKey: string;
  model: string;
  encoding: string;
  sampleRate: number;
  container: string;
}

export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
}

export class DeepgramTTSClient {
  private config: TTSConfig;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private onAudioCallback?: (chunk: AudioChunk) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: string) => void;

  constructor(config: TTSConfig) {
    this.config = config;
  }

  async connect(
    onAudio: (chunk: AudioChunk) => void,
    onConnectionChange?: (connected: boolean) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (this.isConnecting || (this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.onAudioCallback = onAudio;
    this.onConnectionChange = onConnectionChange;
    this.onError = onError;
    this.isConnecting = true;

    try {
      const url = this.buildWebSocketUrl();
      console.log('🔊 Connecting to DeepGram TTS:', url);
      
      this.websocket = new WebSocket(url, ['token', this.config.apiKey]);

      this.websocket.onopen = () => {
        console.log('✅ DeepGram TTS connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
      };

      this.websocket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const audioChunk: AudioChunk = {
            data: new Uint8Array(event.data),
            timestamp: Date.now()
          };
          console.log('🎵 TTS audio chunk received:', audioChunk.data.length, 'bytes');
          this.onAudioCallback?.(audioChunk);
        } else {
          try {
            const data = JSON.parse(event.data);
            console.log('📊 TTS message:', data);
          } catch (error) {
            console.warn('⚠️ Unexpected TTS message format');
          }
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ DeepGram TTS WebSocket error:', error);
        this.isConnecting = false;
        this.onError?.('TTS connection error');
        this.handleReconnect();
      };

      this.websocket.onclose = (event) => {
        console.log('🔌 DeepGram TTS WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.onConnectionChange?.(false);
        
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        }
      };

      // Connection timeout
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          this.onError?.('TTS connection timeout');
          this.websocket?.close();
        }
      }, 10000);

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ TTS connection failed:', error);
      this.onError?.(`TTS connection failed: ${error}`);
      throw error;
    }
  }

  sendText(text: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN && text.trim()) {
      const message = {
        type: 'Speak',
        text: text.trim()
      };
      console.log('📤 TTS sending:', text);
      this.websocket.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ TTS not connected, cannot send text:', text);
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting TTS');
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
    this.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      model: this.config.model,
      encoding: this.config.encoding,
      sample_rate: this.config.sampleRate.toString(),
      container: this.config.container
    });

    return `wss://api.deepgram.com/v1/speak?${params.toString()}`;
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max TTS reconnection attempts reached');
      this.onError?.('TTS max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting TTS reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.onAudioCallback && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.onAudioCallback, this.onConnectionChange, this.onError).catch(console.error);
      }
    }, delay);
  }
}
