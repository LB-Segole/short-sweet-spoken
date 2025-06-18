
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Loader2, Activity } from 'lucide-react';
import { useVoiceWebSocket } from '@/hooks/useVoiceWebSocket';
import { toast } from 'sonner';

interface VoiceInterfaceProps {
  callId?: string;
  assistantId?: string;
  className?: string;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  callId,
  assistantId,
  className
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [lastResponse, setLastResponse] = useState<string>('');
  const [audioActivity, setAudioActivity] = useState(false);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      toast.success('Voice connection established');
      addLog('✅ Voice connection established');
    } else {
      toast.info('Voice connection closed');
      addLog('❌ Voice connection closed');
      setAudioActivity(false);
    }
  }, []);

  const handleMessage = useCallback((message: any) => {
    console.log('📨 Voice message received:', message);
    
    if (message.type === 'log') {
      addLog(`📝 ${message.data.message}`);
    } else if (message.type === 'transcript') {
      addLog(`👤 You: "${message.data.text}" (confidence: ${message.data.confidence || 'unknown'})`);
      toast.info(`You said: "${message.data.text}"`);
    } else if (message.type === 'ai_response') {
      const responseText = message.data.text || message.data;
      addLog(`🤖 AI: "${responseText}"`);
      setLastResponse(responseText);
      toast.success(`AI responded: "${responseText}"`);
    } else if (message.type === 'audio_response') {
      addLog(`🔊 Audio response received: "${message.data.text}"`);
      setAudioActivity(true);
      setTimeout(() => setAudioActivity(false), 2000);
    } else if (message.type === 'connection_established') {
      addLog(`🤝 Connected to assistant: ${message.data.assistant?.name || 'Unknown'}`);
    } else if (message.type === 'greeting_sent') {
      addLog(`👋 Greeting sent successfully`);
    } else {
      addLog(`📨 ${message.type}: ${JSON.stringify(message.data).substring(0, 100)}...`);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error(`Voice error: ${error}`);
    addLog(`❌ Error: ${error}`);
    console.error('Voice WebSocket Error:', error);
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-24), `[${timestamp}] ${message}`]); // Keep last 25 logs
  }, []);

  const {
    isConnected,
    isRecording,
    connectionState,
    connect,
    disconnect,
    sendTextMessage,
    requestGreeting
  } = useVoiceWebSocket({
    callId,
    assistantId,
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onError: handleError
  });

  const handleConnect = async () => {
    try {
      addLog('🔄 Requesting microphone access...');
      
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      
      addLog('🎤 Microphone access granted');
      addLog('🔄 Connecting to voice WebSocket...');
      
      await connect();
    } catch (error) {
      toast.error('Microphone access denied');
      addLog(`❌ Microphone access denied: ${error}`);
      console.error('Microphone Error:', error);
    }
  };

  const handleDisconnect = () => {
    addLog('🔄 Disconnecting...');
    disconnect();
    setLastResponse('');
    setAudioActivity(false);
  };

  const handleTestGreeting = () => {
    addLog('🔄 Requesting test greeting...');
    requestGreeting();
  };

  const handleTestMessage = () => {
    const testMessage = "Hello, can you hear me?";
    addLog(`🔄 Sending test message: ${testMessage}`);
    sendTextMessage(testMessage);
  };

  const getConnectionBadgeVariant = () => {
    switch (connectionState) {
      case 'connected': return 'default';
      case 'connecting': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getConnectionIcon = () => {
    if (connectionState === 'connecting') return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isConnected && isRecording) return <Mic className="h-4 w-4 text-green-500" />;
    if (isConnected) return <Volume2 className="h-4 w-4" />;
    return <MicOff className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connecting': return 'Connecting to voice service...';
      case 'connected': 
        if (isRecording) return 'Recording active - speak now';
        return 'Connected - microphone ready';
      case 'error': return 'Connection failed - check logs below';
      default: return 'Ready to connect';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getConnectionIcon()}
            Voice Interface
            {audioActivity && (
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
            )}
          </span>
          <Badge variant={getConnectionBadgeVariant()}>
            {connectionState}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700">{getStatusMessage()}</p>
          {isConnected && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                {isRecording ? 'Listening...' : 'Ready'}
              </span>
              {audioActivity && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-xs text-blue-600">Playing audio</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last AI Response */}
        {lastResponse && (
          <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
            <div className="text-sm font-medium text-blue-800">Last AI Response:</div>
            <div className="text-sm text-blue-700 mt-1">"{lastResponse}"</div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              disabled={connectionState === 'connecting'}
              className="flex-1"
            >
              {connectionState === 'connecting' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Connect Voice
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
              <PhoneOff className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          )}
        </div>

        {/* Test Controls */}
        {isConnected && (
          <div className="flex gap-2">
            <Button onClick={handleTestGreeting} variant="outline" size="sm">
              Test Greeting
            </Button>
            <Button onClick={handleTestMessage} variant="outline" size="sm">
              Test Message
            </Button>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'outline'}>
              WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRecording ? 'default' : 'outline'}>
              Recording: {isRecording ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Call Info */}
        {(callId || assistantId) && (
          <div className="text-sm text-gray-600 space-y-1">
            {callId && <div>Call ID: {callId}</div>}
            {assistantId && <div>Assistant ID: {assistantId}</div>}
          </div>
        )}

        {/* Live Logs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Live Logs:</h4>
          <div className="bg-gray-50 p-3 rounded-md max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm">No logs yet...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-xs font-mono text-gray-700">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>WebSocket URL: wss://csixccpoxpnwowbgkoyw.functions.supabase.co/functions/v1/voice-websocket</div>
          <div>Call ID: {callId || 'browser-test'}</div>
          <div>Assistant ID: {assistantId || 'demo'}</div>
        </div>

        {/* Instructions */}
        {!isConnected && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium">How to test:</div>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Connect Voice" to start the voice interface</li>
                <li>Allow microphone access when prompted</li>
                <li>The AI should automatically send a greeting</li>
                <li>Speak into your microphone or use test buttons</li>
                <li>Monitor the logs below to trace the audio pipeline</li>
                <li>Watch for audio activity indicators when AI speaks</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error State */}
        {connectionState === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <div className="font-medium">Connection Error</div>
              <p>Please check the logs above for details. Common issues:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Missing OpenAI API key in Supabase secrets</li>
                <li>Microphone permission denied</li>
                <li>Network connectivity issues</li>
                <li>Edge function deployment issues</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;
