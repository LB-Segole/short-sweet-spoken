
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Activity, Bug } from 'lucide-react';
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
  const [debugMode, setDebugMode] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-24), `[${timestamp}] ${message}`]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      toast.success('Voice connection established');
      addLog('✅ Voice connection established - ready for conversation');
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
    if (message.type === 'text_response' && message.data?.text) {
      setLastResponse(message.data.text);
      addLog(`🤖 AI: ${message.data.text}`);
    } else if (message.type === 'ai_response' && message.data?.text) {
      setLastResponse(message.data.text);
      addLog(`🤖 AI Response: ${message.data.text}`);
    } else if (message.type === 'greeting_sent' && message.data?.text) {
      setLastResponse(message.data.text);
      addLog(`👋 Greeting: ${message.data.text}`);
    } else if (message.type === 'transcript' && message.data?.text) {
      addLog(`📝 You said: ${message.data.text}`);
    } else if (message.type === 'connection_established') {
      addLog(`🔗 Connection established with assistant: ${message.data?.assistant?.name || 'Default'}`);
    } else if (debugMode && message.type === 'log') {
      addLog(`🔧 Debug: ${message.data?.message}`);
    }
  }, [addLog, debugMode]);

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
      
      // Enhanced microphone permission check
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Match Deepgram preferred rate
        } 
      });
      
      // Test the stream briefly
      const tracks = stream.getTracks();
      addLog(`🎤 Microphone access granted - ${tracks.length} audio track(s) detected`);
      tracks.forEach(track => {
        addLog(`🎧 Audio track: ${track.label} (${track.kind})`);
        track.stop();
      });
      
      addLog('🔄 Connecting to voice services...');
      await connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Permission denied')) {
        toast.error('Microphone access denied - please allow microphone access and try again');
        addLog(`❌ Microphone permission denied: ${errorMessage}`);
      } else {
        toast.error('Failed to access microphone');
        addLog(`❌ Microphone error: ${errorMessage}`);
      }
      handleError(`Microphone access failed: ${errorMessage}`);
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
        if (isRecording) return 'Listening for voice input - speak now!';
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugMode(!debugMode)}
              className="h-6 w-6 p-0"
            >
              <Bug className={`h-3 w-3 ${debugMode ? 'text-blue-500' : 'text-gray-400'}`} />
            </Button>
            <Badge variant={getConnectionBadgeVariant()}>
              {connectionState.charAt(0).toUpperCase() + connectionState.slice(1)}
            </Badge>
          </div>
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
                {isRecording ? 'Recording audio continuously...' : 'Microphone ready'}
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
              Connect & Test Voice
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
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Live Logs:</h4>
            {debugMode && <span className="text-xs text-blue-600">Debug mode enabled</span>}
          </div>
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

        {/* Enhanced Instructions */}
        {!isConnected && (
          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <div className="font-medium">Voice Interface Test:</div>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Connect & Test Voice" to initialize</li>
                <li>Allow microphone access when prompted</li>
                <li>Wait for "Listening for voice input" status</li>
                <li>Speak clearly: "Hello, how are you?"</li>
                <li>Watch logs for STT → AI → TTS flow</li>
                <li>Verify AI responds with voice</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connection Troubleshooting */}
        {connectionState === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <div className="font-medium">Connection Failed - Check:</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Microphone permissions are granted</li>
                <li>Network connection is stable</li>
                <li>OpenAI API key is configured</li>
                <li>Deepgram API key is available</li>
                <li>Check browser console for detailed errors</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;
