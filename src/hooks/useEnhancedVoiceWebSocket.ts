
import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceWebSocketService, VoiceWebSocketConfig } from '@/services/voiceWebSocketService';
import { useBackendService } from '@/hooks/useBackendService';

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  reconnectAttempt: number;
}

interface UseEnhancedVoiceWebSocketProps extends Omit<VoiceWebSocketConfig, 'onConnectionChange'> {
  onConnectionChange?: (connected: boolean, state: ConnectionState) => void;
}

export const useEnhancedVoiceWebSocket = (props: UseEnhancedVoiceWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    error: null,
    reconnectAttempt: 0
  });

  const serviceRef = useRef<VoiceWebSocketService | null>(null);
  const isManualDisconnect = useRef(false);
  const connectTimeoutRef = useRef<number | null>(null);
  const hasConnected = useRef(false);
  const { utils } = useBackendService();

  console.log('🎙️ useEnhancedVoiceWebSocket initialized');

  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    setConnectionState(prev => {
      const newState = { ...prev, ...updates };
      console.log('🔄 Connection state changed:', newState);
      props.onConnectionChange?.(newState.status === 'connected', newState);
      return newState;
    });
  }, [props.onConnectionChange]);

  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting || (isConnected && hasConnected.current)) {
      console.log('⚠️ Already connecting or connected, skipping...');
      return;
    }

    try {
      isManualDisconnect.current = false;
      setIsConnecting(true);
      setError(null);
      updateConnectionState({ status: 'connecting', error: null });

      console.log('🔄 Connecting to voice WebSocket...');

      // Clear any existing connection timeout
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }

      // Create new service instance
      serviceRef.current = new VoiceWebSocketService({
        ...props,
        onConnectionChange: (connected) => {
          console.log('🔄 Voice WebSocket state changed:', { connected });
          setIsConnected(connected);
          setIsConnecting(false);
          hasConnected.current = connected;
          
          if (connected) {
            updateConnectionState({ 
              status: 'connected', 
              error: null, 
              reconnectAttempt: 0 
            });
          } else if (!isManualDisconnect.current) {
            updateConnectionState({ 
              status: 'disconnected', 
              error: 'Connection lost' 
            });
          }
        },
        onError: (errorMsg) => {
          console.error('❌ Voice WebSocket error:', errorMsg);
          setError(errorMsg);
          setIsConnecting(false);
          updateConnectionState({ 
            status: 'error', 
            error: errorMsg 
          });
        },
        onMessage: props.onMessage,
        onTranscript: props.onTranscript,
        onAIResponse: props.onAIResponse,
        onAudioResponse: props.onAudioResponse,
      });

      // Set connection timeout
      connectTimeoutRef.current = window.setTimeout(() => {
        if (isConnecting && !isConnected) {
          console.log('⏰ Connection timeout');
          setError('Connection timeout');
          setIsConnecting(false);
          updateConnectionState({ 
            status: 'error', 
            error: 'Connection timeout - please try again' 
          });
        }
      }, 15000); // Increased timeout to 15 seconds

      await serviceRef.current.connect();
      
      // Clear timeout on successful connection
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

    } catch (error) {
      console.error('❌ Failed to connect:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setError(errorMessage);
      setIsConnecting(false);
      hasConnected.current = false;
      updateConnectionState({ 
        status: 'error', 
        error: errorMessage 
      });
    }
  }, [isConnecting, isConnected, props, updateConnectionState]);

  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting voice WebSocket...');
    
    isManualDisconnect.current = true;
    hasConnected.current = false;
    
    // Clear connection timeout
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setIsRecording(false);
    setError(null);
    updateConnectionState({ 
      status: 'disconnected', 
      error: null, 
      reconnectAttempt: 0 
    });
  }, [updateConnectionState]);

  const startRecording = useCallback(async () => {
    if (!isConnected || !serviceRef.current) {
      console.log('⚠️ Cannot start recording - not connected');
      return;
    }

    try {
      console.log('🎤 Starting recording...');
      
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('✅ Microphone access granted');
      setIsRecording(true);
      
      // TODO: Implement actual audio processing and sending
      // For now, just set the recording state
      
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError('Failed to access microphone');
    }
  }, [isConnected]);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    setIsRecording(false);
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (!serviceRef.current || !isConnected) {
      console.warn('⚠️ Cannot send text message - not connected');
      return;
    }
    
    console.log('📤 Sending text message:', text);
    serviceRef.current.sendText(text);
  }, [isConnected]);

  const getBackendType = useCallback(() => {
    return utils.isSupabase() ? 'supabase' : utils.isRailway() ? 'railway' : 'unknown';
  }, [utils]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up useEnhancedVoiceWebSocket');
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    isRecording,
    error,
    connectionState,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
    getBackendType,
  };
};
