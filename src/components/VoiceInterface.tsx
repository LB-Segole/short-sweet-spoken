
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Activity } from 'lucide-react';
import { useVoiceWebSocket } from '../hooks/useVoiceWebSocket';
import { toast } from 'sonner';

interface VoiceInterfaceProps {
  callId?: string;
  assistantId?: string;
  userId?: string;
  className?: string;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  callId,
  assistantId,
  userId = 'demo-user',
  className
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [lastResponse, setLastResponse] = useState<string>('');

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-24), `[${timestamp}] ${message}`]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      toast.success('Voice connection established');
      addLog('✅ Voice connection established');
    } else {
      toast.info('Voice connection closed');
      addLog('❌ Voice connection closed');
    }
  }, [addLog]);

  const handleError = useCallback((error: string) => {
    toast.error(`Voice error: ${error}`);
    addLog(`❌ Error: ${error}`);
    console.error('Voice Error:', error);
  }, [addLog]);

  const handleMessage = useCallback((message: any) => {
    if (message.type === 'text_response' && message.text) {
      setLastResponse(message.text);
      addLog(`🤖 AI: ${message.text}`);
    } else if (message.type === 'greeting_sent' && message.text) {
      setLastResponse(message.text);
      addLog(`👋 Greeting: ${message.text}`);
    }
  }, [addLog]);

  const {
    isConnected,
    isRecording,
    connectionState,
    connect,
    disconnect,
    sendTextMessage,
    requestGreeting
  } = useVoiceWebSocket({
    userId,
    callId: callId || 'browser-test',
    assistantId: assistantId || 'demo',
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onError: handleError
  });

  const handleConnect = async () => {
    try {
      addLog('🔄 Requesting microphone access...');
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      addLog('🎤 Microphone access granted');
      addLog('🔄 Connecting to voice services...');
      
      await connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Microphone access denied');
      addLog(`❌ Microphone access denied: ${errorMessage}`);
      handleError(`Microphone access denied: ${errorMessage}`);
    }
  };

  const handleDisconnect = () => {
    addLog('🔄 Disconnecting...');
    disconnect();
    setLastResponse('');
  };

  const handleTestGreeting = () => {
    addLog('🔄 Requesting greeting...');
    requestGreeting();
  };

  const handleTestMessage = () => {
    const testMessage = "Hello, how are you today?";
    addLog(`📤 Sending: ${testMessage}`);
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
    if (isConnected && isRecording) return <Mic className="h-4 w-4 text-green-500" />;
    if (isConnected) return <Volume2 className="h-4 w-4" />;
    return <MicOff className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connecting': return 'Connecting to voice services...';
      case 'connected': 
        if (isRecording) return 'Listening for voice input';
        return 'Connected - ready for voice interaction';
      case 'error': return 'Connection error - please try again';
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
            {isRecording && (
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
            )}
          </span>
          <Badge variant={getConnectionBadgeVariant()}>
            {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
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
                {isRecording ? 'Recording...' : 'Ready'}
              </span>
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
            <Button onClick={handleConnect} className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <>
              <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
                <PhoneOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
              <Button onClick={handleTestGreeting} variant="outline">
                Test Greeting
              </Button>
              <Button onClick={handleTestMessage} variant="outline">
                Test Message
              </Button>
            </>
          )}
        </div>

        {/* Call Info */}
        {(callId || assistantId) && (
          <div className="text-sm text-gray-600 space-y-1">
            {callId && <div>Call ID: {callId}</div>}
            {assistantId && <div>Assistant ID: {assistantId}</div>}
            <div>User ID: {userId}</div>
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

        {/* Instructions */}
        {!isConnected && (
          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <div className="font-medium">Voice Interface:</div>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Connect" to initialize voice services</li>
                <li>Allow microphone access when prompted</li>
                <li>Test the connection with greeting or message buttons</li>
                <li>Real-time voice processing will be enabled</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;
