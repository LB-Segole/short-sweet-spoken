
import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceOrchestratorConfig {
  deepgramApiKey: string;
  signalwireConfig: {
    projectId: string;
    token: string;
    spaceUrl: string;
    phoneNumber: string;
  };
}

interface VoiceState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  error: string | null;
  currentTranscript: string;
}

export const useVoiceOrchestrator = (config: VoiceOrchestratorConfig) => {
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    error: null,
    currentTranscript: ''
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const disconnect = useCallback(() => {
    console.log('Disconnecting voice orchestrator');
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      error: null,
      currentTranscript: ''
    });
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!config.deepgramApiKey) {
        throw new Error('Deepgram API key is required');
      }

      setState(prev => ({ ...prev, error: null }));

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create WebSocket connection to Deepgram
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&encoding=linear16&sample_rate=16000`;
      
      // Create WebSocket with proper authorization header
      wsRef.current = new WebSocket(wsUrl);

      // Set authorization header after connection
      wsRef.current.onopen = () => {
        console.log('Connected to Deepgram');
        // Send authorization message
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            type: 'auth',
            token: config.deepgramApiKey
          }));
        }
        setState(prev => ({ ...prev, isConnected: true }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          console.log('Transcript:', transcript);
          setState(prev => ({ ...prev, currentTranscript: transcript }));
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'WebSocket connection failed' }));
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket closed');
        setState(prev => ({ ...prev, isConnected: false }));
      };

      // Setup media recorder
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Create media recorder for audio processing
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert audio data and send to Deepgram
          wsRef.current.send(event.data);
        }
      };

      mediaRecorderRef.current.start(100); // Send data every 100ms
      setState(prev => ({ ...prev, isListening: true }));

    } catch (error) {
      console.error('Connection error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config.deepgramApiKey]);

  const initiateCall = useCallback(async (phoneNumber: string, webhookUrl: string) => {
    try {
      const response = await fetch(`https://${config.signalwireConfig.spaceUrl}/api/laml/2010-04-01/Accounts/${config.signalwireConfig.projectId}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${config.signalwireConfig.projectId}:${config.signalwireConfig.token}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: config.signalwireConfig.phoneNumber,
          Url: webhookUrl,
          StatusCallback: webhookUrl,
          StatusCallbackMethod: 'POST'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SignalWire API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      console.log('Call initiated:', data);
      return data;
    } catch (error) {
      console.error('Call initiation error:', error);
      throw error;
    }
  }, [config.signalwireConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    connect,
    disconnect,
    initiateCall
  };
};
