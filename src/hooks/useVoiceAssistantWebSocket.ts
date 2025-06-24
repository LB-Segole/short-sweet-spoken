
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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const isManualDisconnect = useRef(false);

  console.log('🎙️ useVoiceAssistantWebSocket initialized for assistant:', assistant.name);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ Already connecting, skipping...');
      return;
    }

    try {
      isManualDisconnect.current = false;
      
      console.log('🔄 Starting WebSocket connection...');
      setStatus('Connecting...');
      
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent`;
      console.log('🌐 Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Connection timeout after 10 seconds');
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
          setStatus('Connection Timeout');
          onError('Connection timeout - Edge Function may be starting up. Please try again.');
        }
      }, 10000);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connection opened successfully!');
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setStatus('Connected');
        reconnectAttempts.current = 0;
        
        // Send start message
        const startMessage = {
          event: 'start',
          message: 'Initializing voice assistant session',
          assistantId: assistant.id,
          userId: 'browser-user',
          timestamp: Date.now()
        };
        console.log('📤 Sending start message:', startMessage);
        wsRef.current?.send(JSON.stringify(startMessage));

        // Start ping-pong
        startPingPong();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received message:', data.type || data.event);
          
          switch (data.type || data.event) {
            case 'connection_ready':
              console.log('🔗 Backend connection ready');
              setStatus('Ready');
              break;
              
            case 'ack':
              console.log('✅ Backend acknowledged start:', data.message);
              setStatus('Ready');
              break;
              
            case 'pong':
              console.log('💓 Received pong from backend');
              break;
              
            case 'ping':
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'pong',
                  timestamp: Date.now()
                }));
                console.log('💓 Sent pong response');
              }
              break;

            case 'transcript':
              if (data.text) {
                console.log('📝 Transcript received:', data.text);
                onTranscript(data.text);
              }
              break;
              
            case 'ai_response':
              if (data.text) {
                console.log('🤖 Assistant response received:', data.text);
                onAssistantResponse(data.text);
              }
              break;
              
            case 'audio_response':
              if (data.audio) {
                console.log('🔊 Audio response received');
                playAudioResponse(data.audio);
              }
              break;
              
            case 'error':
              console.error('❌ Backend error:', data.error);
              onError(data.error || 'Backend error');
              break;
              
            default:
              console.log('❓ Unknown message type:', data.type || data.event);
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        stopPingPong();
        
        setIsConnected(false);
        setIsRecording(false);
        
        if (isManualDisconnect.current) {
          setStatus('Disconnected');
          return;
        }
        
        if (event.code === 1006) {
          console.log('❌ Connection failed (1006)');
          setStatus('Connection Failed');
          onError('Connection failed. Please check:\n• API keys are configured in Supabase\n• Edge Function is deployed\n• Network connection is stable');
        } else if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          attemptReconnect();
        } else {
          setStatus('Connection Lost');
          onError('WebSocket connection lost. Please refresh and try again.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error event:', error);
        setStatus('Connection Error');
        onError('WebSocket connection error - please check the Edge Function status');
      };

    } catch (error) {
      console.error('❌ Connection setup error:', error);
      setStatus('Connection Failed');
      onError(`Failed to setup connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [assistant.id, onError, onTranscript, onAssistantResponse]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
      console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
      setStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!isManualDisconnect.current) {
          connect();
        }
      }, delay);
    } else {
      setStatus('Connection Failed - Max Retries Reached');
      onError('Connection lost after multiple attempts. Please refresh and try again.');
    }
  }, [connect, onError]);

  const startPingPong = useCallback(() => {
    if (pingIntervalRef.current) return;
    
    console.log('💓 Starting ping-pong system');
    
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: Date.now()
          }));
          console.log('💓 Sent ping to backend');
        } catch (error) {
          console.error('❌ Error sending ping:', error);
        }
      }
    }, 30000) as unknown as NodeJS.Timeout;
  }, []);

  const stopPingPong = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
      console.log('💓 Ping-pong stopped');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔄 Manual disconnect initiated');
    
    isManualDisconnect.current = true;
    
    // Clear all timeouts and intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    stopPingPong();
    
    // Stop recording and streams
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setStatus('Disconnected');
    reconnectAttempts.current = 0;
  }, [isRecording, stopPingPong]);

  const startRecording = useCallback(async () => {
    console.log('🎤 Start recording requested');
    if (!isConnected) {
      onError('Not connected to voice assistant');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      setIsRecording(true);
      setStatus('Recording...');
      
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      onError(`Failed to start recording: ${error}`);
    }
  }, [isConnected, onError]);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stop recording requested');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setStatus('Ready');
  }, []);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    console.log('🎵 Processing audio chunk:', audioBlob.size, 'bytes');
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            event: 'media',
            media: {
              payload: base64Audio
            },
            timestamp: Date.now()
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
    console.log('🔊 Playing audio response');
    
    try {
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
        setStatus('Ready');
      };
      
      source.start();
      
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setStatus('Ready');
    }
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📤 Sending text message:', text);
      wsRef.current.send(JSON.stringify({
        event: 'text_input',
        text: text,
        timestamp: Date.now()
      }));
    } else {
      console.log('⚠️ Cannot send text - WebSocket not connected');
    }
  }, []);

  const sendTestMessage = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🧪 Sending test message');
      wsRef.current.send(JSON.stringify({
        event: 'test',
        message: 'Frontend test message',
        timestamp: Date.now()
      }));
    } else {
      console.log('⚠️ Cannot send test - WebSocket not connected');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up');
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
    sendTestMessage,
    processAudioChunk,
    playAudioResponse,
  };
};
