import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { VoiceAgent } from '@/types/voiceAgent';
import { useVoiceAgentWebSocket } from '@/hooks/useVoiceAgentWebSocket';
import { FloatingVoiceAssistant } from './FloatingVoiceAssistant';
import { Mic, MicOff, Send, Phone, PhoneOff, Volume2, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';

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
  const [showFloatingAssistant, setShowFloatingAssistant] = useState(false);
  const [microphoneStatus, setMicrophoneStatus] = useState<'unknown' | 'checking' | 'granted' | 'denied'>('unknown');
  const [connectionStage, setConnectionStage] = useState<string>('Disconnected');

  console.log('🎮 VoiceTestInterface initialized for agent:', agent.name);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-19), logEntry]); // Keep last 20 logs
    console.log('🎙️', logEntry);
  };

  const checkMicrophoneAccess = async () => {
    setMicrophoneStatus('checking');
    setConnectionStage('Requesting Microphone Access...');
    addLog('Checking microphone permissions...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setMicrophoneStatus('granted');
      addLog('✅ Microphone access granted');
      setConnectionStage('Microphone Ready');
      return true;
    } catch (error) {
      setMicrophoneStatus('denied');
      addLog(`❌ Microphone access denied: ${error}`);
      setConnectionStage('Microphone Access Denied');
      return false;
    }
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
      setConnectionStage(`Error: ${error}`);
    },
  });

  // Update connection stage based on status
  useEffect(() => {
    if (status !== connectionStage) {
      setConnectionStage(status);
    }
  }, [status]);

  const handleConnect = async () => {
    if (isConnected) {
      addLog('Disconnecting from voice agent...');
      disconnect();
      setConnectionStage('Disconnected');
    } else {
      addLog('Starting connection process...');
      setConnectionStage('Initializing...');
      
      // Check microphone first
      const micAccess = await checkMicrophoneAccess();
      if (!micAccess) {
        addLog('❌ Cannot proceed without microphone access');
        return;
      }

      setConnectionStage('Connecting to Voice Agent...');
      addLog('Connecting to voice agent...');
      
      // Set a timeout for connection
      const connectionTimeout = setTimeout(() => {
        if (!isConnected) {
          addLog('⏰ Connection timeout after 10 seconds');
          setConnectionStage('Connection Timeout - Retrying...');
          disconnect();
          
          // Auto-retry once
          setTimeout(() => {
            addLog('🔄 Auto-retrying connection...');
            connect();
          }, 2000);
        }
      }, 10000);

      try {
        await connect();
        clearTimeout(connectionTimeout);
        if (isConnected) {
          addLog('✅ Successfully connected to voice agent');
          setConnectionStage('Connected');
        }
      } catch (error) {
        clearTimeout(connectionTimeout);
        addLog(`❌ Connection failed: ${error}`);
        setConnectionStage('Connection Failed');
      }
    }
  };

  const handleStartVoiceChat = async () => {
    console.log('🚀 Starting voice chat for agent:', agent.name);
    
    // Ensure microphone access first
    if (microphoneStatus !== 'granted') {
      const micAccess = await checkMicrophoneAccess();
      if (!micAccess) {
        addLog('❌ Cannot start voice chat without microphone access');
        return;
      }
    }

    addLog(`Starting voice chat with ${agent.name}...`);
    setShowFloatingAssistant(true);
  };

  const handleCloseVoiceChat = () => {
    console.log('🛑 Closing voice chat');
    addLog('Voice chat session ended');
    setShowFloatingAssistant(false);
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
    
    // Check microphone on mount
    checkMicrophoneAccess();
    
    return () => {
      disconnect();
    };
  }, [agent.name, disconnect]);

  const getMicrophoneIcon = () => {
    switch (microphoneStatus) {
      case 'checking': return <Volume2 className="h-4 w-4 animate-pulse" />;
      case 'granted': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denied': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Mic className="h-4 w-4" />;
    }
  };

  const getConnectionStatus = () => {
    if (isConnected) return 'default';
    if (connectionStage.includes('Error') || connectionStage.includes('Failed') || connectionStage.includes('Denied')) return 'destructive';
    if (connectionStage.includes('Connecting') || connectionStage.includes('Initializing')) return 'secondary';
    return 'outline';
  };

  return (
    <>
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
                  <Badge variant={getConnectionStatus()}>
                    {connectionStage}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getMicrophoneIcon()}
                    Mic: {microphoneStatus}
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
            {/* Microphone Access Status */}
            {microphoneStatus === 'denied' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-red-700">Microphone Access Required</h3>
                </div>
                <p className="text-red-600 text-sm mb-3">
                  Voice chat requires microphone access. Please enable microphone permissions in your browser settings and refresh the page.
                </p>
                <Button onClick={checkMicrophoneAccess} variant="outline" size="sm">
                  <Mic className="h-4 w-4 mr-2" />
                  Retry Microphone Access
                </Button>
              </div>
            )}

            {/* Main Voice Chat Button */}
            <div className="flex justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-dashed border-blue-200">
              <div className="text-center">
                <Button
                  onClick={handleStartVoiceChat}
                  size="lg"
                  disabled={microphoneStatus !== 'granted'}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-xl px-12 py-6 h-auto rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageSquare className="h-8 w-8 mr-4" />
                  Start Voice Chat
                </Button>
                <p className="text-gray-600 mt-4 text-lg">
                  Click to launch the interactive voice assistant
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {microphoneStatus === 'granted' 
                    ? 'You\'ll see a floating orb that you can speak to directly'
                    : 'Microphone access required first'
                  }
                </p>
              </div>
            </div>

            {/* Debug Controls */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 text-gray-700">Debug Controls & Connection Status</h3>
              
              {/* Connection Status Display */}
              <div className="mb-4 p-3 bg-white rounded border">
                <div className="text-sm">
                  <strong>Connection Stage:</strong> {connectionStage}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  WebSocket: {isConnected ? '✅ Connected' : '❌ Disconnected'} | 
                  Recording: {isRecording ? '🎤 Active' : '⏸️ Inactive'} | 
                  Microphone: {microphoneStatus}
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={handleConnect}
                  variant={isConnected ? 'destructive' : 'default'}
                  size="sm"
                  disabled={microphoneStatus === 'checking'}
                >
                  {isConnected ? <PhoneOff className="h-4 w-4 mr-2" /> : <Phone className="h-4 w-4 mr-2" />}
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
                
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  variant={isRecording ? 'destructive' : 'secondary'}
                  disabled={!isConnected || microphoneStatus !== 'granted'}
                  size="sm"
                >
                  {isRecording ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>

                <Button
                  onClick={checkMicrophoneAccess}
                  variant="outline"
                  size="sm"
                >
                  {getMicrophoneIcon()}
                  Test Mic
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
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Conversation History */}
              <div className="space-y-2">
                <h3 className="font-semibold">Conversation</h3>
                <div className="h-64 overflow-y-auto border rounded-lg p-4 space-y-2 bg-white">
                  {conversation.length === 0 ? (
                    <p className="text-gray-500 text-center">No conversation yet. Connect and start voice chat above!</p>
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
                <h3 className="font-semibold">Live Debug Logs</h3>
                <div className="h-64 overflow-y-auto border rounded-lg p-4 bg-black text-green-400 font-mono text-xs">
                  {logs.length === 0 ? (
                    <p className="text-gray-500">Debug logs will appear here...</p>
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

      {/* Floating Voice Assistant */}
      {showFloatingAssistant && (
        <FloatingVoiceAssistant
          agent={agent}
          onClose={handleCloseVoiceChat}
        />
      )}
    </>
  );
};
