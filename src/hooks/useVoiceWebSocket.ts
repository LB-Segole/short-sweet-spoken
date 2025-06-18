
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
  const heartbeatInterval = useRef<number | null>(null);
  const connectionTimeout = useRef<number | null>(null);

  // Enhanced logging function with timestamps
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

  // Initialize audio context and queue with error handling
  const initializeAudio = useCallback(async () => {
    try {
      log('🔄 Initializing audio system...');
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          log('✅ Audio context resumed from suspended state');
        }
        log('✅ Audio context initialized', { 
          sampleRate: audioContextRef.current.sampleRate,
          state: audioContextRef.current.state 
        });
      }
      
      if (!audioQueueRef.current && audioContextRef.current) {
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
        log('✅ Audio queue initialized');
      }
      
      return true;
    } catch (error) {
      log('❌ Error initializing audio', error);
      onError?.(`Audio initialization failed: ${error}`);
      throw error;
    }
  }, [log, onError]);

  // Enhanced audio data handler with validation
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      log('⚠️ WebSocket not open, cannot send audio', {
        readyState: wsRef.current?.readyState || 'null',
        dataLength: audioData.length
      });
      return;
    }

    try {
      // Validate audio data
      if (audioData.length < 100) {
        return; // Skip very small chunks
      }

      // Check for silence (very low amplitude)
      const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
      if (maxAmplitude < 0.001) {
        return; // Skip silent audio
      }

      const base64Audio = AudioEncoder.encodeAudioForWebSocket(audioData);

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

      // Enhanced logging with audio characteristics
      if (Math.random() < 0.01) { // Log 1% of chunks for monitoring
        log('📤 Audio chunk sent', {
          originalSize: audioData.length,
          encodedSize: base64Audio.length,
          maxAmplitude: maxAmplitude.toFixed(4),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      log('❌ Error sending audio data', error);
      onError?.(`Audio send error: ${error}`);
    }
  }, [log, onError]);

  // Start recording with enhanced error handling
  const startRecording = useCallback(async () => {
    try {
      log('🎤 Starting audio recording...');
      
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      
      await audioRecorderRef.current.start();
      setIsRecording(true);
      log('✅ Recording started successfully');
    } catch (error) {
      log('❌ Error starting recording', error);
      onError?.(`Recording failed: ${error}`);
      setIsRecording(false);
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

  // Setup heartbeat to keep WebSocket alive
  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    heartbeatInterval.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
        log('💓 Heartbeat sent');
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, [log]);

  // Enhanced connect function with better error handling
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      return;
    }

    try {
      setConnectionState('connecting');
      log('🔄 Connecting to voice WebSocket...', { callId, assistantId });

      // Initialize audio first
      const audioInitialized = await initializeAudio();
      if (!audioInitialized) {
        throw new Error('Failed to initialize audio system');
      }

      const wsUrl = `wss://csixccpoxpnwowbgkoyw.functions.supabase.co/functions/v1/voice-websocket?callId=${callId || 'browser-test'}&assistantId=${assistantId || 'demo'}`;
      
      log('🌐 WebSocket URL', wsUrl);

      wsRef.current = new WebSocket(wsUrl);

      // Set connection timeout
      connectionTimeout.current = window.setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          log('⏰ Connection timeout after 15 seconds');
          wsRef.current?.close();
          setConnectionState('error');
          onError?.('Connection timeout - WebSocket failed to connect within 15 seconds');
        }
      }, 15000);

      wsRef.current.onopen = () => {
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        
        log('✅ WebSocket connected successfully');
        setIsConnected(true);
        setConnectionState('connected');
        onConnectionChange?.(true);
        reconnectAttempts.current = 0;

        // Setup heartbeat
        setupHeartbeat();

        // Send initial connection message with more details
        const connectMessage = {
          event: 'connected',
          protocol: 'voice-streaming',
          version: '1.0',
          callId: callId,
          assistantId: assistantId,
          timestamp: Date.now(),
          clientInfo: {
            userAgent: navigator.userAgent,
            audioSupport: 'WebAudio',
            sampleRate: audioContextRef.current?.sampleRate || 24000
          }
        };
        wsRef.current?.send(JSON.stringify(connectMessage));
        log('📤 Connection message sent', connectMessage);

        // Start recording immediately after successful connection
        setTimeout(() => startRecording(), 500);
      };

      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          log('📨 Received WebSocket message', { 
            type: data.type || data.event,
            hasAudio: !!data.audio,
            hasText: !!data.text,
            timestamp: Date.now()
          });

          const message: VoiceMessage = {
            type: data.type || data.event || 'unknown',
            data: data,
            timestamp: Date.now()
          };
          onMessage?.(message);

          // Handle different message types
          switch (data.type || data.event) {
            case 'connection_established':
              log('🤝 Connection established by server');
              break;

            case 'audio_response':
              if (data.audio && audioQueueRef.current) {
                try {
                  log('🔊 Processing audio response', { 
                    audioLength: data.audio.length,
                    text: data.text 
                  });
                  
                  const audioData = AudioEncoder.decodeAudioFromWebSocket(data.audio);
                  await audioQueueRef.current.addToQueue(audioData);
                  log('✅ Audio response queued for playback', { 
                    decodedLength: audioData.length 
                  });
                } catch (error) {
                  log('❌ Error processing audio response', error);
                }
              } else {
                log('⚠️ Audio response missing audio data', data);
              }
              break;

            case 'text_response':
              log('💬 Text response received', data.text);
              break;

            case 'greeting_sent':
              log('👋 Greeting sent successfully');
              break;

            case 'transcript':
              log('📝 Transcript received', { text: data.text, confidence: data.confidence });
              break;

            case 'ai_response':
              log('🤖 AI response generated', { text: data.text, shouldTransfer: data.shouldTransfer });
              break;

            case 'error':
              log('❌ WebSocket error message', data);
              onError?.(data.message || 'Unknown WebSocket error');
              break;

            case 'pong':
              log('💓 Heartbeat pong received');
              break;

            default:
              log('❓ Unknown message type', { type: data.type || data.event, data });
          }
        } catch (error) {
          log('❌ Error processing WebSocket message', error);
          onError?.(`Message processing error: ${error}`);
        }
      };

      wsRef.current.onerror = (error) => {
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        
        log('❌ WebSocket error', error);
        setConnectionState('error');
        
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = 2000 * reconnectAttempts.current;
          log(`🔄 Retrying connection (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${delay}ms`);
          setTimeout(() => connect(), delay);
        } else {
          onError?.('WebSocket connection failed after multiple attempts');
        }
      };

      wsRef.current.onclose = (event) => {
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }
        
        log('🔌 WebSocket closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionState('disconnected');
        onConnectionChange?.(false);
        stopRecording();
        
        // Clean up audio
        if (audioQueueRef.current) {
          audioQueueRef.current.clear();
        }

        // Auto-reconnect on unexpected close (not user-initiated)
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = 1000 * reconnectAttempts.current;
          log(`🔄 Auto-reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts}) in ${delay}ms`);
          setTimeout(() => connect(), delay);
        }
      };

    } catch (error) {
      log('❌ Error connecting to WebSocket', error);
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
    }
  }, [callId, assistantId, initializeAudio, startRecording, stopRecording, log, onConnectionChange, onMessage, onError, setupHeartbeat]);

  // Enhanced disconnect function
  const disconnect = useCallback(() => {
    log('🔌 Disconnecting...');
    
    // Reset reconnect attempts
    reconnectAttempts.current = maxReconnectAttempts;
    
    // Clear timeouts and intervals
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
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

  // Send text message with validation
  const sendTextMessage = useCallback((text: string) => {
    if (!text || !text.trim()) {
      log('⚠️ Cannot send empty text message');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'text_input',
        text: text.trim()
      };
      wsRef.current.send(JSON.stringify(message));
      log('💬 Text message sent', { text: text.trim(), length: text.length });
    } else {
      log('❌ Cannot send text - WebSocket not connected', { 
        readyState: wsRef.current?.readyState || 'null' 
      });
      onError?.('Cannot send message - not connected');
    }
  }, [log, onError]);

  // Request greeting with validation
  const requestGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        event: 'request_greeting',
        callId: callId,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      log('👋 Greeting requested');
    } else {
      log('❌ Cannot request greeting - WebSocket not connected');
      onError?.('Cannot request greeting - not connected');
    }
  }, [callId, log, onError]);

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
