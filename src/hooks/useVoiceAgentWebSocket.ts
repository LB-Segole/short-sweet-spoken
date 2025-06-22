
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

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...');
      
      // Initialize WebSocket connection to our voice agent endpoint
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('🎙️ Voice Agent WebSocket connected');
        setIsConnected(true);
        setStatus('Connected');
        
        // Send agent initialization
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          userId: 'demo-user',
          agentId: agent.id
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received:', data.type, data);
          
          switch (data.type) {
            case 'agent_loaded':
              setStatus('Agent Ready');
              break;
              
            case 'transcript':
              if (data.data?.text) {
                console.log('📝 Transcript:', data.data.text);
                onTranscript(data.data.text);
              }
              break;
              
            case 'ai_response':
              if (data.data?.text) {
                console.log('🤖 AI Response:', data.data.text);
                onAgentResponse(data.data.text);
              }
              break;
              
            case 'audio_response':
              if (data.data?.audio_base64) {
                console.log('🔊 Playing AI audio response');
                playAudioResponse(data.data.audio_base64);
              }
              break;
              
            case 'error':
              console.error('❌ WebSocket error:', data.data?.error);
              onError(data.data?.error || 'Unknown error');
              break;
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setStatus('Disconnected');
        setIsRecording(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatus('Error');
        onError('WebSocket connection error');
      };

    } catch (error) {
      console.error('❌ Connection error:', error);
      setStatus('Error');
      onError(`Connection failed: ${error}`);
    }
  }, [agent.id, onTranscript, onAgentResponse, onError]);

  const disconnect = useCallback(() => {
    console.log('🔄 Disconnecting...');
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsRecording(false);
    setStatus('Disconnected');
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    if (!isConnected) {
      onError('Not connected to voice agent');
      return;
    }

    try {
      console.log('🎤 Starting recording...');
      
      // Get microphone access
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
      
      // Create MediaRecorder for audio capture
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert audio to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            if (base64Audio) {
              wsRef.current?.send(JSON.stringify({
                type: 'audio_data',
                audio: base64Audio
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };
      
      mediaRecorderRef.current.start(100); // Send data every 100ms
      setIsRecording(true);
      setStatus('Recording...');
      
      // Start conversation
      wsRef.current?.send(JSON.stringify({
        type: 'start_conversation'
      }));
      
    } catch (error) {
      console.error('❌ Recording error:', error);
      onError(`Recording failed: ${error}`);
    }
  }, [isConnected, onError]);

  const stopRecording = useCallback(() => {
    console.log('🛑 Stopping recording...');
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setStatus('Connected');
  }, [isRecording]);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('💬 Sending text:', text);
      wsRef.current.send(JSON.stringify({
        type: 'text_input',
        text: text
      }));
    } else {
      onError('Not connected to send message');
    }
  }, [onError]);

  const playAudioResponse = useCallback(async (base64Audio: string) => {
    try {
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
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
    } catch (error) {
      console.error('❌ Audio playback error:', error);
    }
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
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
  };
};
