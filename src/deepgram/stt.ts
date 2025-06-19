
export interface STTConfig {
  apiKey: string;
  model: string;
  language: string;
  smartFormat: boolean;
  interimResults: boolean;
  endpointing: number;
  utteranceEndMs: number;
}

export interface TranscriptEvent {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export class DeepgramSTTClient {
  private config: STTConfig;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private onTranscriptCallback?: (event: TranscriptEvent) => void;
  private onConnectionChange?: (connected: boolean) => void;
  private onError?: (error: string) => void;

  constructor(config: STTConfig) {
    this.config = config;
  }

  async connect(
    onTranscript: (event: TranscriptEvent) => void,
    onConnectionChange?: (connected: boolean) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (this.isConnecting || (this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.onTranscriptCallback = onTranscript;
    this.onConnectionChange = onConnectionChange;
    this.onError = onError;
    this.isConnecting = true;

    try {
      const url = this.buildWebSocketUrl();
      console.log('🎤 Connecting to DeepGram STT:', url);
      
      this.websocket = new WebSocket(url, ['token', this.config.apiKey]);

      this.websocket.onopen = () => {
        console.log('✅ DeepGram STT connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
            const alternative = data.channel.alternatives[0];
            const transcriptEvent: TranscriptEvent = {
              transcript: alternative.transcript || '',
              confidence: alternative.confidence || 1.0,
              isFinal: data.is_final || false,
              timestamp: Date.now()
            };
            
            if (transcriptEvent.transcript.trim()) {
              console.log('📝 STT:', transcriptEvent);
              this.onTranscriptCallback?.(transcriptEvent);
            }
          } else if (data.type === 'Metadata') {
            console.log('📊 STT Metadata:', data);
          }
        } catch (error) {
          console.error('❌ Error parsing STT message:', error);
          this.onError?.(`STT parsing error: ${error}`);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('❌ DeepGram STT WebSocket error:', error);
        this.isConnecting = false;
        this.onError?.('STT connection error');
        this.handleReconnect();
      };

      this.websocket.onclose = (event) => {
        console.log('🔌 DeepGram STT WebSocket closed:', event.code, event.reason);
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
          this.onError?.('STT connection timeout');
          this.websocket?.close();
        }
      }, 10000);

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ STT connection failed:', error);
      this.onError?.(`STT connection failed: ${error}`);
      throw error;
    }
  }

  sendAudio(audioData: Uint8Array): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(audioData);
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting STT');
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
      language: this.config.language,
      smart_format: this.config.smartFormat.toString(),
      interim_results: this.config.interimResults.toString(),
      endpointing: this.config.endpointing.toString(),
      utterance_end_ms: this.config.utteranceEndMs.toString()
    });

    return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max STT reconnection attempts reached');
      this.onError?.('STT max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting STT reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.onTranscriptCallback && this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.onTranscriptCallback, this.onConnectionChange, this.onError).catch(console.error);
      }
    }, delay);
  }
}
