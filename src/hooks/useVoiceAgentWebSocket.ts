
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
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;

  console.log('🎙️ useVoiceAgentWebSocket initialized for agent:', agent.name);

  const connect = useCallback(async () => {
    try {
      console.log('🔄 Attempting to connect to voice agent...');
      setStatus('Connecting...');
      
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Use the full WebSocket URL for the deepgram-voice-agent function
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent`;
      console.log('🌐 Connecting to:', wsUrl);
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Voice Agent WebSocket connected successfully');
        setIsConnected(true);
        setStatus('Connected');
        reconnectAttempts.current = 0;
        
        // Send agent initialization
        const authMessage = {
          type: 'auth',
          userId: 'browser-user',
          agentId: agent.id
        };
        console.log('📤 Sending auth message:', authMessage);
        wsRef.current?.send(JSON.stringify(authMessage));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data.type, data);
          
          switch (data.type) {
            case 'agent_loaded':
              console.log('🤖 Agent loaded successfully:', data.data?.agent?.name);
              setStatus('Agent Ready');
              break;
              
            case 'connection_established':
              console.log('🔗 Connection established');
              setStatus('Connected');
              break;
              
            case 'transcript':
              if (data.data?.text) {
                console.log('📝 Transcript received:', data.data.text);
                onTranscript(data.data.text);
              }
              break;
              
            case 'ai_response':
              if (data.data?.text) {
                console.log('🤖 AI Response received:', data.data.text);
                onAgentResponse(data.data.text);
              }
              break;
              
            case 'audio_response':
              if (data.data?.audio_base64) {
                console.log('🔊 Playing AI audio response');
                playAudioResponse(data.data.audio_base64);
              }
              break;
              
            case 'conversation_started':
              console.log('🎬 Conversation started');
              setStatus('Ready to chat');
              break;
              
            case 'error':
              console.error('❌ WebSocket error from server:', data.data?.error);
              onError(data.data?.error || 'Server error');
              break;
              
            default:
              console.log('❓ Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          onError('Failed to parse server message');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsRecording(false);
        
        if (event.code !== 1000) { // Not a normal closure
          setStatus('Disconnected');
          // Attempt to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
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
        console.error('❌ WebSocket error:', error);
        setStatus('Connection Error');
        onError('WebSocket connection error');
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      setStatus('Error');
      onError(`Connection failed: ${error}`);
    }
  }, [agent.id, onTranscript, onAgentResponse, onError]);

  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting from voice agent...');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
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
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      console.log('⚠️ Cannot start recording - not connected');
      onError('Not connected to voice agent');
      return;
    }

    try {
      console.log('🎤 Requesting microphone permission...');
      
      // Request microphone access
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
      
      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
        
      console.log('🎵 Using mime type:', mimeType);
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
          console.log('📊 Audio chunk received:', event.data.size, 'bytes');
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped, processing audio...');
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          processAudioBlob(audioBlob);
        }
      };
      
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      setStatus('Recording...');
      
      console.log('🎤 Recording started successfully');
      
      // Start conversation if this is the first recording
      wsRef.current?.send(JSON.stringify({
        type: 'start_conversation'
      }));
      
    } catch (error) {
      console.error('❌ Recording error:', error);
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

  const processAudioBlob = useCallback(async (audioBlob: Blob) => {
    try {
      console.log('🔄 Converting audio blob to base64...');
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result?.toString().split(',')[1];
        if (base64Audio && wsRef.current?.readyState === WebSocket.OPEN) {
          console.log('📤 Sending audio data to server...');
          wsRef.current.send(JSON.stringify({
            type: 'audio_data',
            audio: base64Audio
          }));
          setStatus('Processing speech...');
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('❌ Error processing audio:', error);
      onError('Failed to process audio');
    }
  }, [onError]);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('💬 Sending text message:', text);
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        text: text
      }));
    } else {
      console.log('⚠️ Cannot send text - not connected');
      onError('Not connected to send message');
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
      source.start();
      
      console.log('✅ Audio played successfully');
      setStatus('Agent Ready');
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setStatus('Agent Ready'); // Still mark as ready even if audio fails
    }
  }, []);

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
