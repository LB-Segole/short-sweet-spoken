
import { useState, useRef, useCallback, useEffect } from 'react';
import { SimpleVoiceWebSocket, SimpleVoiceConfig } from '@/services/simpleVoiceWebSocket';

interface UseSimpleVoiceWebSocketProps extends Omit<SimpleVoiceConfig, 'onConnected' | 'onDisconnected'> {
  onConnectionChange?: (connected: boolean) => void;
}

export const useSimpleVoiceWebSocket = (props: UseSimpleVoiceWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<SimpleVoiceWebSocket | null>(null);
  const hasInitialized = useRef(false);

  console.log('🎙️ useSimpleVoiceWebSocket initialized');

  const connect = useCallback(async () => {
    if (hasInitialized.current) {
      console.log('⚠️ Already initialized, skipping...');
      return;
    }

    hasInitialized.current = true;
    setIsConnecting(true);
    setError(null);

    try {
      serviceRef.current = new SimpleVoiceWebSocket({
        ...props,
        onConnected: () => {
          console.log('✅ Voice WebSocket connected');
          setIsConnected(true);
          setIsConnecting(false);
          props.onConnectionChange?.(true);
        },
        onDisconnected: () => {
          console.log('🔌 Voice WebSocket disconnected');
          setIsConnected(false);
          setIsConnecting(false);
          props.onConnectionChange?.(false);
        },
        onError: (errorMsg) => {
          console.error('❌ Voice WebSocket error:', errorMsg);
          setError(errorMsg);
          setIsConnecting(false);
          props.onError?.(errorMsg);
        },
        onTranscript: props.onTranscript,
        onAIResponse: props.onAIResponse,
        onAudioResponse: props.onAudioResponse,
      });

      await serviceRef.current.connect();
    } catch (err) {
      console.error('❌ Failed to connect:', err);
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnecting(false);
      hasInitialized.current = false;
    }
  }, [props]);

  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting...');
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
    hasInitialized.current = false;
  }, []);

  const sendText = useCallback((text: string) => {
    if (serviceRef.current?.isConnected) {
      return serviceRef.current.sendText(text);
    }
    console.warn('⚠️ Cannot send text - not connected');
    return false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendText,
  };
};
