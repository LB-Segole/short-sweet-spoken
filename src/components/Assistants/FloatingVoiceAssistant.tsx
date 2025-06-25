
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Volume2 } from 'lucide-react';
import { Assistant } from '@/types/assistant';
import { useSimpleVoiceWebSocket } from '@/hooks/useSimpleVoiceWebSocket';

interface FloatingVoiceAssistantProps {
  assistant: Assistant;
  onClose: () => void;
}

export const FloatingVoiceAssistant: React.FC<FloatingVoiceAssistantProps> = ({
  assistant,
  onClose,
}) => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const hasConnected = useRef(false);

  console.log('🎙️ FloatingVoiceAssistant initialized with assistant:', assistant.name);

  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendText,
  } = useSimpleVoiceWebSocket({
    userId: 'browser-user',
    callId: 'browser-test',
    assistantId: assistant.id,
    onConnectionChange: (connected) => {
      console.log('🔄 Connection state changed:', { connected });
    },
    onTranscript: (text, isFinal) => {
      console.log('📝 Transcript received:', { text, isFinal });
      setCurrentTranscript(text);
      if (isFinal) {
        setConversationHistory(prev => [...prev, { role: 'user', content: text }]);
      }
    },
    onAIResponse: (text) => {
      console.log('🤖 Assistant response received:', text);
      setAssistantSpeaking(true);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: text }]);
      // Auto-stop speaking animation after estimated time
      const estimatedTime = Math.max(3000, text.length * 80);
      setTimeout(() => setAssistantSpeaking(false), estimatedTime);
    },
    onAudioResponse: () => {
      console.log('🔊 Audio response received');
      setAssistantSpeaking(true);
    },
    onError: (error) => {
      console.error('❌ Voice Assistant Error:', error);
    },
  });

  // Auto-connect once when component mounts
  useEffect(() => {
    if (!hasConnected.current) {
      hasConnected.current = true;
      console.log('🔄 Auto-connecting to voice assistant...');
      connect();
    }

    return () => {
      console.log('🧹 Cleaning up voice assistant connection');
      disconnect();
    };
  }, [connect, disconnect]);

  const handleMicToggle = useCallback(async () => {
    if (!isConnected && !isConnecting) {
      console.log('⚠️ Not connected, attempting to connect...');
      await connect();
      return;
    }

    // For now, just send a test text message
    // TODO: Implement actual microphone recording
    if (isConnected) {
      const testMessage = "Hello, can you hear me?";
      console.log('📤 Sending test message:', testMessage);
      sendText(testMessage);
    }
  }, [isConnected, isConnecting, connect, sendText]);

  const getSphereClasses = () => {
    let baseClasses = "w-40 h-40 rounded-full relative overflow-hidden transition-all duration-500 cursor-pointer transform hover:scale-105";
    
    if (assistantSpeaking) {
      return `${baseClasses} bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 animate-pulse shadow-2xl shadow-green-400/50`;
    } else if (isConnected) {
      return `${baseClasses} bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-600 shadow-xl shadow-blue-400/40`;
    } else if (isConnecting) {
      return `${baseClasses} bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg animate-pulse`;
    } else {
      return `${baseClasses} bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg`;
    }
  };

  const getStatusText = () => {
    if (assistantSpeaking) return `${assistant.name} is speaking...`;
    if (isConnected) return `${assistant.name} is ready - Click to talk`;
    if (isConnecting) return "Connecting...";
    if (error) return `Error: ${error}`;
    return 'Disconnected';
  };

  const getInstructionText = () => {
    if (isConnecting) return "Connecting to AI assistant...";
    if (!isConnected) return "Click the button below to connect";
    return "Connected! Click the orb to send a test message";
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

        {/* Assistant Info */}
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{assistant.name}</h2>
        <p className="text-gray-600 mb-8 text-lg">AI Voice Assistant</p>

        {/* Animated Sphere */}
        <div className="flex justify-center mb-8">
          <div
            className={getSphereClasses()}
            onClick={handleMicToggle}
          >
            {/* Pulsing rings */}
            <div className="absolute inset-4 rounded-full bg-white/20 animate-ping"></div>
            <div className="absolute inset-6 rounded-full bg-white/30 animate-pulse"></div>
            
            {/* Icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {assistantSpeaking ? (
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
                  <Mic className="h-10 w-10 text-white/90" />
                  <div className="text-xs text-white/70 mt-2 font-medium">TAP TO TEST</div>
                </div>
              ) : isConnecting ? (
                <div className="text-white/80 text-sm font-medium animate-pulse">Connecting...</div>
              ) : (
                <div className="text-white/80 text-sm font-medium">Disconnected</div>
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
            disabled={isConnecting}
            variant={isConnected ? "default" : "secondary"}
            size="lg"
            className="flex-1 max-w-xs h-12 text-base font-medium"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : isConnected ? (
              <>
                <Mic className="h-5 w-5 mr-2" />
                Send Test Message
              </>
            ) : (
              <>
                <MicOff className="h-5 w-5 mr-2" />
                Connect
              </>
            )}
          </Button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 text-xs text-gray-400 space-y-1">
          <p>Status: {isConnected ? 'Connected' : isConnecting ? 'Connecting' : 'Disconnected'}</p>
          <p>Conversation: {conversationHistory.length} messages</p>
          {assistant.voice_id && <p>Voice: {assistant.voice_id}</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
        </div>

        {/* Debug Info */}
        <div className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-1">🔍 Debug Info:</p>
          <p>• Using simplified WebSocket connection</p>
          <p>• Endpoint: deepgram-voice-agent</p>
          <p>• Connection will timeout after 30 seconds</p>
          <p>• Check browser console for detailed logs</p>
        </div>
      </div>
    </div>
  );
};
