
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { VoiceAgent } from '@/types/voiceAgent';
import { useVoiceAgentWebSocket } from '@/hooks/useVoiceAgentWebSocket';
import { Mic, MicOff, Send, Phone, PhoneOff, Volume2 } from 'lucide-react';

interface VoiceTestInterfaceProps {
  agent: VoiceAgent;
  onClose: () => void;
}

interface ConversationMessage {
  speaker: 'user' | 'agent';
  text: string;
  timestamp: string;
  type: 'transcript' | 'response';
}

export const VoiceTestInterface: React.FC<VoiceTestInterfaceProps> = ({
  agent,
  onClose,
}) => {
  const [textInput, setTextInput] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
    console.log('🎙️', logEntry);
  };

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
      addLog(`User said: "${text}"`);
      setConversation(prev => [...prev, {
        speaker: 'user',
        text,
        timestamp: new Date().toLocaleTimeString(),
        type: 'transcript'
      }]);
    },
    onAgentResponse: (text) => {
      addLog(`AI responded: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      setConversation(prev => [...prev, {
        speaker: 'agent',
        text,
        timestamp: new Date().toLocaleTimeString(),
        type: 'response'
      }]);
    },
    onError: (error) => {
      addLog(`Error: ${error}`);
    },
  });

  const handleConnect = () => {
    if (isConnected) {
      addLog('Disconnecting from voice agent...');
      disconnect();
    } else {
      addLog('Connecting to voice agent...');
      connect();
    }
  };

  const handleRecording = () => {
    if (isRecording) {
      addLog('Stopping voice recording...');
      stopRecording();
    } else {
      addLog('Starting voice recording...');
      startRecording();
    }
  };

  const handleSendText = () => {
    if (textInput.trim()) {
      addLog(`Sending text: "${textInput}"`);
      sendTextMessage(textInput);
      setConversation(prev => [...prev, {
        speaker: 'user',
        text: textInput,
        timestamp: new Date().toLocaleTimeString(),
        type: 'transcript'
      }]);
      setTextInput('');
    }
  };

  useEffect(() => {
    addLog(`Voice test interface initialized for agent: ${agent.name}`);
    return () => {
      disconnect();
    };
  }, [agent.name, disconnect]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>Voice AI Test - {agent.name}</span>
              </CardTitle>
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
          <div className="flex gap-2 p-4 bg-gray-50 rounded-lg">
            <Button
              onClick={handleConnect}
              variant={isConnected ? 'destructive' : 'default'}
              className="flex-1"
            >
              {isConnected ? <PhoneOff className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
            
            <Button
              onClick={handleRecording}
              variant={isRecording ? 'destructive' : 'secondary'}
              disabled={!isConnected}
              className="flex-1"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
            />
            <Button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Conversation History */}
            <div className="space-y-2">
              <h3 className="font-semibold">Conversation</h3>
              <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-2 bg-white">
                {conversation.length === 0 ? (
                  <p className="text-gray-500 text-center">No conversation yet. Connect and start talking!</p>
                ) : (
                  conversation.map((item, index) => (
                    <div
                      key={index}
                      className={`flex ${item.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          item.speaker === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-green-100 text-gray-800 border border-green-200'
                        }`}
                      >
                        <p className="text-sm">{item.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {item.timestamp} - {item.type}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Logs */}
            <div className="space-y-2">
              <h3 className="font-semibold">Live Logs</h3>
              <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-black text-green-400 font-mono text-xs">
                {logs.length === 0 ? (
                  <p className="text-gray-500">Logs will appear here...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Agent Info */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">Agent Configuration</h4>
            <div className="text-sm space-y-1">
              <p><strong>Name:</strong> {agent.name}</p>
              <p><strong>Voice:</strong> {agent.voice_model}</p>
              <p><strong>System Prompt:</strong> {agent.system_prompt?.substring(0, 100)}...</p>
              {agent.settings && (
                <>
                  <p><strong>Temperature:</strong> {agent.settings.temperature}</p>
                  <p><strong>Max Tokens:</strong> {agent.settings.max_tokens}</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
