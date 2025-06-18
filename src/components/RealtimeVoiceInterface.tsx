
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Loader2, Activity, MessageSquare } from 'lucide-react';
import { useRealtimeVoice } from '@/hooks/useRealtimeVoice';
import { toast } from 'sonner';

interface RealtimeVoiceInterfaceProps {
  callId?: string;
  assistantId?: string;
  userId?: string;
  className?: string;
}

const RealtimeVoiceInterface: React.FC<RealtimeVoiceInterfaceProps> = ({
  callId,
  assistantId,
  userId = 'demo-user',
  className
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      toast.success('Realtime voice connection established');
      addLog('✅ Realtime voice connection established');
    } else {
      toast.info('Realtime voice connection closed');
      addLog('❌ Realtime voice connection closed');
    }
  }, []);

  const handleMessage = useCallback((message: any) => {
    console.log('📨 Realtime voice message:', message);
    
    if (message.type === 'log') {
      addLog(`📝 ${message.data.message}`);
    } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = message.data?.transcript || '';
      setLastTranscript(transcript);
      addLog(`👤 You: "${transcript}"`);
      toast.info(`You said: "${transcript}"`);
    } else if (message.type === 'response.text.delta') {
      const textDelta = message.data?.delta || '';
      setLastResponse(prev => prev + textDelta);
    } else if (message.type === 'response.audio.delta') {
      addLog(`🔊 AI speaking (audio delta received)`);
    } else if (message.type === 'response.audio.done') {
      addLog(`✅ AI finished speaking`);
    } else if (message.type === 'response.done') {
      addLog(`🤖 Response completed`);
      if (lastResponse) {
        toast.success(`AI: "${lastResponse}"`);
      }
    } else if (message.type === 'connection_established') {
      addLog(`🤝 Connected to LavaBall assistant`);
    } else {
      addLog(`📨 ${message.type}: ${JSON.stringify(message.data || {}).substring(0, 100)}...`);
    }
  }, [lastResponse]);

  const handleError = useCallback((error: string) => {
    toast.error(`Realtime voice error: ${error}`);
    addLog(`❌ Error: ${error}`);
    console.error('Realtime Voice Error:', error);
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-24), `[${timestamp}] ${message}`]);
  }, []);

  const {
    isConnected,
    isRecording,
    isSpeaking,
    connectionState,
    connect,
    disconnect,
    sendTextMessage
  } = useRealtimeVoice({
    userId,
    callId,
    assistantId,
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onError: handleError
  });

  const handleConnect = async () => {
    try {
      addLog('🔄 Requesting microphone access for realtime voice...');
      
      // Request microphone permission first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      addLog('🎤 Microphone access granted');
      addLog('🔄 Connecting to realtime voice service...');
      
      await connect();
    } catch (error) {
      toast.error('Microphone access denied');
      addLog(`❌ Microphone access denied: ${error}`);
      console.error('Microphone Error:', error);
    }
  };

  const handleDisconnect = () => {
    addLog('🔄 Disconnecting from realtime voice...');
    disconnect();
    setLastTranscript('');
    setLastResponse('');
  };

  const handleTestMessage = () => {
    const testMessage = "Hello LavaBall, can you hear me?";
    addLog(`🔄 Sending test message: ${testMessage}`);
    sendTextMessage(testMessage);
    setLastResponse(''); // Reset to capture new response
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
      case 'connecting': return 'Connecting to LavaBall realtime voice...';
      case 'connected': 
        if (isSpeaking) return 'LavaBall is speaking...';
        if (isRecording) return 'Listening - speak now';
        return 'Connected - ready for conversation';
      case 'error': return 'Connection failed - check logs below';
      default: return 'Ready to connect to LavaBall';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getConnectionIcon()}
            LavaBall Realtime Voice
            {isSpeaking && (
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
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                {isRecording ? 'Listening...' : 'Ready'}
              </span>
              {isSpeaking && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-xs text-blue-600">LavaBall speaking</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last Transcript */}
        {lastTranscript && (
          <div className="p-3 bg-green-50 rounded-md border-l-4 border-green-400">
            <div className="text-sm font-medium text-green-800">You said:</div>
            <div className="text-sm text-green-700 mt-1">"{lastTranscript}"</div>
          </div>
        )}

        {/* Last AI Response */}
        {lastResponse && (
          <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
            <div className="text-sm font-medium text-blue-800">LavaBall responded:</div>
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
                  Connect to LavaBall
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
            <Button onClick={handleTestMessage} variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Test Message
            </Button>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-2">
          <Badge variant={isConnected ? 'default' : 'outline'} className="justify-center">
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant={isRecording ? 'default' : 'outline'} className="justify-center">
            {isRecording ? 'Recording' : 'Silent'}
          </Badge>
          <Badge variant={isSpeaking ? 'default' : 'outline'} className="justify-center">
            {isSpeaking ? 'AI Speaking' : 'AI Silent'}
          </Badge>
        </div>

        {/* Session Info */}
        <div className="text-sm text-gray-600 space-y-1">
          <div>Call ID: {callId || 'browser-test'}</div>
          <div>Assistant: LavaBall (Realtime)</div>
          <div>User ID: {userId}</div>
        </div>

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
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium">How to use LavaBall Realtime Voice:</div>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Connect to LavaBall" to start realtime voice chat</li>
                <li>Allow microphone access when prompted</li>
                <li>LavaBall will greet you automatically</li>
                <li>Speak naturally - LavaBall uses voice activity detection</li>
                <li>Watch the status indicators for real-time feedback</li>
                <li>Use the test message button for text input</li>
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

export default RealtimeVoiceInterface;
