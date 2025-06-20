import { useState, useRef, useCallback, useEffect } from 'react';
import { RealtimeAudioCapture, RealtimeAudioPlayer } from '@/utils/realtimeAudioUtils';

interface RealtimeVoiceMessage {
  type: string;
  data?: any;
  timestamp: number;
}

interface UseRealtimeVoiceProps {
  userId: string;
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: RealtimeVoiceMessage) => void;
  onError?: (error: string) => void;
}

export const useRealtimeVoice = ({
  userId,
  callId,
  assistantId,
  onConnectionChange,
  onMessage,
  onError
}: UseRealtimeVoiceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const audioCaptureRef = useRef<RealtimeAudioCapture | null>(null);
  const audioPlayerRef = useRef<RealtimeAudioPlayer | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  const log = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🎙️ Realtime Voice: ${message}`, data || '');
    
    const logMessage: RealtimeVoiceMessage = {
      type: 'log',
      data: { message, data },
      timestamp: Date.now()
    };
    onMessage?.(logMessage);
  }, [onMessage]);

  // Initialize audio player
  const initializeAudioPlayer = useCallback(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new RealtimeAudioPlayer();
      log('✅ Audio player initialized');
    }
  }, [log]);

  // Handle incoming audio data
  const handleAudioData = useCallback((base64Audio: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Start audio recording
  const startRecording = useCallback(async () => {
    try {
      log('🎤 Starting realtime recording...');
      if (!audioCaptureRef.current) {
        audioCaptureRef.current = new RealtimeAudioCapture(handleAudioData);
      }
      await audioCaptureRef.current.start();
      setIsRecording(true);
      log('✅ Realtime recording started');
    } catch (error) {
      log('❌ Recording start error', error);
      onError?.(`Recording failed: ${error}`);
      setIsRecording(false);
    }
  }, [handleAudioData, log, onError]);

  // Stop audio recording
  const stopRecording = useCallback(() => {
    if (audioCaptureRef.current) {
      audioCaptureRef.current.stop();
      audioCaptureRef.current = null;
      setIsRecording(false);
      log('🛑 Realtime recording stopped');
    }
  }, [log]);

  // Connect to realtime WebSocket
  const connect = useCallback(async () => {
    if (!userId) {
      throw new Error('User ID required');
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      return;
    }

    try {
      setConnectionState('connecting');
      log('🔄 Connecting to realtime voice service...', { userId, callId, assistantId });

      initializeAudioPlayer();

      // Build WebSocket URL for the new realtime function
      const baseUrl = process.env.REACT_APP_SUPABASE_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
      const params = new URLSearchParams({
        callId: callId || 'browser-test',
        assistantId: assistantId || 'demo',
        userId
      });
      const wsUrl = `${baseUrl}/functions/realtime-voice-websocket?${params.toString()}`;
      
      log('🌐 WebSocket URL:', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        log('✅ Connected to realtime service');
        setIsConnected(true);
        setConnectionState('connected');
        onConnectionChange?.(true);

        // Start recording after connection
        setTimeout(startRecording, 500);

        // Setup ping interval
        pingIntervalRef.current = window.setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          log('📨 Received message:', { type: data.type });

          const message: RealtimeVoiceMessage = {
            type: data.type,
            data: data.data || data,
            timestamp: Date.now()
          };
          onMessage?.(message);

          // Handle specific message types
          switch (data.type) {
            case 'response.audio.delta':
              if (data.data?.delta && audioPlayerRef.current) {
                await audioPlayerRef.current.playAudioDelta(data.data.delta);
                setIsSpeaking(true);
              }
              break;

            case 'response.audio.done':
              setIsSpeaking(false);
              log('🔊 Audio response completed');
              break;

            case 'conversation.item.input_audio_transcription.completed':
              log('📝 User said:', data.data?.transcript);
              break;

            case 'response.text.delta':
              log('💬 AI response:', data.data?.delta);
              break;

            case 'error':
              onError?.(data.data?.message || 'Unknown error');
              break;

            case 'pong':
              // Heartbeat response
              break;

            default:
              log('📨 Other message type:', data.type);
          }

        } catch (error) {
          log('❌ Error processing message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        log('❌ WebSocket error:', error);
        setConnectionState('error');
        onError?.('WebSocket connection error');
      };

      wsRef.current.onclose = (event) => {
        log('🔌 WebSocket closed:', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionState('disconnected');
        setIsSpeaking(false);
        onConnectionChange?.(false);
        stopRecording();
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
      };

    } catch (error) {
      log('❌ Connection error:', error);
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
    }
  }, [userId, callId, assistantId, onConnectionChange, onMessage, onError, initializeAudioPlayer, startRecording, stopRecording, log]);

  // Disconnect
  const disconnect = useCallback(() => {
    log('🔌 Disconnecting...');
    
    stopRecording();
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setConnectionState('disconnected');
    log('✅ Disconnected');
  }, [stopRecording, log]);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (!text?.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text.trim()
          }
        ]
      }
    };

    wsRef.current.send(JSON.stringify(message));
    log('💬 Text message sent:', { text: text.trim() });
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    isConnected,
    isRecording,
    isSpeaking,
    connectionState,
    
    // Actions
    connect,
    disconnect,
    sendTextMessage,
    
    // Status info
    connectionStatus: `Realtime voice ${connectionState}. ${isRecording ? 'Recording active' : 'Not recording'}. ${isSpeaking ? 'AI speaking' : 'AI silent'}`
  };
};
