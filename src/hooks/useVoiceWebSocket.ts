import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AudioRecorder, AudioQueue, AudioEncoder } from '@/utils/audioUtils';

interface VoiceMessage {
  type: string;
  data?: any;
  timestamp: number;
}

interface UseVoiceWebSocketProps {
  userId: string;                      // REQUIRED - Add user ID for validation
  callId?: string;
  assistantId?: string;
  onConnectionChange?: (connected: boolean) => void;
  onMessage?: (message: VoiceMessage) => void;
  onError?: (error: string) => void;
}

export const useVoiceWebSocket = ({
  userId,
  callId,
  assistantId,
  onConnectionChange,
  onMessage,
  onError
}: UseVoiceWebSocketProps) => {
  // Supabase client for call ownership & auth
  const supabaseRef = useRef<SupabaseClient>(
    createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    )
  );

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
  const connectionLockRef = useRef(false);  // prevent race conditions

  // Enhanced logging with rotation
  const log = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage: VoiceMessage = {
      type: 'log',
      data: { message, data },
      timestamp: Date.now()
    };
    console.log(`[${timestamp}] 🎙️ Voice WebSocket: ${message}`, data || '');
    messageLogRef.current.push(logMessage);
    // Keep only last 100 messages
    if (messageLogRef.current.length > 100) {
      messageLogRef.current = messageLogRef.current.slice(-50);
    }
    onMessage?.(logMessage);
  }, [onMessage]);

  // Initialize audio system
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

  // Validate audio data
  const validateAudioData = (audioData: Float32Array): boolean => {
    if (!audioData || !(audioData instanceof Float32Array)) return false;
    if (audioData.length < 100 || audioData.length > 48000) return false;
    if (audioData.some(sample => !isFinite(sample))) return false;
    const maxAmp = Math.max(...Array.from(audioData).map(Math.abs));
    return maxAmp >= 0.001 && maxAmp <= 1.0;
  };

  // Handle outgoing audio
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    try {
      if (!validateAudioData(audioData)) {
        log('⚠️ Invalid audio data detected, skipping chunk');
        return;
      }
      const base64Audio = AudioEncoder.encodeAudioForWebSocket(audioData);
      if (!base64Audio || base64Audio.length < 10) return;
      const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
      const message = { event: 'media', media: { payload: base64Audio } };
      wsRef.current.send(JSON.stringify(message));
      // Log only in development at 0.1%
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.001) {
        log('📤 Audio chunk sent', {
          originalSize: audioData.length,
          encodedSize: base64Audio.length,
          maxAmplitude: maxAmplitude.toFixed(4),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      log('❌ Audio send error', error);
      onError?.(`Audio send failed: ${error}`);
    }
  }, [log, onError]);

  // Recording controls
  const startRecording = useCallback(async () => {
    try {
      log('🎤 Starting recording...');
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      await audioRecorderRef.current.start();
      setIsRecording(true);
      log('✅ Recording started');
    } catch (error) {
      log('❌ Recording start error', error);
      onError?.(`Recording failed: ${error}`);
      setIsRecording(false);
    }
  }, [handleAudioData, log, onError]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      log('🛑 Recording stopped');
    }
  }, [log]);

  // Heartbeat
  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    heartbeatInterval.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
        log('💓 Heartbeat');
      }
    }, 30000);
  }, [log]);

  // Connect with auth, validation, locking, and recovery
  const connect = useCallback(async () => {
    if (!userId) throw new Error('User ID required');
    if (connectionLockRef.current) return;
    connectionLockRef.current = true;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      connectionLockRef.current = false;
      return;
    }

    try {
      setConnectionState('connecting');
      log('🔄 Connecting...', { userId, callId, assistantId });

      // Validate call ownership
      if (callId) {
        const { data: callData, error: callErr } = await supabaseRef.current
          .from('calls')
          .select('user_id, status')
          .eq('call_id', callId)
          .single();
        if (callErr || !callData || callData.user_id !== userId) {
          throw new Error('Unauthorized: Call access denied');
        }
      }

      await initializeAudio();

      // Fetch auth token
      const { data: { session } } = await supabaseRef.current.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      // Build WebSocket URL
      const baseUrl = import.meta.env.VITE_VOICE_WEBSOCKET_URL!;
      const params = new URLSearchParams({ callId: callId || 'browser-test', assistantId: assistantId || 'demo', userId, token: authToken });
      const wsUrl = `${baseUrl}?${params.toString()}`;
      log('🌐 WebSocket URL', wsUrl);

      wsRef.current = new WebSocket(wsUrl);
      connectionTimeout.current = window.setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          log('⏰ Connection timeout');
          wsRef.current?.close();
          setConnectionState('error');
          onError?.('Timeout - failed to connect in 15s');
        }
      }, 15000);

      wsRef.current.onopen = () => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('✅ Connected'); setIsConnected(true); setConnectionState('connected'); onConnectionChange?.(true);
        reconnectAttempts.current = 0;
        setupHeartbeat();

        wsRef.current?.send(JSON.stringify({ event: 'connected', protocol: 'voice-streaming', version: '1.0', callId, assistantId, timestamp: Date.now() }));
        log('📤 Connect message');
        setTimeout(startRecording, 500);
        connectionLockRef.current = false;
      };

      wsRef.current.onmessage = async evt => {
        let data: any;
        try {
          data = JSON.parse(evt.data);
        } catch { return; }
        // Validate message type
        const eventType = data.type || data.event;
        const allowed = ['connection_established','audio_response','text_response','greeting_sent','transcript','ai_response','error','pong'];
        if (!allowed.includes(eventType)) {
          log('❌ Invalid message type', data); return;
        }
        log('📨 Received', { type: eventType });
        const message: VoiceMessage = { type: eventType, data, timestamp: Date.now() };
        onMessage?.(message);

        switch (eventType) {
          case 'audio_response':
            if (data.audio && audioQueueRef.current) {
              try {
                const audioBuf = AudioEncoder.decodeAudioFromWebSocket(data.audio);
                await audioQueueRef.current.addToQueue(audioBuf);
                log('✅ Audio queued');
              } catch (err) {
                log('❌ Audio processing error', err);
              }
            }
            break;
          case 'error':
            onError?.(data.message || 'Unknown WS error');
            break;
        }
      };

      wsRef.current.onerror = err => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('❌ WS error', err);
        setConnectionState('error');
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 2000 * reconnectAttempts.current);
        } else {
          onError?.('Failed after multiple retries');
        }
        connectionLockRef.current = false;
      };

      wsRef.current.onclose = evt => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        log('🔌 Closed', { code: evt.code, reason: evt.reason });
        setIsConnected(false); setConnectionState('disconnected'); onConnectionChange?.(false);
        stopRecording();
        audioQueueRef.current?.clear();
        if (evt.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 1000 * reconnectAttempts.current);
        }
        connectionLockRef.current = false;
      };

    } catch (error) {
      log('❌ Connect error', error);
      setConnectionState('error');
      onError?.(`${error}`);
      connectionLockRef.current = false;
    }
  }, [userId, callId, assistantId, initializeAudio, startRecording, setupHeartbeat, onConnectionChange, onMessage, onError]);

  // Disconnect with audio context suspend
  const disconnect = useCallback(async () => {
    log('🔌 Disconnecting');
    reconnectAttempts.current = maxReconnectAttempts;
    if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    stopRecording();
    wsRef.current?.close(1000, 'User disconnected');
    wsRef.current = null;
    // Suspend audio context for reuse
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      log('⏸ Audio context suspended');
    }
    audioQueueRef.current?.clear(); audioQueueRef.current = null;
    setIsConnected(false); setIsRecording(false); setConnectionState('disconnected');
    log('✅ Disconnected');
  }, [stopRecording, log]);

  // Text and greeting
  const sendTextMessage = useCallback((text: string) => {
    if (!text?.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'text_input', text: text.trim() }));
      log('💬 Sent text', { length: text.length });
    } else {
      onError?.('Not connected');
    }
  }, [log, onError]);

  const requestGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'request_greeting', callId, timestamp: Date.now() }));
      log('👋 Greeting requested');
    } else {
      onError?.('Not connected');
    }
  }, [callId, log, onError]);

  // Network monitoring for auto-recovery
  useEffect(() => {
    const onOnline = () => {
      if (!isConnected && connectionState === 'error') {
        log('🌐 Online - retrying'); connect();
      }
    };
    const onOffline = () => {
      if (isConnected) { log('📡 Offline - pausing'); disconnect(); }
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [isConnected, connectionState, connect, disconnect, log]);

  // Cleanup on unmount
  useEffect(() => () => { disconnect(); }, [disconnect]);

  return {
    // State
    isConnected,
    isRecording,
    connectionState,
    // Accessibility
    ariaLabel: isConnected ? 'Voice connection active' : 'Voice connection inactive',
    ariaLive: connectionState === 'error' ? 'assertive' : 'polite',
    connectionStatus: `Voice connection ${connectionState}. ${isRecording ? 'Recording active' : 'Not recording'}`,
    // Actions
    connect,
    disconnect,
    sendTextMessage,
    requestGreeting,
    // Data
    messageLog: messageLogRef.current
  };
};
