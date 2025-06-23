import { useState, useRef, useCallback, useEffect } from 'react';
import { Assistant } from '@/types/assistant';

interface VoiceAssistantWebSocketProps {
  assistant: Assistant;
  onTranscript: (text: string) => void;
  onAssistantResponse: (text: string) => void;
  onError: (error: string) => void;
}

export const useVoiceAssistantWebSocket = ({
  assistant,
  onTranscript,
  onAssistantResponse,
  onError,
}: VoiceAssistantWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3; // Reduced from 5 for faster failure detection
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectionLockRef = useRef(false);

  console.log('🎙️ useVoiceAssistantWebSocket initialized for assistant:', assistant.name);

  const connect = useCallback(async () => {
    // Prevent multiple simultaneous connection attempts
    if (connectionLockRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
      console.log('⚠️ Connection attempt blocked - already connecting');
      return;
    }

    try {
      connectionLockRef.current = true;
      console.log('🔄 Attempting to connect to voice assistant...');
      setStatus('Connecting...');
      
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear any existing timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      // Test network connectivity first
      try {
        const response = await fetch('https://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        console.log('🌐 Network connectivity test:', response.status);
      } catch (networkError) {
        console.error('❌ Network connectivity test failed:', networkError);
        throw new Error('Network connectivity issue detected');
      }
      
      // Build WebSocket URL with explicit protocol
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent`;
      console.log('🌐 Connecting to WebSocket:', wsUrl);
      
      // Create WebSocket with explicit protocols
      wsRef.current = new WebSocket(wsUrl, ['websocket']);

      // Set shorter connection timeout for faster feedback
      connectionTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Connection timeout after 10 seconds');
          wsRef.current.close();
          connectionLockRef.current = false;
          setStatus('Connection timeout');
          onError('Connection timeout - the server may be unavailable. Please try again.');
        }
      }, 10000);

      wsRef.current.onopen = () => {
        console.log('✅ Voice Assistant WebSocket connected successfully');
        
        // Clear connection timeout and lock
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        connectionLockRef.current = false;
        
        setIsConnected(true);
        setStatus('Connected');
        reconnectAttempts.current = 0;
        
        // Send connection message with assistant info
        const connectMessage = {
          event: 'connected',
          assistantId: assistant.id,
          userId: 'browser-user',
          timestamp: Date.now()
        };
        console.log('📤 Sending connection message:', connectMessage);
        wsRef.current?.send(JSON.stringify(connectMessage));

        // Start keepalive with shorter interval
        startKeepAlive();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type || data.event);
          
          switch (data.type || data.event) {
            case 'connection_established':
              console.log('🔗 Connection established');
              setStatus('Ready');
              break;
              
            case 'ready':
              console.log('✅ System ready for conversation');
              setStatus('Ready to chat');
              break;
              
            case 'transcript':
              if (data.text) {
                console.log('📝 Transcript received:', data.text);
                onTranscript(data.text);
                setStatus('Processing...');
              }
              break;
              
            case 'ai_response':
              if (data.text) {
                console.log('🤖 AI Response received:', data.text);
                onAssistantResponse(data.text);
                setStatus('Speaking...');
              }
              break;
              
            case 'audio_response':
              if (data.audio) {
                console.log('🔊 Playing AI audio response');
                playAudioResponse(data.audio);
              }
              break;
              
            case 'pong':
              console.log('💓 Pong received - connection alive');
              break;
              
            case 'error':
              console.error('❌ WebSocket error from server:', data.error);
              onError(data.error || 'Server error');
              setStatus('Error');
              break;
              
            default:
              console.log('❓ Unknown message type:', data.type || data.event);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          onError('Failed to parse server message');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        // Clear connection timeout and lock
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        connectionLockRef.current = false;

        // Stop keepalive
        stopKeepAlive();
        
        setIsConnected(false);
        setIsRecording(false);
        
        // Handle different close codes
        if (event.code === 1006) {
          console.error('❌ WebSocket closed abnormally (1006) - connection failed');
          setStatus('Connection failed');
          
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(2000 * reconnectAttempts.current, 8000); // Cap at 8 seconds
            console.log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
            setStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setStatus('Connection failed');
            onError('Unable to connect to voice assistant. Please check your network connection and try again.');
          }
        } else if (event.code !== 1000) { // Not a normal closure
          setStatus('Disconnected unexpectedly');
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = 3000;
            console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
            setStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            setStatus('Connection failed');
            onError('Connection lost. Please refresh to try again.');
          }
        } else {
          setStatus('Disconnected');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error event:', error);
        
        // Clear connection timeout and lock
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        connectionLockRef.current = false;
        
        setStatus('Connection Error');
        onError('WebSocket connection error - please check your network connection');
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      connectionLockRef.current = false;
      setStatus('Error');
      onError(`Connection failed: ${error}`);
    }
  }, [assistant.id, onTranscript, onAssistantResponse, onError]);

  const startKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) return;
    
    keepAliveIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('💓 Sent keepalive ping');
      }
    }, 15000) as unknown as NodeJS.Timeout; // Reduced from 30s for better detection
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
      console.log('💓 Keepalive stopped');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting from voice assistant...');
    
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    // Clear connection lock
    connectionLockRef.current = false;

    // Stop keepalive
    stopKeepAlive();
    
    // Stop recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop audio stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('🛑 Stopping audio track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setStatus('Disconnected');
    reconnectAttempts.current = 0;
  }, [isRecording, stopKeepAlive]);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      console.log('⚠️ Cannot start recording - not connected');
      onError('Not connected to voice assistant');
      return;
    }

    try {
      console.log('🎤 Requesting microphone permission...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('✅ Microphone access granted');
      streamRef.current = stream;
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
        
      console.log('🎵 Using mime type:', mimeType);
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          processAudioChunk(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped');
        setStatus('Ready to chat');
      };
      
      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setStatus('Recording...');
      
      console.log('🎤 Recording started successfully');
      
    } catch (error) {
      console.error('❌ Recording error:', error);
      setStatus('Microphone error');
      onError(`Microphone access failed: ${error}`);
    }
  }, [isConnected, onError]);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setStatus('Processing...');
  }, [isRecording]);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            event: 'media',
            media: { payload: base64Audio }
          }));
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('❌ Error processing audio chunk:', error);
      onError('Failed to process audio');
    }
  }, [onError]);

  const playAudioResponse = useCallback(async (base64Audio: string) => {
    try {
      console.log('🔊 Playing audio response...');
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        console.log('✅ Audio playback finished');
        setStatus('Ready to chat');
      };
      
      source.start();
      
      console.log('✅ Audio playback started');
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setStatus('Ready to chat');
    }
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending text message:', text);
      wsRef.current.send(JSON.stringify({
        event: 'text_input',
        text: text
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up voice assistant WebSocket hook');
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isRecording,
    status,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
  };
};
