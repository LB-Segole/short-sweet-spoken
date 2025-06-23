import { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceAgent } from '@/types/voiceAgent';

interface VoiceAgentWebSocketProps {
  agent: VoiceAgent;
  onTranscript: (text: string) => void;
  onAgentResponse: (text: string) => void;
  onError: (error: string) => void;
}

export const useVoiceAgentWebSocket = ({
  agent,
  onTranscript,
  onAgentResponse,
  onError,
}: VoiceAgentWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  console.log('🎙️ useVoiceAgentWebSocket initialized for agent:', agent.name);

  const connect = useCallback(async () => {
    try {
      console.log('🔄 Starting connection process to voice agent...');
      setStatus('Initializing Connection...');
      
      // Clean up existing connection
      if (wsRef.current) {
        console.log('🧹 Cleaning up existing WebSocket connection');
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear any existing timeouts
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      // Build WebSocket URL for deepgram-voice-agent function
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent`;
      console.log('🌐 Connecting to WebSocket URL:', wsUrl);
      setStatus('Connecting to WebSocket...');
      
      // Create WebSocket connection
      wsRef.current = new WebSocket(wsUrl);

      // Set connection timeout (10 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Connection timeout after 10 seconds');
        if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close();
          setStatus('Connection Timeout');
          onError('Connection timeout. Please check your internet connection and try again.');
        }
      }, 10000);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connection opened successfully');
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setStatus('Connected - Initializing Agent...');
        reconnectAttempts.current = 0;
        
        // Send connection message with agent info
        const connectMessage = {
          event: 'connected',
          assistantId: agent.id,
          userId: 'browser-user',
          timestamp: Date.now()
        };
        console.log('📤 Sending connection message:', connectMessage);
        wsRef.current?.send(JSON.stringify(connectMessage));

        // Start keepalive ping
        startKeepAlive();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type || data.event, data);
          
          switch (data.type || data.event) {
            case 'connection_established':
              console.log('🔗 Connection established by server');
              setStatus('Agent Loading...');
              break;
              
            case 'agent_loaded':
            case 'assistant_loaded':
              console.log('🤖 Agent loaded successfully:', data.assistant?.name || data.agent?.name);
              setStatus('Agent Ready');
              break;
              
            case 'ready':
              console.log('✅ System ready for conversation');
              setStatus('Ready to Chat');
              break;
              
            case 'conversation_started':
              console.log('🎬 Conversation started');
              setStatus('Listening...');
              break;
              
            case 'transcript':
              if (data.text || data.data?.text) {
                const transcriptText = data.text || data.data.text;
                console.log('📝 Transcript received:', transcriptText);
                onTranscript(transcriptText);
                setStatus('Processing...');
              }
              break;
              
            case 'ai_response':
              if (data.text || data.data?.text) {
                const responseText = data.text || data.data.text;
                console.log('🤖 AI Response received:', responseText);
                onAgentResponse(responseText);
                setStatus('Speaking...');
              }
              break;
              
            case 'audio_response':
              if (data.audio || data.data?.audio) {
                console.log('🔊 Playing AI audio response');
                const audioData = data.audio || data.data.audio;
                playAudioResponse(audioData);
              }
              break;
              
            case 'greeting_sent':
              console.log('👋 Greeting sent by agent');
              setStatus('Speaking...');
              break;
              
            case 'processing_error':
            case 'error':
              const errorMsg = data.error || data.data?.error || 'Server error';
              console.error('❌ Server error:', errorMsg);
              onError(errorMsg);
              setStatus('Error');
              break;
              
            case 'pong':
              console.log('💓 Keepalive pong received');
              break;
              
            default:
              console.log('❓ Unknown message type:', data.type || data.event, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, event.data);
          onError('Failed to parse server message');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        
        // Clear timeouts
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        stopKeepAlive();
        
        setIsConnected(false);
        setIsRecording(false);
        
        // Handle different close codes
        if (event.code === 1000) {
          // Normal closure
          setStatus('Disconnected');
        } else if (event.code === 1006) {
          // Abnormal closure
          setStatus('Connection Lost');
          console.log('🔄 Abnormal closure detected, attempting reconnect...');
          attemptReconnect();
        } else {
          // Other error codes
          setStatus(`Disconnected (${event.code})`);
          if (event.code !== 1001) { // Not going away
            attemptReconnect();
          }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setStatus('Connection Error');
        onError('WebSocket connection error. Please check your internet connection.');
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      setStatus('Connection Failed');
      onError(`Connection failed: ${error}`);
    }
  }, [agent.id, onTranscript, onAgentResponse, onError]);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      reconnectAttempts.current++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 5000);
      console.log(`🔄 Attempting reconnection ${reconnectAttempts.current}/${maxReconnectAttempts} in ${delay}ms`);
      setStatus(`Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    } else {
      setStatus('Connection Failed - Max Retries Reached');
      onError('Connection lost after multiple attempts. Please refresh and try again.');
    }
  }, [connect, onError]);

  const startKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) return;
    
    keepAliveIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        console.log('💓 Keepalive ping sent');
      }
    }, 30000) as unknown as NodeJS.Timeout;
  }, []);

  const stopKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
      console.log('💓 Keepalive stopped');
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔄 Initiating disconnect...');
    
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

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
    if (audioContextRef.current) {
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
      onError('Not connected to voice agent');
      return;
    }

    try {
      console.log('🎤 Starting recording with microphone...');
      setStatus('Requesting Microphone...');
      
      // Request microphone access with detailed constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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
        mimeType: mimeType
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log('📊 Audio chunk captured:', event.data.size, 'bytes');
          processAudioChunk(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped');
        setStatus('Ready to Chat');
      };
      
      mediaRecorderRef.current.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        onError('Recording error occurred');
      };
      
      // Start recording with frequent data events for real-time processing
      mediaRecorderRef.current.start(250); // Send data every 250ms
      setIsRecording(true);
      setStatus('Recording - Speak Now...');
      
      console.log('🎤 Recording started successfully');
      
      // Notify server that conversation has started
      wsRef.current?.send(JSON.stringify({
        event: 'conversation_started',
        assistantId: agent.id,
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('❌ Recording start error:', error);
      setStatus('Recording Failed');
      onError(`Failed to start recording: ${error}`);
    }
  }, [isConnected, onError, agent.id]);

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
    setStatus('Processing Audio...');
  }, [isRecording]);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
          // Send audio data as media event
          wsRef.current.send(JSON.stringify({
            event: 'media',
            media: {
              payload: base64Audio
            },
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
        audioContextRef.current = new AudioContext();
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
        setStatus('Ready to Chat');
      };
      
      source.start();
      
      console.log('✅ Audio playback started');
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setStatus('Ready to Chat'); // Still mark as ready even if audio fails
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
      onError('Not connected to send message');
    }
  }, [onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up voice agent WebSocket hook');
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
