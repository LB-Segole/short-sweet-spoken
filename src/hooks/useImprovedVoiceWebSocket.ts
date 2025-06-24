
import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceWebSocketService, VoiceWebSocketConfig } from '@/services/voiceWebSocketService';
import { AudioRecorder } from '@/utils/audioUtils';

interface UseImprovedVoiceWebSocketProps extends Omit<VoiceWebSocketConfig, 'onConnectionChange' | 'onError'> {
  onConnectionChange?: (connected: boolean, status: string) => void;
  onError?: (error: string) => void;
}

export const useImprovedVoiceWebSocket = (props: UseImprovedVoiceWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const serviceRef = useRef<VoiceWebSocketService | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const isManualDisconnect = useRef(false);

  const handleConnectionChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
    const newStatus = connected ? 'Connected' : 'Disconnected';
    setStatus(newStatus);
    props.onConnectionChange?.(connected, newStatus);
    
    if (!connected) {
      setIsRecording(false);
    }
  }, [props.onConnectionChange]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('🎙️ Voice WebSocket error:', errorMessage);
    setError(errorMessage);
    setStatus(`Error: ${errorMessage}`);
    props.onError?.(errorMessage);
  }, [props.onError]);

  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (!serviceRef.current?.isConnected) return;
    
    // Convert Float32Array to base64 for transmission
    const int16Array = new Int16Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    const uint8Array = new Uint8Array(int16Array.buffer);
    const base64Audio = btoa(String.fromCharCode(...uint8Array));
    
    serviceRef.current.sendAudio(base64Audio);
  }, []);

  const connect = useCallback(async () => {
    if (serviceRef.current?.isConnected) {
      console.log('⚠️ Already connected');
      return;
    }

    try {
      isManualDisconnect.current = false;
      setError(null);
      setStatus('Connecting...');

      serviceRef.current = new VoiceWebSocketService({
        ...props,
        onConnectionChange: handleConnectionChange,
        onError: handleError,
      });

      await serviceRef.current.connect();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      handleError(errorMessage);
      throw error;
    }
  }, [props, handleConnectionChange, handleError]);

  const disconnect = useCallback(() => {
    isManualDisconnect.current = true;
    setStatus('Disconnecting...');
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
    }
    
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    
    setError(null);
    setStatus('Disconnected');
  }, []);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to voice service');
    }

    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      
      await audioRecorderRef.current.start();
      setIsRecording(true);
      setStatus('Recording...');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      handleError(`Recording failed: ${errorMessage}`);
      throw error;
    }
  }, [isConnected, handleAudioData, handleError]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    setIsRecording(false);
    setStatus(isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  const sendTextMessage = useCallback((text: string) => {
    if (!serviceRef.current?.isConnected) {
      throw new Error('Not connected to voice service');
    }
    
    return serviceRef.current.sendText(text);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    status,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
  };
};
