
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const heartbeatInterval = useRef<number | null>(null);
  const connectionTimeout = useRef<number | null>(null);
  const connectionLockRef = useRef(false);

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
        log('⚠️ Invalid audio data detected, skipping chunk');
        return;
      }
      const base64Audio = AudioEncoder.encodeAudioForWebSocket(audioData);
      if (!base64Audio || base64Audio.length < 10) return;
      const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
      const message = { event: 'media', media: { payload: base64Audio } };
      wsRef.current.send(JSON.stringify(message));
      if (import.meta.env.DEV && Math.random() < 0.001) {
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

  const setupHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    heartbeatInterval.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'ping', timestamp: Date.now() }));
        log('💓 Heartbeat');
      }
    }, 30000);
  }, [log]);

  const connect = useCallback(async () => {
    if (!userId) {
      onError?.('User ID required for voice connection');
      return;
    }
    
    if (connectionLockRef.current) return;
    connectionLockRef.current = true;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('⚠️ Already connected');
      connectionLockRef.current = false;
      return;
    }

    try {
      setConnectionState('connecting');
      log('🔄 Connecting to voice WebSocket...', { userId, callId, assistantId });

      // Validate call ownership if callId provided
      if (callId) {
        const { data: callData, error: callErr } = await supabase
          .from('calls')
          .select('user_id, status')
          .eq('call_id', callId)
          .single();
        if (callErr || !callData || callData.user_id !== userId) {
          throw new Error('Unauthorized: Call access denied');
        }
      }

      await initializeAudio();

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) throw new Error('Authentication required');

      // Build WebSocket URL with proper wss:// protocol
      const baseUrl = 'wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/voice-websocket';
      const params = new URLSearchParams({ 
        callId: callId || 'browser-test', 
        assistantId: assistantId || 'demo', 
        userId, 
        token: authToken 
      });
      const wsUrl = `${baseUrl}?${params.toString()}`;
      log('🌐 WebSocket URL configured', wsUrl);

      wsRef.current = new WebSocket(wsUrl);
      connectionTimeout.current = window.setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          log('⏰ Connection timeout');
          wsRef.current?.close();
          setConnectionState('error');
          onError?.('Connection timeout - failed to connect in 15 seconds');
        }
      }, 15000);

      wsRef.current.onopen = () => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('✅ Voice WebSocket connected'); 
        setIsConnected(true); 
        setConnectionState('connected'); 
        onConnectionChange?.(true);
        reconnectAttempts.current = 0;
        setupHeartbeat();

        wsRef.current?.send(JSON.stringify({ 
          event: 'connected', 
          protocol: 'voice-streaming', 
          version: '1.0', 
          callId, 
          assistantId, 
          timestamp: Date.now() 
        }));
        log('📤 Connection handshake sent');
        setTimeout(startRecording, 500);
        connectionLockRef.current = false;
      };

      wsRef.current.onmessage = async evt => {
        let data: any;
        try {
          data = JSON.parse(evt.data);
        } catch { return; }
        
        const eventType = data.type || data.event;
        const allowed = ['connection_established','audio_response','text_response','greeting_sent','transcript','ai_response','error','pong'];
        if (!allowed.includes(eventType)) {
          log('❌ Invalid message type', data); 
          return;
        }
        
        log('📨 Received message', { type: eventType });
        const message: VoiceMessage = { type: eventType, data, timestamp: Date.now() };
        onMessage?.(message);

        switch (eventType) {
          case 'audio_response':
            if (data.audio && audioQueueRef.current) {
              try {
                const audioBuf = AudioEncoder.decodeAudioFromWebSocket(data.audio);
                await audioQueueRef.current.addToQueue(audioBuf);
                log('✅ Audio queued for playback');
              } catch (err) {
                log('❌ Audio processing error', err);
              }
            }
            break;
          case 'error':
            onError?.(data.message || 'Unknown WebSocket error');
            break;
        }
      };

      wsRef.current.onerror = err => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('❌ WebSocket error', err);
        setConnectionState('error');
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 2000 * reconnectAttempts.current);
        } else {
          onError?.('Connection failed after multiple retry attempts');
        }
        connectionLockRef.current = false;
      };

      wsRef.current.onclose = evt => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        log('🔌 WebSocket closed', { code: evt.code, reason: evt.reason });
        setIsConnected(false); 
        setConnectionState('disconnected'); 
        onConnectionChange?.(false);
        stopRecording();
        audioQueueRef.current?.clear();
        if (evt.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(connect, 1000 * reconn0ectAttempts.current);
        }
        connectionLockRef.current = false;
      };

    } catch (error) {
      log('❌ Connection error', error);
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
      connectionLockRef.current = false;
    }
  }, [userId, callId, assistantId, initializeAudio, startRecording, setupHeartbeat, onConnectionChange, onMessage, onError]);

  const disconnect = useCallback(async () => {
    log('🔌 Disconnecting voice WebSocket');
    reconnectAttempts.current = maxReconnectAttempts;
    if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
    if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    stopRecording();
    wsRef.current?.close(1000, 'User disconnected');
    wsRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      await audioContextRef.current.suspend();
      log('⏸ Audio context suspended');
    }
    audioQueueRef.current?.clear(); 
    audioQueueRef.current = null;
    setIsConnected(false); 
    setIsRecording(false); 
    setConnectionState('disconnected');
    log('✅ Voice WebSocket disconnected');
  }, [stopRecording, log]);

  const sendTextMessage = useCallback((text: string) => {
    if (!text?.trim()) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'text_input', text: text.trim() }));
      log('💬 Text message sent', { length: text.length });
    } else {
      onError?.('Not connected to voice service');
    }
  }, [log, onError]);

  const requestGreeting = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'request_greeting', callId, timestamp: Date.now() }));
      log('👋 Greeting requested');
    } else {
      onError?.('Not connected to voice service');
    }
  }, [callId, log, onError]);

  // Network monitoring for auto-recovery
  useEffect(() => {
    const onOnline = () => {
      if (!isConnected && connectionState === 'error') {
        log('🌐 Network online - attempting reconnection'); 
        connect();
      }
    };
    const onOffline = () => {
      if (isConnected) { 
        log('📡 Network offline - pausing connection'); 
        disconnect(); 
      }
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
