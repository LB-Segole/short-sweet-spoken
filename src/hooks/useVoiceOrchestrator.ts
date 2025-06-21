
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
  const streamRef = useRef<MediaStream | null>(null);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting voice orchestrator');
    
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

    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🎤 Stopped media track:', track.kind);
      });
      streamRef.current = null;
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

      console.log('🎤 Requesting microphone access...');
      setState(prev => ({ ...prev, error: null }));

      // Request microphone permission with proper error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000
          } 
        });
        streamRef.current = stream;
        console.log('✅ Microphone access granted');
      } catch (micError) {
        console.error('❌ Microphone access error:', micError);
        
        let errorMessage = 'Microphone access denied';
        if (micError instanceof Error) {
          if (micError.name === 'NotAllowedError') {
            errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
          } else if (micError.name === 'NotFoundError') {
            errorMessage = 'No microphone found. Please check your audio devices.';
          } else if (micError.name === 'NotReadableError') {
            errorMessage = 'Microphone is already in use by another application.';
          }
        }
        
        setState(prev => ({ ...prev, error: errorMessage }));
        return;
      }
      
      // Create WebSocket connection to Deepgram with proper URL format
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&encoding=linear16&sample_rate=16000`;
      
      console.log('🌐 Connecting to Deepgram WebSocket...');
      wsRef.current = new WebSocket(wsUrl, ['token', config.deepgramApiKey]);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to Deepgram');
        setState(prev => ({ ...prev, isConnected: true }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript;
            if (transcript.trim()) {
              console.log('📝 Transcript:', transcript);
              setState(prev => ({ ...prev, currentTranscript: transcript }));
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing WebSocket message:', parseError);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setState(prev => ({ ...prev, error: 'Connection to speech service failed' }));
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setState(prev => ({ ...prev, isConnected: false }));
      };

      // Setup audio processing
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        
        // Create media recorder for audio processing
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            // Send audio data to Deepgram
            wsRef.current.send(event.data);
          }
        };

        mediaRecorderRef.current.onstart = () => {
          console.log('🎤 Started recording audio');
          setState(prev => ({ ...prev, isListening: true }));
        };

        mediaRecorderRef.current.onstop = () => {
          console.log('🛑 Stopped recording audio');
          setState(prev => ({ ...prev, isListening: false }));
        };

        mediaRecorderRef.current.start(100); // Send data every 100ms
        
      } catch (audioError) {
        console.error('❌ Audio setup error:', audioError);
        setState(prev => ({ ...prev, error: 'Audio processing setup failed' }));
      }

    } catch (error) {
      console.error('❌ Connection error:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }, [config.deepgramApiKey]);

  const initiateCall = useCallback(async (phoneNumber: string, webhookUrl: string) => {
    try {
      console.log('📞 Initiating call to:', phoneNumber);
      
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
          StatusCallbackMethod: 'POST',
          Timeout: '30',
          MachineDetection: 'Enable',
          MachineDetectionTimeout: '15'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SignalWire API error:', response.status, errorText);
        throw new Error(`SignalWire API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Call initiated successfully:', data.sid);
      return data.sid;
      
    } catch (error) {
      console.error('❌ Call initiation error:', error);
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
