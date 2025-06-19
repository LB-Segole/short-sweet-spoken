
import { useState, useCallback, useRef, useEffect } from 'react';
import { DeepgramSTTClient } from '../services/deepgram/sttClient';
import { DeepgramTTSClient } from '../services/deepgram/ttsClient';
import { SignalWireCallHandler } from '../services/signalwire/callHandler';
import { TranscriptResult, AudioChunk } from '../services/deepgram/types';

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
  currentTranscript: string;
  error: string | null;
}

export const useVoiceOrchestrator = (config: VoiceOrchestratorConfig) => {
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentTranscript: '',
    error: null
  });

  const sttClient = useRef<DeepgramSTTClient | null>(null);
  const ttsClient = useRef<DeepgramTTSClient | null>(null);
  const callHandler = useRef<SignalWireCallHandler | null>(null);
  const audioBuffer = useRef<Uint8Array[]>([]);
  const streamSid = useRef<string | null>(null);

  useEffect(() => {
    // Initialize clients
    sttClient.current = new DeepgramSTTClient(
      { apiKey: config.deepgramApiKey },
      {
        model: 'nova-2',
        language: 'en-US',
        smartFormat: true,
        interimResults: true,
        endpointing: 300
      }
    );

    ttsClient.current = new DeepgramTTSClient(
      { apiKey: config.deepgramApiKey },
      {
        model: 'aura-asteria-en',
        encoding: 'linear16',
        sampleRate: 8000
      }
    );

    callHandler.current = new SignalWireCallHandler(config.signalwireConfig);

    return () => {
      disconnect();
    };
  }, [config]);

  const handleTranscript = useCallback((result: TranscriptResult) => {
    setState(prev => ({
      ...prev,
      currentTranscript: result.transcript,
      isListening: !result.isFinal
    }));

    if (result.isFinal && result.transcript.trim()) {
      // Process the final transcript - here you would integrate with your conversation logic
      processConversation(result.transcript);
    }
  }, []);

  const handleAudioResponse = useCallback((chunk: AudioChunk) => {
    setState(prev => ({ ...prev, isSpeaking: true }));
    
    // Convert audio chunk to base64 for SignalWire
    const base64Audio = btoa(String.fromCharCode(...chunk.data));
    
    if (streamSid.current && callHandler.current) {
      callHandler.current.sendAudioToCall(streamSid.current, base64Audio);
    }

    // Reset speaking state after a delay
    setTimeout(() => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }, 1000);
  }, []);

  const processConversation = useCallback(async (transcript: string) => {
    // Simple echo response for now - replace with your conversation logic
    const response = `I heard you say: ${transcript}. How can I help you further?`;
    
    if (ttsClient.current) {
      ttsClient.current.sendText(response);
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      // Connect to DeepGram services
      if (sttClient.current && ttsClient.current) {
        await Promise.all([
          sttClient.current.connect(handleTranscript),
          ttsClient.current.connect(handleAudioResponse)
        ]);
      }

      setState(prev => ({ ...prev, isConnected: true }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, [handleTranscript, handleAudioResponse]);

  const disconnect = useCallback(() => {
    sttClient.current?.disconnect();
    ttsClient.current?.disconnect();
    
    setState({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      currentTranscript: '',
      error: null
    });
  }, []);

  const sendAudioChunk = useCallback((audioData: Uint8Array) => {
    if (sttClient.current && state.isConnected) {
      sttClient.current.sendAudio(audioData);
    }
  }, [state.isConnected]);

  const handleSignalWireStream = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.event) {
        case 'connected':
          console.log('SignalWire stream connected');
          break;
          
        case 'start':
          streamSid.current = data.streamSid;
          console.log('SignalWire stream started:', data.streamSid);
          break;
          
        case 'media':
          if (data.media?.payload) {
            // Convert base64 audio to Uint8Array and send to STT
            const audioData = Uint8Array.from(atob(data.media.payload), c => c.charCodeAt(0));
            sendAudioChunk(audioData);
          }
          break;
          
        case 'stop':
          console.log('SignalWire stream stopped');
          streamSid.current = null;
          break;
      }
    } catch (error) {
      console.error('Error handling SignalWire stream event:', error);
    }
  }, [sendAudioChunk]);

  const initiateCall = useCallback(async (phoneNumber: string, webhookUrl: string, streamUrl: string) => {
    if (!callHandler.current) {
      throw new Error('Call handler not initialized');
    }

    try {
      const callSid = await callHandler.current.initiateCall(phoneNumber, webhookUrl, streamUrl);
      return callSid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Call initiation failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  return {
    state,
    connect,
    disconnect,
    sendAudioChunk,
    handleSignalWireStream,
    initiateCall,
    processConversation
  };
};
