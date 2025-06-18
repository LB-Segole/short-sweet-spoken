import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioRecorder, AudioQueue, AudioEncoder } from '@/utils/audioUtils';

interface VoiceMessage {
  type: string;
  data?: any;
  timestamp: number;
}

interface UseVoiceWebSocketProps {
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: string) => void;
}

export const useVoiceWebSocket = ({
  callId,
  assistantId,
  onConnectionChange,
  onMessage,
  onError
}: UseVoiceWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const messageLogRef = useRef<VoiceMessage[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  // Logging function
  const log = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage: VoiceMessage = {
      type: 'log',
      data: { message, data },
      timestamp: Date.now()
    };
    
    console.log(`[${timestamp}] 🎙️ Voice WebSocket: ${message}`, data || '');
    messageLogRef.current.push(logMessage);
    onMessage?.(logMessage);
  }, [onMessage]);

  // Initialize audio context and queue
  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        log('✅ Audio context initialized');
      }
      
      if (!audioQueueRef.current && audioContextRef.current) {
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
        log('✅ Audio queue initialized');
      }
    } catch (error) {
      log('❌ Error initializing audio', error);
      onError?.(`Audio initialization failed: ${error}`);
    }
  }, [log, onError]);

  // Handle incoming audio data
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Only process if we have enough audio data
        if (audioData.length < 100) {
          return; // Skip very small chunks
        }

        const base64Audio = AudioEncoder.encodeAudioForWebSocket(audioData);

        // Only send if encoding produced data
        if (!base64Audio || base64Audio.length < 10) {
          log('⚠️ Skipping audio chunk - encoding produced no data');
          return;
        }

      const message = {
          event: 'media',
          media: {
            payload: base64Audio
          }
      };

      wsRef.current.send(JSON.stringify(message));

        // Log more frequently during troubleshooting
        if (Math.random() < 0.02) {  // Increased from 0.005 to 0.02
          log('📤 Audio chunk sent', {
            originalSize: audioData.length,
            encodedSize: base64Audio.length,
            sampleValue: audioData[0]  // Log first sample value for debugging
          });
    }
      } catch (error) {
        log('❌ Error sending audio data', error);
      }
    } else {
      // Log if websocket is not open
      if (Math.random() < 0.05) {
        log('⚠️ WebSocket not open, cannot send audio', {
          readyState: wsRef.current?.readyState
        });
      }
    }
  }, [log]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      
      await audioRecorderRef.current.start();
      setIsRecording(true);
      log('🎤 Recording started');
    } catch (error) {
      log('❌ Error starting recording', error);
      onError?.(`Recording failed: ${error}`);
    }
  }, [handleAudioData, log, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      log('🛑 Recording stopped');
    }
  }, [log]);

  // Connect to WebSocket with retry logic
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      return;
    }

    try {
      setConnectionState('connecting');
      log('🔄 Connecting to voice WebSocket...');

      // Initialize audio first
      await initializeAudio();

      // Construct WebSocket URL directly
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.functions.supabase.co/functions/v1/voice-websocket?callId=${callId || 'browser-test'}&assistantId=${assistantId || 'demo'}`;
      
      log('🌐 WebSocket URL', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          log('⏰ Connection timeout');
          wsRef.current?.close();
          setConnectionState('error');
          onError?.('Connection timeout');
        }
      }, 10000);

      wsRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setConnectionState('connected');
        onConnectionChange?.(true);
        reconnectAttempts.current = 0;

        // Send initial connection message
        const connectMessage = {
          event: 'connected',
          protocol: 'voice-streaming',
          version: '1.0',
          callId: callId,
          assistantId: assistantId
        };
        wsRef.current?.send(JSON.stringify(connectMessage));
        log('📤 Connection message sent');

        // Start recording immediately
        startRecording();
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          log('📨 Received WebSocket message', { type: data.type || data.event });

          const message: VoiceMessage = {
            type: data.type || data.event || 'unknown',
            data: data,
            timestamp: Date.now()
          };
          onMessage?.(message);

          // Handle different message types
          switch (data.type || data.event) {
            case 'connection_established':
              log('🤝 Connection established');
              break;

            case 'audio_response':
              if (data.audio && audioQueueRef.current) {
                try {
                  const audioData = AudioEncoder.decodeAudioFromWebSocket(data.audio);
                  await audioQueueRef.current.addToQueue(audioData);
                  log('🔊 Audio response queued for playback');
                } catch (error) {
                  log('❌ Error processing audio response', error);
                }
              }
              break;

            case 'text_response':
              log('💬 Text response received', data.text);
              break;

            case 'greeting_sent':
              log('👋 Greeting sent successfully');
              break;

            case 'transcript':
              log('📝 Transcript received', data.text);
              break;

            case 'ai_response':
              log('🤖 AI response generated', data.text);
              break;

            case 'error':
              log('❌ WebSocket error message', data);
              onError?.(data.message || 'Unknown error');
              break;

            default:
              log('❓ Unknown message type', data);
          }
        } catch (error) {
          log('❌ Error processing WebSocket message', error);
        }
      };

      wsRef.current.onerror = (error) => {
        clearTimeout(connectionTimeout);
        log('❌ WebSocket error', error);
        setConnectionState('error');
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          log(`🔄 Retrying connection (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(() => connect(), 2000 * reconnectAttempts.current);
        } else {
          onError?.('WebSocket connection failed after multiple attempts');
        }
      };

      wsRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        log('🔌 WebSocket closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionState('disconnected');
        onConnectionChange?.(false);
        stopRecording();
        
        // Clean up audio
        if (audioQueueRef.current) {
          audioQueueRef.current.clear();
        }

        // Auto-reconnect on unexpected close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          log(`🔄 Auto-reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          setTimeout(() => connect(), 1000 * reconnectAttempts.current);
        }
      };

    } catch (error) {
      log('❌ Error connecting to WebSocket', error);
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
    }
  }, [callId, assistantId, initializeAudio, startRecording, stopRecording, log, onConnectionChange, onMessage, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    log('🔌 Disconnecting...');
    
    // Reset reconnect attempts
    reconnectAttempts.current = maxReconnectAttempts;
    
    stopRecording();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
      audioQueueRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setConnectionState('disconnected');
    log('✅ Disconnected successfully');
  }, [stopRecording, log]);

  // Send text message
  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'text_input',
        text: text
      };
      wsRef.current.send(JSON.stringify(message));
      log('💬 Text message sent', text);
    } else {
      log('❌ Cannot send text - WebSocket not connected');
    }
  }, [log]);

  // Request greeting
  const requestGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'request_greeting',
        callId: callId
      };
      wsRef.current.send(JSON.stringify(message));
      log('👋 Greeting requested');
    }
  }, [callId, log]);

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
    connectionState,
    
    // Actions
    connect,
    disconnect,
    sendTextMessage,
    requestGreeting,
    
    // Data
    messageLog: messageLogRef.current
  };
};
