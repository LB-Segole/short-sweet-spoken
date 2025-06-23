
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { VoiceAgent } from '@/types/voiceAgent';
import { useVoiceAgentWebSocket } from '@/hooks/useVoiceAgentWebSocket';

interface FloatingVoiceAssistantProps {
  agent: VoiceAgent;
  onClose: () => void;
}

export const FloatingVoiceAssistant: React.FC<FloatingVoiceAssistantProps> = ({
  agent,
  onClose,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const sphereRef = useRef<HTMLDivElement>(null);

  console.log('🎙️ FloatingVoiceAssistant initialized with agent:', agent.name);

  const {
    isConnected,
    isRecording,
    status,
    connect,
    disconnect,
    startRecording,
    stopRecording,
  } = useVoiceAgentWebSocket({
    agent,
    onTranscript: (text) => {
      console.log('📝 Transcript received:', text);
      setCurrentTranscript(text);
      setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
    },
    onAgentResponse: (text) => {
      console.log('🤖 Agent response received:', text);
      setAssistantSpeaking(true);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: text }]);
      // Auto-stop speaking animation after estimated speaking time
      const estimatedTime = Math.max(3000, text.length * 80); // At least 3 seconds
      setTimeout(() => setAssistantSpeaking(false), estimatedTime);
    },
    onError: (error) => {
      console.error('❌ Voice Assistant Error:', error);
      setConnectionStatus(`Error: ${error}`);
    },
  });

  useEffect(() => {
    console.log('🔄 Auto-connecting to voice agent...');
    setConnectionStatus('Connecting...');
    connect();
    
    return () => {
      console.log('🧹 Cleaning up voice agent connection');
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    setIsListening(isRecording);
    setConnectionStatus(status);
  }, [isRecording, status]);

  const handleMicToggle = async () => {
    console.log('🎤 Mic toggle clicked, current state:', { isListening, isConnected });
    
    if (!isConnected) {
      console.log('⚠️ Not connected, attempting to connect...');
      await connect();
      return;
    }

    if (isListening) {
      console.log('🛑 Stopping recording...');
      stopRecording();
    } else {
      console.log('▶️ Starting recording...');
      await startRecording();
    }
  };

  const getSphereClasses = () => {
    let baseClasses = "w-40 h-40 rounded-full relative overflow-hidden transition-all duration-500 cursor-pointer transform hover:scale-105";
    
    if (assistantSpeaking) {
      return `${baseClasses} bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 animate-pulse shadow-2xl shadow-green-400/50`;
    } else if (isListening) {
      return `${baseClasses} bg-gradient-to-br from-red-400 via-pink-500 to-red-600 shadow-2xl shadow-red-400/60`;
    } else if (isConnected) {
      return `${baseClasses} bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 shadow-xl shadow-blue-400/40`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg animate-pulse`;
    }
  };

  const getStatusText = () => {
    if (assistantSpeaking) return `${agent.name} is speaking...`;
    if (isListening) return "Listening to you...";
    if (isConnected) return `${agent.name} is ready - Click to talk`;
    return connectionStatus;
  };

  const getInstructionText = () => {
    if (!isConnected) return "Connecting to AI assistant...";
    if (isListening) return "Speak now - I'm listening!";
    return "Click the orb or button below to start talking";
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4 text-center shadow-2xl animate-scale-in">
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Info */}
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{agent.name}</h2>
        <p className="text-gray-600 mb-8 text-lg">AI Voice Assistant</p>

        {/* Animated Sphere */}
        <div className="flex justify-center mb-8">
          <div
            ref={sphereRef}
            className={getSphereClasses()}
            onClick={handleMicToggle}
          >
            {/* Pulsing rings */}
            <div className="absolute inset-4 rounded-full bg-white/20 animate-ping"></div>
            <div className="absolute inset-6 rounded-full bg-white/30 animate-pulse"></div>
            
            {/* Icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isListening ? (
                <div className="flex flex-col items-center">
                  <Mic className="h-12 w-12 text-white animate-bounce" />
                  <div className="w-8 h-1 bg-white/60 rounded-full mt-2 animate-pulse"></div>
                </div>
              ) : assistantSpeaking ? (
                <div className="flex items-center space-x-1">
                  <Volume2 className="h-10 w-10 text-white animate-pulse" />
                  <div className="flex space-x-1">
                    <div className="w-1 h-8 bg-white/80 rounded-full animate-bounce"></div>
                    <div className="w-1 h-12 bg-white/80 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-6 bg-white/80 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              ) : isConnected ? (
                <div className="flex flex-col items-center">
                  <MicOff className="h-10 w-10 text-white/90" />
                  <div className="text-xs text-white/70 mt-2 font-medium">TAP TO TALK</div>
                </div>
              ) : (
                <div className="text-white/80 text-sm font-medium">Connecting...</div>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <p className="text-xl font-semibold text-gray-700 mb-4">
          {getStatusText()}
        </p>

        {/* Instructions */}
        <p className="text-sm text-gray-500 mb-6">
          {getInstructionText()}
        </p>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-600 mb-1 font-medium">You said:</p>
            <p className="text-gray-800 italic">"{currentTranscript}"</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleMicToggle}
            disabled={!isConnected && connectionStatus !== 'Connected'}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="flex-1 max-w-xs h-12 text-base font-medium"
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                {isConnected ? 'Start Talking' : 'Connect & Talk'}
              </>
            )}
          </Button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>Status: {connectionStatus}</p>
          <p>Conversation: {conversationHistory.length} messages</p>
          {agent.voice_model && <p>Voice: {agent.voice_model}</p>}
        </div>

        {/* Quick Help */}
        <div className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">💡 Tips:</p>
          <p>• Click the glowing orb to start/stop talking</p>
          <p>• Speak clearly after the orb turns red</p>
          <p>• Wait for {agent.name} to respond before speaking again</p>
        </div>
      </div>
    </div>
  );
};
