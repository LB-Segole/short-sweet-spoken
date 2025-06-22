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
        audioContextRef.current = new AudioContext({ sampleRate: 16000 }); // Match Deepgram expected rate
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

  // Enhanced audio streaming with better buffering for Deepgram
  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    try {
      if (!validateAudioData(audioData)) {
        log('⚠️ Invalid audio data detected, skipping chunk');
        return;
      }
      
      // Convert to 16-bit PCM for Deepgram (better compatibility)
      const pcm16Buffer = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        pcm16Buffer[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
      }
      
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16Buffer.buffer)));
      
      if (!base64Audio || base64Audio.length < 10) return;
      
      const maxAmplitude = Math.max(...Array.from(audioData).map(Math.abs));
      const message = { event: 'media', media: { payload: base64Audio } };
      wsRef.current.send(JSON.stringify(message));
      
      if (import.meta.env.DEV && Math.random() < 0.01) { // Log 1% of chunks
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
      log('✅ Recording started - continuous audio streaming active');
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

  // Enhanced keepalive with WebSocket ping/pong
  const setupKeepAlive = useCallback(() => {
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
    keepAliveInterval.current = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Send JSON keepalive as recommended by Deepgram docs
        wsRef.current.send(JSON.stringify({ type: 'KeepAlive', timestamp: Date.now() }));
        log('💓 KeepAlive sent to prevent timeout');
      }
    }, 3000); // Every 3 seconds as per Deepgram recommendations
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

      // Only validate call ownership if callId is NOT 'browser-test'
      if (callId && callId !== 'browser-test') {
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

      // Build WebSocket URL - Use the correct endpoint for voice streaming
      const baseUrl = 'wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-websocket';
      const params = new URLSearchParams({ 
        callId: callId || 'browser-test', 
        assistantId: assistantId || 'demo', 
        userId, 
        token: authToken 
      });
      const wsUrl = `${baseUrl}?${params.toString()}`;
      log('🌐 WebSocket URL configured', wsUrl);

      wsRef.current = new WebSocket(wsUrl);
      
      // Enhanced connection timeout with detailed logging
      connectionTimeout.current = window.setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          log('⏰ Connection timeout after 15 seconds');
          wsRef.current?.close();
          setConnectionState('error');
          onError?.('Connection timeout - failed to connect in 15 seconds');
        }
      }, 15000);

      wsRef.current.onopen = () => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('✅ Voice WebSocket connected successfully'); 
        setIsConnected(true); 
        setConnectionState('connected'); 
        onConnectionChange?.(true);
        reconnectAttempts.current = 0;
        
        // Setup keepalive immediately after connection
        setupKeepAlive();

        wsRef.current?.send(JSON.stringify({ 
          event: 'connected', 
          protocol: 'voice-streaming', 
          version: '1.0', 
          callId, 
          assistantId, 
          timestamp: Date.now() 
        }));
        log('📤 Connection handshake sent');
        
        // Start recording after a brief delay to ensure connection is stable
        setTimeout(() => {
          startRecording();
          log('🎤 Continuous audio streaming initiated');
        }, 500);
        connectionLockRef.current = false;
      };

      wsRef.current.onmessage = async evt => {
        let data: any;
        try {
          data = JSON.parse(evt.data);
        } catch { 
          log('⚠️ Non-JSON message received');
          return; 
        }
        
        const eventType = data.type || data.event;
        const allowed = ['connection_established','audio_response','text_response','greeting_sent','transcript','ai_response','error','pong'];
        if (!allowed.includes(eventType)) {
          log('❌ Invalid message type received', data); 
          return;
        }
        
        log('📨 Received message', { type: eventType, hasData: !!data.data });
        const message: VoiceMessage = { type: eventType, data, timestamp: Date.now() };
        onMessage?.(message);

        switch (eventType) {
          case 'audio_response':
            if (data.audio && audioQueueRef.current) {
              try {
                const audioBuf = AudioEncoder.decodeAudioFromWebSocket(data.audio);
                await audioQueueRef.current.addToQueue(audioBuf);
                log('✅ Audio queued for playback', { audioLength: audioBuf.length });
              } catch (err) {
                log('❌ Audio processing error', err);
              }
            }
            break;
          case 'error':
            log('❌ Server error received', data.message);
            onError?.(data.message || 'Unknown WebSocket error');
            break;
          case 'transcript':
            log('📝 Transcript received', { text: data.text?.substring(0, 50) });
            break;
        }
      };

      wsRef.current.onerror = err => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        log('❌ WebSocket error occurred', { 
          error: err, 
          readyState: wsRef.current?.readyState,
          url: wsRef.current?.url
        });
        setConnectionState('error');
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          setTimeout(connect, 2000 * reconnectAttempts.current);
        } else {
          onError?.('Connection failed after multiple retry attempts');
        }
        connectionLockRef.current = false;
      };

      wsRef.current.onclose = evt => {
        if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
        if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
        
        // Enhanced close event logging with specific error codes
        const closeReason = evt.code === 1006 ? 'Abnormal closure (network/server issue)' :
                           evt.code === 1011 ? 'Server error' :
                           evt.code === 1000 ? 'Normal closure' :
                           `Unknown (${evt.code})`;
        
        log('🔌 WebSocket closed', { 
          code: evt.code, 
          reason: evt.reason || closeReason,
          wasClean: evt.wasClean
        });
        
        setIsConnected(false); 
        setConnectionState('disconnected'); 
        onConnectionChange?.(false);
        stopRecording();
        audioQueueRef.current?.clear();
        
        // Only attempt reconnection for unexpected closures
        if (evt.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          log(`🔄 Reconnecting due to unexpected closure (${evt.code})`);
          setTimeout(connect, 1000 * reconnectAttempts.current);
        }
        connectionLockRef.current = false;
      };

    } catch (error) {
      log('❌ Connection error', error);
      setConnectionState('error');
      onError?.(`Connection failed: ${error}`);
      connectionLockRef.current = false;
    }
  }, [userId, callId, assistantId, initializeAudio, startRecording, setupKeepAlive, onConnectionChange, onMessage, onError]);

  const disconnect = useCallback(async () => {
    log('🔌 Disconnecting voice WebSocket');
    reconnectAttempts.current = maxReconnectAttempts;
    if (connectionTimeout.current) clearTimeout(connectionTimeout.current);
    if (keepAliveInterval.current) clearInterval(keepAliveInterval.current);
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
