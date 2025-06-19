
import { DeepgramConfig, STTConfig, TranscriptResult } from './types';

export class DeepgramSTTClient {
  private config: DeepgramConfig;
  private sttConfig: STTConfig;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: DeepgramConfig, sttConfig: STTConfig) {
    this.config = config;
    this.sttConfig = sttConfig;
  }

  async connect(onTranscript: (result: TranscriptResult) => void): Promise<void> {
    const url = this.buildWebSocketUrl();
    
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(url, ['token', this.config.apiKey]);

      this.websocket.onopen = () => {
        console.log('DeepGram STT connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
            const alternative = data.channel.alternatives[0];
            const result: TranscriptResult = {
              transcript: alternative.transcript,
              confidence: alternative.confidence || 1.0,
              isFinal: data.is_final || false,
              timestamp: Date.now()
            };
            
            if (result.transcript.trim()) {
              onTranscript(result);
            }
          }
        } catch (error) {
          console.error('Error parsing STT message:', error);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('DeepGram STT WebSocket error:', error);
        this.handleReconnect(onTranscript);
      };

      this.websocket.onclose = (event) => {
        console.log('DeepGram STT WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) { // Not a normal closure
          this.handleReconnect(onTranscript);
        }
      };

      // Timeout for connection
      setTimeout(() => {
        if (this.websocket?.readyState === WebSocket.CONNECTING) {
          reject(new Error('STT connection timeout'));
        }
      }, 10000);
    });
  }

  sendAudio(audioData: Uint8Array): void {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(audioData);
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }
  }

  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      model: this.sttConfig.model,
      language: this.sttConfig.language,
      smart_format: this.sttConfig.smartFormat.toString(),
      interim_results: this.sttConfig.interimResults.toString(),
      endpointing: this.sttConfig.endpointing.toString()
    });

    return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  }

  private async handleReconnect(onTranscript: (result: TranscriptResult) => void): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max STT reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting STT reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect(onTranscript).catch(console.error);
    }, delay);
  }
}
