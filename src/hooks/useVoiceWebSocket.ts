import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AudioRecorder, AudioQueue, AudioEncoder } from '@/utils/audioUtils';

interface VoiceMessage {
  type: string;
  data?: any;
  timestamp: number;
}

interface UseVoiceWebSocketProps {
  userId: string;
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: string) => void;
}

interface ConnectionMessage {
  type: string;
  userId: string;
  callId: string;
  assistantId: string;
  timestamp: number;
  auth?: string;
}

export const useVoiceWebSocket = ({
  userId,
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
  const connectionTimeout = useRef<number | null>(null);
  const connectionLockRef = useRef(false);
  const keepAliveInterval = useRef<number | null>(null);

  const log = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage: VoiceMessage = {
      type: 'log',
      data: { message, data },
      timestamp: Date.now()
    };
    console.log(`[${timestamp}] 🎙️ Voice WebSocket: ${message}`, data || '');
    messageLogRef.current.push(logMessage);
    if (messageLogRef.current.length > 100) {
      messageLogRef.current = messageLogRef.current.slice(-50);
    }
    onMessage?.(logMessage);
  }, [onMessage]);

  const initializeAudio = useCallback(async () => {
    try {
      log('🔄 Initializing audio system...');
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          log('✅ Audio context resumed');
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
      log('❌ Audio initialization error', error);
      onError?.(`Audio init failed: ${error}`);
      throw error;
    }
  }, [log, onError]);

  const validateAudioData = (audioData: Float32Array): boolean => {
    if (!audioData || !(audioData instanceof Float32Array)) return false;
    if (audioData.length < 100 || audioData.length > 48000) return false;
    if (audioData.some(sample => !isFinite(sample))) return false;
    const maxAmp = Math.max(...Array.from(audioData).map(Math.abs));
    return maxAmp >= 0.001 && maxAmp <= 1.0;
  };

  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    try {
      if (!validateAudioData(audioData)) {
        if (import.meta.env.DEV) log('⚠️ Invalid audio data detected, skipping chunk');
        return;
      }
      
      const base64Audio = AudioEncoder.encodeAudioForDeepgram(audioData);
      
      if (!base64Audio || base64Audio.length < 10) return;
      
      const message = { event: 'media', media: { payload: base64Audio } };
      wsRef.current.send(JSON.stringify(message));
      
      if (import.meta.env.DEV && Math.random() < 0.005) {
        const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
        log('📤 Audio chunk sent', {
          originalSize: audioData.length,
          encodedSize: base64Audio.length,
          maxAmplitude: maxAmplitude.toFixed(4)
        });
      }
    } catch (error) {
      log('❌ Audio send error', error);
      onError?.(`Audio send failed: ${error}`);
    }
  }, [log, onError]);

  const startRecording = useCallback(async () => {
    try {
      log('🎤 Starting audio recording...');
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      await audioRecorderRef.current.start();
      setIsRecording(true);
      log('✅ Audio recording started successfully');
    } catch (error) {
      log('❌ Recording start error', error);
      onError?.(`Recording failed: ${error}`);
      throw error;
    }
  }, [handleAudioData, log, onError]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      log('🛑 Audio recording stopped');
    }
  }, [log]);

  const handleAudioResponse = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current || !audioQueueRef.current) {
      log('⚠️ Audio system not initialized for playback');
      return;
    }

    try {
      const audioBuffer = await AudioEncoder.decodeAudioFromWebSocket(base64Audio, audioContextRef.current);
      await audioQueueRef.current.addToQueue(audioBuffer);
      log('🔊 Audio response queued for playback');
    } catch (error) {
      log('❌ Audio playback error', error);
      onError?.(`Audio playback failed: ${error}`);
    }
  }, [log, onError]);

  const startKeepAlive = useCallback(() => {
    if (keepAliveInterval.current) return;
    
    keepAliveInterval.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        log('💓 Keep-alive ping sent');
      }
    }, 5000) as unknown as number;
  }, [log]);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveInterval.current) {
      clearInterval(keepAliveInterval.current);
      keepAliveInterval.current = null;
      log('💓 Keep-alive stopped');
    }
  }, [log]);

  const connect = useCallback(async () => {
    if (connectionLockRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Connection attempt blocked - already connecting or connected');
      return;
    }

    try {
      connectionLockRef.current = true;
      setConnectionState('connecting');
      log('🔄 Connecting to voice WebSocket...', { userId, callId, assistantId });

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        log('❌ Session error', sessionError);
        throw new Error(`Session error: ${sessionError.message}`);
      }

      // Build WebSocket URL with authentication
      const wsUrl = new URL('wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-websocket');
      wsUrl.searchParams.set('userId', userId);
      wsUrl.searchParams.set('callId', callId || 'browser-test');
      wsUrl.searchParams.set('assistantId', assistantId || 'demo');

      log('🔗 WebSocket URL constructed', { url: wsUrl.toString() });

      // Initialize audio system first
      await initializeAudio();

      // Create WebSocket connection with auth headers
      wsRef.current = new WebSocket(wsUrl.toString());

      // Add auth header if we have a session
      if (session?.access_token) {
        // Note: WebSocket constructor doesn't accept headers in browser
        // Auth will be handled via query params or connection message
        log('🔐 Session token available for authentication');
      }

      wsRef.current.onopen = async () => {
        log('✅ WebSocket connection opened');
        connectionLockRef.current = false;
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttempts.current = 0;
        
        // Send connection message with auth if available
        const connectionMessage: ConnectionMessage = {
          type: 'connected',
          userId,
          callId: callId || 'browser-test',
          assistantId: assistantId || 'demo',
          timestamp: Date.now()
        };

        if (session?.access_token) {
          connectionMessage.auth = session.access_token;
        }

        wsRef.current?.send(JSON.stringify(connectionMessage));
        startKeepAlive();
        onConnectionChange?.(true);
        
        // Start recording after successful connection
        try {
          await startRecording();
        } catch (recordingError) {
          log('❌ Failed to start recording after connection', recordingError);
          onError?.(`Recording setup failed: ${recordingError}`);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          log('📨 WebSocket message received', { type: data.type });
          
          const message: VoiceMessage = {
            type: data.type,
            data: data,
            timestamp: Date.now()
          };
          
          onMessage?.(message);

          // Handle specific message types
          switch (data.type) {
            case 'audio_response':
              if (data.audio) {
                handleAudioResponse(data.audio);
              }
              break;
            case 'pong':
              log('💓 Keep-alive pong received');
              break;
            case 'connection_established':
              log('🎯 Connection confirmed by server');
              break;
            default:
              log('📋 Message processed', { type: data.type });
          }
        } catch (error) {
          log('❌ Message parsing error', error);
          onError?.(`Message parse failed: ${error}`);
        }
      };

      wsRef.current.onerror = (error) => {
        log('❌ WebSocket error', error);
        connectionLockRef.current = false;
        setConnectionState('error');
        onError?.(`WebSocket error: ${error}`);
      };

      wsRef.current.onclose = (event) => {
        log('🔌 WebSocket closed', { code: event.code, reason: event.reason });
        connectionLockRef.current = false;
        setIsConnected(false);
        setConnectionState('disconnected');
        stopRecording();
        stopKeepAlive();
        onConnectionChange?.(false);

        // Handle specific close codes
        if (event.code === 1008) {
          onError?.('Unauthorized: Call access denied');
        } else if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          // Attempt reconnection for unexpected closures
          reconnectAttempts.current++;
          log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          setTimeout(() => connect(), 2000 * reconnectAttempts.current);
        }
      };

      // Set connection timeout
      connectionTimeout.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          log('⏰ Connection timeout');
          wsRef.current.close();
          connectionLockRef.current = false;
          setConnectionState('error');
          onError?.('Connection timeout');
        }
      }, 10000) as unknown as number;

    } catch (error) {
      log('❌ Connection error', error);
      connectionLockRef.current = false;
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
      throw error;
    }
  }, [userId, callId, assistantId, initializeAudio, startRecording, handleAudioResponse, startKeepAlive, stopRecording, stopKeepAlive, onConnectionChange, onMessage, onError, log]);

  const disconnect = useCallback(() => {
    log('🔄 Disconnecting...');
    
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    stopKeepAlive();
    stopRecording();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }
    
    if (audioQueueRef.current) {
      audioQueueRef.current.clear();
    }
    
    setIsConnected(false);
    setConnectionState('disconnected');
    connectionLockRef.current = false;
    reconnectAttempts.current = 0;
    onConnectionChange?.(false);
    
    log('✅ Disconnect complete');
  }, [stopKeepAlive, stopRecording, onConnectionChange, log]);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'text_input',
        text,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      log('📤 Text message sent', { text: text.substring(0, 50) });
    } else {
      log('⚠️ Cannot send text - WebSocket not connected');
      onError?.('Cannot send message - not connected');
    }
  }, [log, onError]);

  const requestGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'request_greeting',
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      log('👋 Greeting requested');
    } else {
      log('⚠️ Cannot request greeting - WebSocket not connected');
      onError?.('Cannot request greeting - not connected');
    }
  }, [log, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    connectionState,
    connect,
    disconnect,
    sendTextMessage,
    requestGreeting
  };
};
