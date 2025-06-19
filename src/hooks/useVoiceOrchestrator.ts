
import { useState, useCallback, useRef, useEffect } from 'react';
import { DeepgramSTTClient } from '../services/deepgram/sttClient';
import { DeepgramTTSClient } from '../services/deepgram/ttsClient';
import { SignalWireCallHandler } from '../services/signalwire/callHandler';
import { TranscriptResult, AudioChunk } from '../services/deepgram/types';
import { generateConversationResponse } from '../services/conversationService';

interface VoiceOrchestratorConfig {
  deepgramApiKey: string;
  signalwireConfig: {
    projectId: string;
    token: string;
    spaceUrl: string;
    phoneNumber: string;
  };
  assistantId?: string;
  agentPrompt?: string;
  agentPersonality?: string;
}

interface VoiceState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  lastResponse: string;
  error: string | null;
  callStatus: 'idle' | 'connecting' | 'connected' | 'ended';
}

export const useVoiceOrchestrator = (config: VoiceOrchestratorConfig) => {
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentTranscript: '',
    lastResponse: '',
    error: null,
    callStatus: 'idle'
  });

  const sttClient = useRef<DeepgramSTTClient | null>(null);
  const ttsClient = useRef<DeepgramTTSClient | null>(null);
  const callHandler = useRef<SignalWireCallHandler | null>(null);
  const streamSid = useRef<string | null>(null);
  const conversationHistory = useRef<Array<{ role: string; content: string }>>([]);

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

  const handleTranscript = useCallback(async (result: TranscriptResult) => {
    setState(prev => ({
      ...prev,
      currentTranscript: result.transcript,
      isListening: !result.isFinal
    }));

    if (result.isFinal && result.transcript.trim()) {
      console.log('Final transcript received:', result.transcript);
      
      // Add to conversation history
      conversationHistory.current.push({
        role: 'user',
        content: result.transcript
      });

      // Process the conversation
      await processConversation(result.transcript);
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
    try {
      console.log('Processing conversation with transcript:', transcript);
      
      // Generate AI response using conversation service
      const response = await generateConversationResponse(transcript, {
        callId: streamSid.current || 'direct-call',
        agentPrompt: config.agentPrompt,
        agentPersonality: config.agentPersonality,
        previousMessages: conversationHistory.current
      });

      console.log('Generated response:', response);
      
      // Add AI response to conversation history
      conversationHistory.current.push({
        role: 'assistant',
        content: response.text
      });

      // Update state with response
      setState(prev => ({
        ...prev,
        lastResponse: response.text
      }));

      // Send to TTS for speech synthesis
      if (ttsClient.current) {
        ttsClient.current.sendText(response.text);
      }

      // Handle special actions
      if (response.shouldEndCall) {
        console.log('AI decided to end call');
        setTimeout(() => {
          disconnect();
          setState(prev => ({ ...prev, callStatus: 'ended' }));
        }, 3000); // Give time for TTS to finish
      } else if (response.shouldTransfer) {
        console.log('AI decided to transfer call');
        // Handle transfer logic here
      }

    } catch (error) {
      console.error('Error processing conversation:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to process conversation'
      }));
    }
  }, [config.agentPrompt, config.agentPersonality]);

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null, callStatus: 'connecting' }));

      // Connect to DeepGram services
      if (sttClient.current && ttsClient.current) {
        await Promise.all([
          sttClient.current.connect(handleTranscript),
          ttsClient.current.connect(handleAudioResponse)
        ]);
      }

      setState(prev => ({ 
        ...prev, 
        isConnected: true,
        callStatus: 'connected'
      }));

      console.log('Voice orchestrator connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        callStatus: 'idle'
      }));
      throw error;
    }
  }, [handleTranscript, handleAudioResponse]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting voice orchestrator');
    
    sttClient.current?.disconnect();
    ttsClient.current?.disconnect();
    
    setState({
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      currentTranscript: '',
      lastResponse: '',
      error: null,
      callStatus: 'ended'
    });

    // Clear conversation history
    conversationHistory.current = [];
    streamSid.current = null;
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
          setState(prev => ({ ...prev, callStatus: 'connected' }));
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
          setState(prev => ({ ...prev, callStatus: 'ended' }));
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
      setState(prev => ({ ...prev, callStatus: 'connecting' }));
      
      const callSid = await callHandler.current.initiateCall(phoneNumber, webhookUrl, streamUrl);
      console.log('Call initiated successfully:', callSid);
      
      return callSid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Call initiation failed';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        callStatus: 'idle'
      }));
      throw error;
    }
  }, []);

  const sendTextMessage = useCallback(async (text: string) => {
    if (text.trim()) {
      await processConversation(text);
    }
  }, [processConversation]);

  return {
    state,
    connect,
    disconnect,
    sendAudioChunk,
    handleSignalWireStream,
    initiateCall,
    sendTextMessage,
    conversationHistory: conversationHistory.current
  };
};
