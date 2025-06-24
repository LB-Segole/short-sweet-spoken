
/**
 * Enhanced Voice WebSocket Hook with Migration Support
 * 
 * This hook uses the new service layer architecture and provides:
 * - Robust WebSocket connection with automatic reconnection
 * - Backend abstraction (Supabase now, Railway later)
 * - Improved error handling and logging
 * - Audio processing and queue management
 * - Connection state management
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { WebSocketService, WebSocketState } from '../services/WebSocketService';
import { useBackendService } from './useBackendService';

export interface AudioRecorder {
  start(): Promise<void>;
  stop(): void;
}

export interface VoiceWebSocketConfig {
  userId: string;
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean, state: WebSocketState) => void;
  onMessage?: (message: any) => void;
  onError?: (error: string) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAIResponse?: (text: string) => void;
  onAudioResponse?: (audioData: string) => void;
}

class SimpleAudioRecorder implements AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start(): Promise<void> {
    try {
      console.log('🎤 SimpleAudioRecorder: Starting audio recording');
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 24000 });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('✅ SimpleAudioRecorder: Audio recording started successfully');
    } catch (error) {
      console.error('❌ SimpleAudioRecorder: Failed to start recording', error);
      throw error;
    }
  }

  stop(): void {
    console.log('🛑 SimpleAudioRecorder: Stopping audio recording');
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    console.log('✅ SimpleAudioRecorder: Audio recording stopped');
  }
}

export const useEnhancedVoiceWebSocket = (config: VoiceWebSocketConfig) => {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempt: 0
  });

  const wsServiceRef = useRef<WebSocketService | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const { voice } = useBackendService();

  // Handle audio data from microphone
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (!wsServiceRef.current?.isConnected) return;
    
    try {
      const processedAudio = voice.processAudioData(audioData);
      wsServiceRef.current.send({
        event: 'media',
        media: { payload: processedAudio },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Failed to process audio data:', error);
      config.onError?.(`Audio processing failed: ${error}`);
    }
  }, [voice, config.onError]);

  // Handle WebSocket messages
  const handleMessage = useCallback((message: any) => {
    console.log('📨 Voice WebSocket message received:', message.type);
    
    // Process message through backend service
    const processedMessage = voice.handleMessage(message);
    
    // Call general message handler
    config.onMessage?.(processedMessage);

    // Handle specific message types
    switch (processedMessage.type) {
      case 'transcript':
        if (processedMessage.data?.text) {
          config.onTranscript?.(processedMessage.data.text, processedMessage.data.isFinal || false);
        }
        break;

      case 'ai_response':
        if (processedMessage.data?.text) {
          config.onAIResponse?.(processedMessage.data.text);
        }
        break;

      case 'audio_response':
        if (processedMessage.data?.audio) {
          config.onAudioResponse?.(processedMessage.data.audio);
        }
        break;

      case 'connection_ready':
        console.log('✅ Voice service ready');
        break;

      case 'error':
        console.error('❌ Voice service error:', processedMessage.data?.error);
        config.onError?.(processedMessage.data?.error || 'Voice service error');
        break;

      default:
        console.log(`📨 Unhandled voice message: ${processedMessage.type}`);
    }
  }, [voice, config]);

  // Handle connection state changes
  const handleStateChange = useCallback((state: WebSocketState) => {
    console.log('🔄 Voice WebSocket state changed:', state);
    setConnectionState(state);
    config.onConnectionChange?.(state.connected, state);
    
    if (!state.connected) {
      setIsRecording(false);
    }
  }, [config.onConnectionChange]);

  // Handle WebSocket errors
  const handleError = useCallback((error: string) => {
    console.error('❌ Voice WebSocket error:', error);
    config.onError?.(error);
  }, [config.onError]);

  // Connect to voice WebSocket
  const connect = useCallback(async () => {
    if (wsServiceRef.current?.isConnected) {
      console.log('⚠️ Already connected to voice WebSocket');
      return;
    }

    try {
      console.log('🔄 Connecting to voice WebSocket...');
      
      // Create WebSocket URL through backend service
      const wsUrl = voice.createWebSocketUrl('deepgram-voice-agent', {
        userId: config.userId,
        callId: config.callId || 'browser-test',
        assistantId: config.assistantId || 'demo'
      });

      // Initialize WebSocket service
      wsServiceRef.current = new WebSocketService({
        url: wsUrl,
        reconnectAttempts: 5,
        reconnectDelay: 1000,
        maxReconnectDelay: 10000,
        timeout: 10000,
        enableLogging: true
      });

      // Set up event handlers
      wsServiceRef.current.onMessage = handleMessage;
      wsServiceRef.current.onError = handleError;
      wsServiceRef.current.onStateChange = handleStateChange;
      wsServiceRef.current.onOpen = () => {
        console.log('✅ Voice WebSocket connected successfully');
        
        // Send initial connection message
        wsServiceRef.current?.send({
          type: 'connected',
          userId: config.userId,
          callId: config.callId || 'browser-test',
          assistantId: config.assistantId || 'demo',
          timestamp: Date.now()
        });
      };

      await wsServiceRef.current.connect();
      
    } catch (error) {
      console.error('❌ Failed to connect voice WebSocket:', error);
      config.onError?.(`Connection failed: ${error}`);
      throw error;
    }
  }, [config, voice, handleMessage, handleError, handleStateChange]);

  // Disconnect from voice WebSocket
  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting voice WebSocket...');
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
    }
    
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
    }
    
    setConnectionState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempt: 0
    });
  }, []);

  // Start audio recording
  const startRecording = useCallback(async () => {
    if (!connectionState.connected) {
      throw new Error('Not connected to voice service');
    }

    if (isRecording) {
      console.log('⚠️ Already recording audio');
      return;
    }

    try {
      console.log('🎤 Starting audio recording...');
      
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new SimpleAudioRecorder(handleAudioData);
      }
      
      await audioRecorderRef.current.start();
      setIsRecording(true);
      
      console.log('✅ Audio recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      config.onError?.(`Recording failed: ${errorMessage}`);
      throw error;
    }
  }, [connectionState.connected, isRecording, handleAudioData, config.onError]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (!isRecording) {
      console.log('⚠️ Not currently recording');
      return;
    }

    console.log('🛑 Stopping audio recording...');
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    setIsRecording(false);
    console.log('✅ Audio recording stopped');
  }, [isRecording]);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!wsServiceRef.current?.isConnected) {
      throw new Error('Not connected to voice service');
    }
    
    console.log('📤 Sending text message:', text);
    
    return wsServiceRef.current.send({
      type: 'text_input',
      text,
      timestamp: Date.now()
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up voice WebSocket hook');
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    isConnected: connectionState.connected,
    isConnecting: connectionState.connecting,
    isRecording,
    connectionState,
    error: connectionState.error,
    
    // Connection methods
    connect,
    disconnect,
    
    // Audio methods
    startRecording,
    stopRecording,
    
    // Messaging methods
    sendTextMessage,
    
    // Utility methods
    getBackendType: () => voice.getCurrentBackendType?.() || 'unknown'
  };
};

export default useEnhancedVoiceWebSocket;
