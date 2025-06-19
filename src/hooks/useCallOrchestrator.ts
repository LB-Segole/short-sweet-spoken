import { useState, useCallback, useRef, useEffect } from 'react';
import { Agent } from '../types/agent';
import { DeepgramSTTClient, STTConfig, TranscriptEvent } from '../deepgram/stt';
import { DeepgramTTSClient, TTSConfig, AudioChunk } from '../deepgram/tts';
import { SignalWireClient } from '../signalwire/client';
import { SignalWireConfig } from '../signalwire/types';
import { generateConversationResponse } from '../services/conversationService';

interface CallOrchestratorConfig {
  deepgramApiKey: string;
  signalwireConfig: SignalWireConfig;
}

interface CallState {
  isActive: boolean;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  currentAgent: Agent | null;
  callSid: string | null;
  error: string | null;
  logs: string[];
}

export const useCallOrchestrator = (config: CallOrchestratorConfig) => {
  const [state, setState] = useState<CallState>({
    isActive: false,
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentTranscript: '',
    currentAgent: null,
    callSid: null,
    error: null,
    logs: []
  });

  const sttClient = useRef<DeepgramSTTClient | null>(null);
  const ttsClient = useRef<DeepgramTTSClient | null>(null);
  const signalwireClient = useRef<SignalWireClient | null>(null);
  const websocket = useRef<WebSocket | null>(null);
  const streamSid = useRef<string | null>(null);

  // Initialize clients
  useEffect(() => {
    const sttConfig: STTConfig = {
      apiKey: config.deepgramApiKey,
      model: 'nova-2',
      language: 'en-US',
      smartFormat: true,
      interimResults: true,
      endpointing: 300,
      utteranceEndMs: 1000
    };

    sttClient.current = new DeepgramSTTClient(sttConfig);
    signalwireClient.current = new SignalWireClient(config.signalwireConfig);

    return () => {
      disconnect();
    };
  }, [config]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-19), `[${timestamp}] ${message}`]
    }));
    console.log(`[CallOrchestrator] ${message}`);
  }, []);

  const handleSTTTranscript = useCallback((event: TranscriptEvent) => {
    setState(prev => ({
      ...prev,
      currentTranscript: event.transcript,
      isListening: !event.isFinal
    }));

    if (event.isFinal && event.transcript.trim() && state.currentAgent) {
      addLog(`👤 User: ${event.transcript}`);
      processConversation(event.transcript);
    }
  }, [state.currentAgent]);

  const handleTTSAudio = useCallback((chunk: AudioChunk) => {
    setState(prev => ({ ...prev, isSpeaking: true }));
    
    // Convert audio chunk to base64 for SignalWire
    const base64Audio = btoa(String.fromCharCode(...chunk.data));
    
    if (streamSid.current && websocket.current?.readyState === WebSocket.OPEN) {
      const mediaMessage = {
        event: 'media',
        streamSid: streamSid.current,
        media: {
          payload: base64Audio
        }
      };
      websocket.current.send(JSON.stringify(mediaMessage));
      addLog('🔊 Audio sent to call');
    }

    // Reset speaking state after a delay
    setTimeout(() => {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }, 1000);
  }, []);

  const processConversation = useCallback(async (transcript: string) => {
    try {
      addLog('🧠 Processing conversation...');
      
      const response = await generateConversationResponse(transcript);
      const agentResponse = `${response.text}`;
      
      addLog(`🤖 Agent: ${agentResponse}`);
      
      if (ttsClient.current) {
        ttsClient.current.sendText(agentResponse);
      }

      if (response.shouldEndCall) {
        addLog('📞 Ending call as requested');
        setTimeout(() => {
          disconnect();
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Conversation error: ${errorMessage}`);
      console.error('Conversation processing error:', error);
    }
  }, []);

  const connectToStreaming = useCallback(async (currentAgent: Agent) => {
    try {
      addLog('🔄 Connecting to streaming services...');

      // Initialize TTS with agent's voice settings
      const ttsConfig: TTSConfig = {
        apiKey: config.deepgramApiKey,
        model: currentAgent.voiceSettings.model,
        encoding: 'linear16',
        sampleRate: 8000,
        container: 'none'
      };

      ttsClient.current = new DeepgramTTSClient(ttsConfig);

      // Connect STT and TTS
      await Promise.all([
        sttClient.current?.connect(
          handleSTTTranscript,
          (connected) => addLog(connected ? '✅ STT connected' : '❌ STT disconnected'),
          (error) => addLog(`❌ STT error: ${error}`)
        ),
        ttsClient.current?.connect(
          handleTTSAudio,
          (connected) => addLog(connected ? '✅ TTS connected' : '❌ TTS disconnected'),
          (error) => addLog(`❌ TTS error: ${error}`)
        )
      ]);

      setState(prev => ({ ...prev, isConnected: true }));
      addLog('✅ Streaming services connected');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Streaming connection failed: ${errorMessage}`);
      throw error;
    }
  }, [config.deepgramApiKey, handleSTTTranscript, handleTTSAudio]);

  const setupWebSocketConnection = useCallback((streamUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      try {
        addLog('🌐 Connecting to WebSocket stream...');
        websocket.current = new WebSocket(streamUrl);

        websocket.current.onopen = () => {
          addLog('✅ WebSocket connected');
          resolve();
        };

        websocket.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.event) {
              case 'connected':
                addLog('📡 Stream connected');
                break;
                
              case 'start':
                streamSid.current = data.streamSid;
                addLog(`🎙️ Stream started: ${data.streamSid}`);
                
                // Send initial greeting
                if (state.currentAgent?.firstMessage && ttsClient.current) {
                  setTimeout(() => {
                    ttsClient.current?.sendText(state.currentAgent!.firstMessage);
                    addLog(`🤖 Greeting: ${state.currentAgent!.firstMessage}`);
                  }, 1000);
                }
                break;
                
              case 'media':
                if (data.media?.payload && sttClient.current) {
                  // Convert base64 audio to binary and send to STT
                  const binaryAudio = Uint8Array.from(atob(data.media.payload), c => c.charCodeAt(0));
                  sttClient.current.sendAudio(binaryAudio);
                }
                break;
                
              case 'stop':
                addLog('🛑 Stream stopped');
                streamSid.current = null;
                break;
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };

        websocket.current.onerror = (error) => {
          addLog('❌ WebSocket error');
          console.error('WebSocket error:', error);
          reject(error);
        };

        websocket.current.onclose = () => {
          addLog('🔌 WebSocket closed');
          streamSid.current = null;
        };

      } catch (error) {
        reject(error);
      }
    });
  }, [state.currentAgent]);

  const startCall = useCallback(async (agent: Agent, phoneNumber: string) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isActive: true, 
        currentAgent: agent,
        error: null,
        logs: []
      }));

      addLog(`🚀 Starting call with agent: ${agent.name}`);
      addLog(`📞 Calling: ${phoneNumber}`);

      // Connect to streaming services first
      await connectToStreaming(agent);

      // Setup WebSocket stream URL (this would be your backend WebSocket endpoint)
      const streamUrl = `wss://${window.location.hostname}/voice-stream?agentId=${agent.id}`;
      const webhookUrl = `${window.location.origin}/api/voice/webhook`;

      // Setup WebSocket connection
      await setupWebSocketConnection(streamUrl);

      // Initiate the actual phone call
      if (signalwireClient.current) {
        const result = await signalwireClient.current.initiateCall({
          phoneNumber,
          agentId: agent.id,
          webhookUrl,
          streamUrl
        });

        if (result.success) {
          setState(prev => ({ ...prev, callSid: result.callSid || null }));
          addLog(`✅ Call initiated: ${result.callSid}`);
        } else {
          throw new Error(result.error || 'Call initiation failed');
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Call start failed: ${errorMessage}`);
      setState(prev => ({ ...prev, error: errorMessage, isActive: false }));
      throw error;
    }
  }, [connectToStreaming, setupWebSocketConnection]);

  const disconnect = useCallback(() => {
    addLog('🔄 Disconnecting all services...');

    sttClient.current?.disconnect();
    ttsClient.current?.disconnect();
    
    if (websocket.current) {
      websocket.current.close();
      websocket.current = null;
    }

    streamSid.current = null;

    setState({
      isActive: false,
      isConnected: false,
      isListening: false,
      isSpeaking: false,
      currentTranscript: '',
      currentAgent: null,
      callSid: null,
      error: null,
      logs: []
    });

    addLog('✅ All services disconnected');
  }, []);

  return {
    state,
    startCall,
    disconnect,
    addLog
  };
};
