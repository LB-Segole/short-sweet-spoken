
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { VoiceAgent } from '@/types/voiceAgent';
import { AudioRecorder, AudioQueue, AudioEncoder } from '@/utils/audioUtils';

interface VoiceAgentWebSocketProps {
  agent: VoiceAgent;
  onTranscript?: (text: string) => void;
  onAgentResponse?: (text: string) => void;
  onError?: (error: string) => void;
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
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  
  const updateStatus = useCallback((newStatus: string) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const initializeAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      }
      if (!audioQueueRef.current && audioContextRef.current) {
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
      }
      return true;
    } catch (error) {
      console.error('Audio initialization error:', error);
      onError?.(`Audio init failed: ${error}`);
      return false;
    }
  }, [onError]);

  const handleAudioData = useCallback((audioData: Float32Array) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        const base64Audio = AudioEncoder.encodeAudioForDeepgram(audioData);
        const message = {
          type: 'input_audio_buffer.append',
          audio: base64Audio
        };
        wsRef.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Audio send error:', error);
        onError?.(`Audio send failed: ${error}`);
      }
    }
  }, [onError]);

  const startRecording = useCallback(async () => {
    try {
      if (!audioRecorderRef.current) {
        audioRecorderRef.current = new AudioRecorder(handleAudioData);
      }
      await audioRecorderRef.current.start();
      setIsRecording(true);
      updateStatus('recording');
    } catch (error) {
      console.error('Recording start error:', error);
      onError?.(`Recording failed: ${error}`);
    }
  }, [handleAudioData, onError, updateStatus]);

  const stopRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
      setIsRecording(false);
      updateStatus('connected');
    }
  }, [updateStatus]);

  const handleAudioResponse = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current || !audioQueueRef.current) return;

    try {
      const audioBuffer = await AudioEncoder.decodeAudioFromWebSocket(base64Audio, audioContextRef.current);
      await audioQueueRef.current.addToQueue(audioBuffer);
    } catch (error) {
      console.error('Audio playback error:', error);
      onError?.(`Audio playback failed: ${error}`);
    }
  }, [onError]);

  const connect = useCallback(async () => {
    try {
      updateStatus('connecting');
      
      // Get session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Initialize audio system
      const audioInitialized = await initializeAudio();
      if (!audioInitialized) {
        throw new Error('Failed to initialize audio system');
      }

      // Connect to Deepgram Voice Agent WebSocket
      const wsUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent?agentId=${agent.id}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Voice Agent WebSocket connected');
        setIsConnected(true);
        updateStatus('connected');
        
        // Send agent configuration
        const configMessage = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: agent.system_prompt,
            voice: agent.voice_model,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: agent.settings.turn_detection,
            temperature: agent.settings.temperature,
            max_response_output_tokens: agent.settings.max_tokens,
            tools: agent.tools,
          }
        };
        wsRef.current?.send(JSON.stringify(configMessage));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'conversation.item.input_audio_transcription.completed':
              if (data.transcript) {
                onTranscript?.(data.transcript);
              }
              break;
              
            case 'response.audio.delta':
              if (data.delta) {
                handleAudioResponse(data.delta);
              }
              break;
              
            case 'response.audio_transcript.delta':
              if (data.delta) {
                onAgentResponse?.(data.delta);
              }
              break;
              
            case 'session.created':
              console.log('Deepgram session created');
              break;
              
            case 'session.updated':
              console.log('Deepgram session updated');
              break;
              
            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (error) {
          console.error('Message parsing error:', error);
          onError?.(`Message parse failed: ${error}`);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(`WebSocket error: ${error}`);
        updateStatus('error');
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        updateStatus('disconnected');
        stopRecording();
      };

    } catch (error) {
      console.error('Connection error:', error);
      onError?.(`Connection failed: ${error}`);
      updateStatus('error');
    }
  }, [agent, initializeAudio, onTranscript, onAgentResponse, onError, updateStatus, handleAudioResponse, stopRecording]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    updateStatus('disconnected');
  }, [stopRecording, updateStatus]);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }]
        }
      };
      wsRef.current.send(JSON.stringify(message));
      wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    }
  }, []);

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
