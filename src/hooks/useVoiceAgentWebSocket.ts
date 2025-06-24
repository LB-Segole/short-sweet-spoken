import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceAgent } from '@/types/voiceAgent';

interface VoiceAgentWebSocketProps {
  agent: VoiceAgent;
  onTranscript: (text: string) => void;
  onAgentResponse: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: string) => void;
}

export const useVoiceAgentWebSocket = ({
  agent,
  onTranscript,
  onAgentResponse,
  onError,
  onStatusChange,
}: VoiceAgentWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const sessionIdRef = useRef<string>('');

  // Railway server URL - replace with your actual Railway URL
  const RAILWAY_WS_URL = process.env.REACT_APP_RAILWAY_WS_URL || 'wss://kaput-account-production.up.railway.app';

  console.log('🎙️ useVoiceAgentWebSocket initialized for agent:', agent.name);

  const updateStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    setIsConnecting(true);
    setError(null);
    updateStatus('Connecting...');

    try {
      console.log('🔗 Attempting to connect to Railway server:', RAILWAY_WS_URL);

      const ws = new WebSocket(RAILWAY_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected to Railway server');
        setIsConnected(true);
        setIsConnecting(false);
        updateStatus('Connected');
        reconnectAttempts.current = 0;

        // Send connection message with agent info
        const connectMessage = {
          event: 'start',
          assistantId: agent.id,
          userId: 'browser-user',
          message: `Starting voice session with ${agent.name}`,
          timestamp: Date.now()
        };

        ws.send(JSON.stringify(connectMessage));
        console.log('📤 Sent start event:', connectMessage);

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received from Railway server:', data.type || data.event);

          switch (data.type || data.event) {
            case 'connection_ready':
              console.log('🔗 Connection ready');
              updateStatus('Initializing...');
              break;
              
            case 'connection_established':
              console.log('🔗 Connection established by Railway server');
              sessionIdRef.current = data.sessionId || '';
              updateStatus('Agent Loading...');
              break;

            case 'ready':
              console.log('🎯 Agent ready for voice input');
              updateStatus('Ready - Tap to speak');
              break;

            case 'ai_response':
              console.log('🤖 AI response received:', data.text);
              setIsSpeaking(true);
              updateStatus('Speaking...');
              onAgentResponse(data.text);
              break;

            case 'audio_response':
              console.log('🔊 Audio response received');
              playAudioResponse(data.audio);
              break;

            case 'transcript':
              console.log('📝 Transcript received:', data.text);
              setIsListening(false);
              updateStatus('Processing...');
              onTranscript(data.text);
              break;

            case 'pong':
              console.log('💓 Received pong from Railway server');
              break;

            case 'error':
              console.error('❌ Railway server error:', data.error);
              setError(data.error);
              onError(data.error);
              updateStatus('Error');
              break;

            default:
              console.log('📨 Unknown message type:', data.type || data.event);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error event:', event);
        setError('WebSocket connection error - please check the Railway server status');
        onError('WebSocket connection error - please check the Railway server status');
        updateStatus('Connection Error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event);
        setIsConnected(false);
        setIsConnecting(false);
        setIsListening(false);
        setIsSpeaking(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        if (event.code === 1006) {
          console.log('❌ Connection failed before establishment (1006)');
          setError('Failed to establish WebSocket connection. Please check the Railway server logs.');
          onError('Failed to establish WebSocket connection. Please check the Railway server logs.');
          updateStatus('Connection Failed');
        }

        // Attempt reconnection
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          console.log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
          updateStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('❌ Max reconnection attempts reached');
          setError('Failed to connect after multiple attempts. Please try again later.');
          onError('Failed to connect after multiple attempts. Please try again later.');
          updateStatus('Connection Failed');
        }
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setIsConnecting(false);
      setError('Failed to create WebSocket connection');
      onError('Failed to create WebSocket connection');
      updateStatus('Connection Error');
    }
  }, [agent, isConnected, isConnecting, onTranscript, onAgentResponse, onError, updateStatus]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User initiated disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsListening(false);
    setIsSpeaking(false);
    updateStatus('Disconnected');
    setError(null);
    reconnectAttempts.current = 0;
  }, [updateStatus]);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      console.log('⚠️ Cannot start recording - not connected');
      onError('Not connected to voice agent');
      return;
    }

    if (isListening) {
      console.log('⚠️ Already listening');
      return;
    }

    try {
      console.log('🎤 Starting recording with microphone...');
      updateStatus('Requesting Microphone...');
      
      // Request microphone access with optimal settings for voice
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          latency: 0.01
        }
      });
      
      console.log('✅ Microphone access granted, initializing recorder');
      streamRef.current = stream;
      
      // Create MediaRecorder for audio capture
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/wav';
        
      console.log('🎵 Using audio format:', mimeType);
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 Audio chunk captured:', event.data.size, 'bytes');
          processAudioChunk(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped');
        setIsListening(false);
        updateStatus('Ready - Tap to speak');
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        onError('Recording error occurred');
        setIsListening(false);
        updateStatus('Recording Error');
      };
      
      // Start recording with frequent data events for real-time processing
      mediaRecorderRef.current.start(100); // Send data every 100ms for better responsiveness
      setIsListening(true);
      updateStatus('Listening... Speak now');
      
      console.log('🎤 Recording started successfully');
      
    } catch (error) {
      console.error('❌ Recording start error:', error);
      updateStatus('Microphone Error');
      onError(`Failed to start recording: ${error}`);
    }
  }, [isConnected, isListening, onError, updateStatus]);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
    updateStatus('Processing...');
  }, [isListening, updateStatus]);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio data as transcript event (server will handle STT)
          wsRef.current.send(JSON.stringify({
            event: 'transcript',
            text: '', // Empty text, server will process audio
            audio: base64Audio,
            timestamp: Date.now()
          }));
          console.log('📤 Audio chunk sent to server:', base64Audio.length, 'chars');
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        onError('Failed to process audio data');
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
      
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Decode base64 audio
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Decode and play audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        console.log('✅ Audio playback finished');
        setIsSpeaking(false);
        updateStatus('Ready - Tap to speak');
      };
      
      source.start();
      
      console.log('✅ Audio playback started');
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setIsSpeaking(false);
      updateStatus('Ready - Tap to speak'); // Still mark as ready even if audio fails
    }
  }, [updateStatus]);

  const sendText = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        event: 'text_input',
        text: text,
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      console.log('📤 Sent text input:', text);
      updateStatus('Processing...');
    } else {
      console.warn('⚠️ Cannot send text - WebSocket not connected');
      onError('Not connected to voice agent');
    }
  }, [onError, updateStatus]);

  const sendTestMessage = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        event: 'test',
        message: 'Test message from client',
        timestamp: Date.now()
      };
      wsRef.current.send(JSON.stringify(message));
      console.log('🧪 Sent test message');
    } else {
      console.warn('⚠️ Cannot send test message - WebSocket not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    isListening,
    isSpeaking,
    status,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendText,
    sendTestMessage
  };
};
