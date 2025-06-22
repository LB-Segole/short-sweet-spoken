
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
  const sphereRef = useRef<HTMLDivElement>(null);

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
      setCurrentTranscript(text);
      setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
    },
    onAgentResponse: (text) => {
      setAssistantSpeaking(true);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: text }]);
      // Auto-stop speaking animation after estimated speaking time
      const estimatedTime = text.length * 50; // ~50ms per character
      setTimeout(() => setAssistantSpeaking(false), estimatedTime);
    },
    onError: (error) => {
      console.error('Voice Assistant Error:', error);
    },
  });

  useEffect(() => {
    // Auto-connect when component mounts
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  useEffect(() => {
    setIsListening(isRecording);
  }, [isRecording]);

  const handleMicToggle = async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const getSphereClasses = () => {
    let baseClasses = "w-32 h-32 rounded-full relative overflow-hidden transition-all duration-300 cursor-pointer";
    
    if (assistantSpeaking) {
      return `${baseClasses} bg-gradient-to-br from-green-400 to-blue-500 animate-pulse shadow-2xl shadow-green-400/50`;
    } else if (isListening) {
      return `${baseClasses} bg-gradient-to-br from-red-400 to-pink-500 animate-pulse shadow-2xl shadow-red-400/50`;
    } else if (isConnected) {
      return `${baseClasses} bg-gradient-to-br from-blue-400 to-purple-500 shadow-xl shadow-blue-400/30`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg`;
    }
  };

  const getStatusText = () => {
    if (assistantSpeaking) return `${agent.name} is speaking...`;
    if (isListening) return "Listening...";
    if (isConnected) return `${agent.name} is ready`;
    return "Connecting...";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
        {/* Close Button */}
        <div className="flex justify-end mb-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Agent Info */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{agent.name}</h2>
        <p className="text-gray-600 mb-6">Voice AI Assistant</p>

        {/* Animated Sphere */}
        <div className="flex justify-center mb-6">
          <div
            ref={sphereRef}
            className={getSphereClasses()}
            onClick={handleMicToggle}
          >
            {/* Inner glow effect */}
            <div className="absolute inset-4 rounded-full bg-white bg-opacity-20 animate-ping"></div>
            
            {/* Mic icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {isListening ? (
                <Mic className="h-8 w-8 text-white" />
              ) : assistantSpeaking ? (
                <Volume2 className="h-8 w-8 text-white animate-bounce" />
              ) : (
                <MicOff className="h-8 w-8 text-white opacity-80" />
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <p className="text-lg font-medium text-gray-700 mb-4">
          {getStatusText()}
        </p>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">You said:</p>
            <p className="text-gray-800 italic">"{currentTranscript}"</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleMicToggle}
            disabled={!isConnected}
            variant={isListening ? "destructive" : "default"}
            size="lg"
            className="flex-1"
          >
            {isListening ? (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Start Talking
              </>
            )}
          </Button>
        </div>

        {/* Connection Status */}
        <div className="mt-4 text-xs text-gray-500">
          Status: {status} | History: {conversationHistory.length} messages
        </div>

        {/* Quick Instructions */}
        <div className="mt-4 text-xs text-gray-400 space-y-1">
          <p>Click the sphere or button to start talking</p>
          <p>Speak naturally - {agent.name} will respond with voice</p>
        </div>
      </div>
    </div>
  );
};
