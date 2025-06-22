
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { VoiceAgent } from '@/types/voiceAgent';
import { useVoiceAgentWebSocket } from '@/hooks/useVoiceAgentWebSocket';
import { Mic, MicOff, Send, Phone, PhoneOff } from 'lucide-react';

interface VoiceTestInterfaceProps {
  agent: VoiceAgent;
  onClose: () => void;
}

export const VoiceTestInterface: React.FC<VoiceTestInterfaceProps> = ({
  agent,
  onClose,
}) => {
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState<Array<{
    speaker: 'user' | 'agent';
    text: string;
    timestamp: string;
  }>>([]);

  const {
    isConnected,
    isRecording,
    status,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
  } = useVoiceAgentWebSocket({
    agent,
    onTranscript: (text) => {
      setConversation(prev => [...prev, {
        speaker: 'user',
        text,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    },
    onAgentResponse: (text) => {
      setConversation(prev => [...prev, {
        speaker: 'agent',
        text,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    },
    onError: (error) => {
      console.error('Voice test error:', error);
    },
  });

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      sendTextMessage(textInput);
      setConversation(prev => [...prev, {
        speaker: 'user',
        text: textInput,
        timestamp: new Date().toLocaleTimeString(),
      }]);
      setTextInput('');
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Voice Test - {agent.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {status}
                </Badge>
                <Badge variant="outline">{agent.voice_model}</Badge>
              </div>
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Connection Controls */}
          <div className="flex gap-2">
            <Button
              onClick={handleConnect}
              variant={isConnected ? 'destructive' : 'default'}
            >
              {isConnected ? <PhoneOff className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
            
            <Button
              onClick={handleRecording}
              variant={isRecording ? 'destructive' : 'secondary'}
              disabled={!isConnected}
            >
              {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message to test text input..."
              className="flex-1"
              rows={2}
              disabled={!isConnected}
            />
            <Button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Conversation History */}
          <div className="space-y-2">
            <h3 className="font-semibold">Conversation</h3>
            <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-2">
              {conversation.length === 0 ? (
                <p className="text-gray-500 text-center">No conversation yet. Connect and start talking!</p>
              ) : (
                conversation.map((item, index) => (
                  <div
                    key={index}
                    className={`flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        item.speaker === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{item.text}</p>
                      <p className="text-xs opacity-70 mt-1">{item.timestamp}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Agent Info */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold mb-2">Agent Configuration</h4>
            <div className="text-sm space-y-1">
              <p><strong>Voice:</strong> {agent.voice_model}</p>
              <p><strong>Temperature:</strong> {agent.settings.temperature}</p>
              <p><strong>Max Tokens:</strong> {agent.settings.max_tokens}</p>
              <p><strong>Turn Detection:</strong> {agent.settings.turn_detection?.type}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
