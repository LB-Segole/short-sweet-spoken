
import { WebSocketManager } from '@/utils/websocketManager';
import { backendService } from './BackendService';

export interface VoiceMessage {
  type: string;
  data?: any;
  timestamp: number;
}

export interface VoiceWebSocketConfig {
  userId: string;
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onAudioResponse?: (audioData: string) => void;
}

export class VoiceWebSocketService {
  private wsManager: WebSocketManager | null = null;
  private config: VoiceWebSocketConfig;
  private keepAliveInterval: number | null = null;

  constructor(config: VoiceWebSocketConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      console.log('🎙️ Initializing voice WebSocket connection...');
      
      // Create WebSocket URL through backend service
      const wsUrl = backendService.createVoiceWebSocketUrl('deepgram-voice-agent');
      const url = new URL(wsUrl);
      url.searchParams.set('userId', this.config.userId);
      url.searchParams.set('callId', this.config.callId || 'browser-test');
      url.searchParams.set('assistantId', this.config.assistantId || 'demo');

      this.wsManager = new WebSocketManager({
        url: url.toString(),
        reconnectAttempts: 3,
        reconnectDelay: 1000,
        maxReconnectDelay: 10000,
        timeout: 10000
      });

      this.wsManager.onOpen = () => {
        console.log('✅ Voice WebSocket connected');
        this.config.onConnectionChange?.(true);
        this.startKeepAlive();
        
        // Send initial connection message
        this.send({
          type: 'connected',
          userId: this.config.userId,
          callId: this.config.callId || 'browser-test',
          assistantId: this.config.assistantId || 'demo',
          timestamp: Date.now()
        });
      };

      this.wsManager.onMessage = (data) => {
        this.handleMessage(data);
      };

      this.wsManager.onError = (error) => {
        console.error('❌ Voice WebSocket error:', error);
        this.config.onError?.(error);
      };

      this.wsManager.onClose = (code, reason) => {
        console.log(`🔌 Voice WebSocket closed: ${code} - ${reason}`);
        this.config.onConnectionChange?.(false);
        this.stopKeepAlive();
        
        if (code === 1006) {
          this.config.onError?.('WebSocket connection failed (1006). Please check your internet connection and try again.');
        }
      };

      this.wsManager.onReconnect = (attempt) => {
        console.log(`🔄 Voice WebSocket reconnecting (attempt ${attempt})`);
        this.config.onError?.(`Reconnecting... (attempt ${attempt})`);
      };

      await this.wsManager.connect();
      
    } catch (error) {
      console.error('❌ Failed to connect voice WebSocket:', error);
      this.config.onError?.(`Connection failed: ${error}`);
      throw error;
    }
  }

  disconnect(): void {
    console.log('🔄 Disconnecting voice WebSocket...');
    this.stopKeepAlive();
    this.wsManager?.disconnect();
    this.wsManager = null;
    this.config.onConnectionChange?.(false);
  }

  send(message: any): boolean {
    if (!this.wsManager?.isConnected) {
      console.warn('⚠️ Cannot send message - WebSocket not connected');
      return false;
    }
    
    return this.wsManager.send(message);
  }

  sendAudio(audioData: string): boolean {
    return this.send({
      event: 'media',
      media: { payload: audioData },
      timestamp: Date.now()
    });
  }

  sendText(text: string): boolean {
    return this.send({
      type: 'text_input',
      text,
      timestamp: Date.now()
    });
  }

  private handleMessage(data: any): void {
    const message: VoiceMessage = {
      type: data.type || data.event,
      data,
      timestamp: Date.now()
    };

    // Emit generic message event
    this.config.onMessage?.(message);

    // Handle specific message types
    switch (message.type) {
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

      case 'pong':
        console.log('💓 Received pong from voice service');
        break;

      case 'connection_ready':
      case 'ack':
        console.log('✅ Voice service ready');
        break;

      case 'error':
        console.error('❌ Voice service error:', data.error);
        this.config.onError?.(data.error || 'Voice service error');
        break;

      default:
        console.log(`📨 Voice message: ${message.type}`);
    }
  }

  private startKeepAlive(): void {
    if (this.keepAliveInterval) return;
    
    this.keepAliveInterval = window.setInterval(() => {
      if (this.wsManager?.isConnected) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  get isConnected(): boolean {
    return this.wsManager?.isConnected ?? false;
  }

  get readyState(): number {
    return this.wsManager?.readyState ?? WebSocket.CLOSED;
  }
}
