
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Loader2, Activity } from 'lucide-react';
import { useVoiceOrchestrator } from '../hooks/useVoiceOrchestrator';
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
  const [audioActivity, setAudioActivity] = useState(false);

  // DeepGram configuration - these should come from environment variables
  const config = {
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || '',
    signalwireConfig: {
      projectId: import.meta.env.VITE_SIGNALWIRE_PROJECT_ID || '',
      token: import.meta.env.VITE_SIGNALWIRE_TOKEN || '',
      spaceUrl: import.meta.env.VITE_SIGNALWIRE_SPACE_URL || '',
      phoneNumber: import.meta.env.VITE_SIGNALWIRE_PHONE_NUMBER || ''
    }
  };

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (connected) {
      toast.success('Voice connection established with DeepGram');
      addLog('✅ Voice connection established with DeepGram');
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
      addLog(`🤝 Connected to DeepGram assistant: ${message.data.assistant?.name || 'Unknown'}`);
    } else if (message.type === 'greeting_sent') {
      addLog(`👋 Greeting sent successfully via DeepGram TTS`);
    } else {
      addLog(`📨 ${message.type}: ${JSON.stringify(message.data).substring(0, 100)}...`);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    toast.error(`Voice error: ${error}`);
    addLog(`❌ Error: ${error}`);
    console.error('Voice Error:', error);
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-24), `[${timestamp}] ${message}`]);
  }, []);

  const {
    state,
    connect,
    disconnect,
    handleSignalWireStream,
    initiateCall
  } = useVoiceOrchestrator({
    ...config,
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onError: handleError
  });

  const handleConnect = async () => {
    try {
      addLog('🔄 Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      addLog('🎤 Microphone access granted');
      addLog('🔄 Connecting to DeepGram voice services...');
      
      await connect();
    } catch (error) {
      toast.error('Microphone access denied');
      addLog(`❌ Microphone access denied: ${error}`);
      console.error('Microphone Error:', error);
    }
  };

  const handleDisconnect = () => {
    addLog('🔄 Disconnecting from DeepGram...');
    disconnect();
    setLastResponse('');
    setAudioActivity(false);
  };

  const handleTestCall = async () => {
    const testNumber = '+1234567890'; // Replace with actual test number
    addLog(`🔄 Initiating test call to ${testNumber}...`);
    try {
      const webhookUrl = `${window.location.origin}/api/signalwire/webhook`;
      const streamUrl = `wss://${window.location.host}/deepgram-voice-stream`;
      await initiateCall(testNumber, webhookUrl, streamUrl);
      addLog('✅ Test call initiated successfully');
    } catch (error) {
      addLog(`❌ Test call failed: ${error}`);
    }
  };

  const getConnectionBadgeVariant = () => {
    if (state.error) return 'destructive';
    if (state.isConnected) return 'default';
    return 'secondary';
  };

  const getConnectionIcon = () => {
    if (state.isConnected && state.isListening) return <Mic className="h-4 w-4 text-green-500" />;
    if (state.isConnected) return <Volume2 className="h-4 w-4" />;
    return <MicOff className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (state.error) return `Error: ${state.error}`;
    if (state.isSpeaking) return 'AI speaking via DeepGram TTS';
    if (state.isListening) return 'Listening via DeepGram STT';
    if (state.isConnected) return 'Connected to DeepGram services';
    return 'Ready to connect to DeepGram';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getConnectionIcon()}
            DeepGram Voice Interface
            {audioActivity && (
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
            )}
          </span>
          <Badge variant={getConnectionBadgeVariant()}>
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-700">{getStatusMessage()}</p>
          {state.isConnected && (
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${state.isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                {state.isListening ? 'Listening...' : 'Ready'}
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
          {!state.isConnected ? (
            <Button onClick={handleConnect} className="flex-1">
              <Phone className="h-4 w-4 mr-2" />
              Connect to DeepGram
            </Button>
          ) : (
            <>
              <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
                <PhoneOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
              <Button onClick={handleTestCall} variant="outline" className="flex-1">
                Test Call
              </Button>
            </>
          )}
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant={state.isConnected ? 'default' : 'outline'}>
              DeepGram: {state.isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={state.isListening ? 'default' : 'outline'}>
              STT: {state.isListening ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Call Info */}
        {(callId || assistantId) && (
          <div className="text-sm text-gray-600 space-y-1">
            {callId && <div>Call ID: {callId}</div>}
            {assistantId && <div>Assistant ID: {assistantId}</div>}
            <div>User ID: {userId}</div>
            <div>Powered by: DeepGram STT + TTS</div>
          </div>
        )}

        {/* Live Logs */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Live Logs (DeepGram):</h4>
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
        {!state.isConnected && (
          <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-800">
              <div className="font-medium">DeepGram-Only Implementation:</div>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Click "Connect to DeepGram" to initialize STT and TTS</li>
                <li>Allow microphone access when prompted</li>
                <li>The AI uses DeepGram for both speech recognition and synthesis</li>
                <li>No OpenAI dependency - fully powered by DeepGram</li>
                <li>Real-time bidirectional audio processing</li>
              </ol>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800">
              <div className="font-medium">DeepGram Connection Error</div>
              <p>Error: {state.error}</p>
              <p className="mt-1">Please check:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>DeepGram API key is configured in environment</li>
                <li>Microphone permissions are granted</li>
                <li>Network connectivity to DeepGram services</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VoiceInterface;
