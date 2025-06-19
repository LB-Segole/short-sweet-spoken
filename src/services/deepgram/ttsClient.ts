
import { DeepgramConfig, TTSConfig, AudioChunk } from './types';

export class DeepgramTTSClient {
  private config: DeepgramConfig;
  private ttsConfig: TTSConfig;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: DeepgramConfig, ttsConfig: TTSConfig) {
    this.config = config;
    this.ttsConfig = ttsConfig;
  }

  async connect(onAudio: (chunk: AudioChunk) => void): Promise<void> {
    const url = this.buildWebSocketUrl();
    
    return new Promise((resolve, reject) => {
      this.websocket = new WebSocket(url, ['token', this.config.apiKey]);

      this.websocket.onopen = () => {
        console.log('DeepGram TTS connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.websocket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          const audioChunk: AudioChunk = {
            data: new Uint8Array(event.data),
            timestamp: Date.now()
          };
          onAudio(audioChunk);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('DeepGram TTS WebSocket error:', error);
        this.handleReconnect(onAudio);
      };

      this.websocket.onclose = (event) => {
        console.log('DeepGram TTS WebSocket closed:', event.code, event.reason);
        if (event.code !== 1000) {
          this.handleReconnect(onAudio);
        }
      };

      setTimeout(() => {
        if (this.websocket?.readyState === WebSocket.CONNECTING) {
          reject(new Error('TTS connection timeout'));
        }
      }, 10000);
    });
  }

  sendText(text: string): void {
    if (this.websocket?.readyState === WebSocket.OPEN && text.trim()) {
      const message = {
        type: 'Speak',
        text: text.trim()
      };
      this.websocket.send(JSON.stringify(message));
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
      model: this.ttsConfig.model,
      encoding: this.ttsConfig.encoding,
      sample_rate: this.ttsConfig.sampleRate.toString()
    });

    return `wss://api.deepgram.com/v1/speak?${params.toString()}`;
  }

  private async handleReconnect(onAudio: (chunk: AudioChunk) => void): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max TTS reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting TTS reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect(onAudio).catch(console.error);
    }, delay);
  }
}
