
/**
 * Enhanced Voice Interface Component
 * 
 * This component demonstrates the new service layer architecture and provides:
 * - Robust WebSocket connections with automatic reconnection
 * - Backend abstraction (ready for Railway migration)
 * - Improved error handling and user feedback
 * - Enhanced connection state management
 * - Better audio processing and management
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Phone, PhoneOff, Volume2, AlertCircle, Activity, MessageSquare, Wifi, WifiOff } from 'lucide-react';
import { useEnhancedVoiceWebSocket } from '@/hooks/useEnhancedVoiceWebSocket';
import { useBackendService } from '@/hooks/useBackendService';
import { toast } from 'sonner';

interface EnhancedVoiceInterfaceProps {
  callId?: string;
  assistantId?: string;
  userId?: string;
  className?: string;
}

const EnhancedVoiceInterface: React.FC<EnhancedVoiceInterfaceProps> = ({
  callId,
  assistantId,
  userId = 'demo-user',
  className
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const { utils } = useBackendService();

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-29), `[${timestamp}] ${message}`]);
  }, []);

  const handleConnectionChange = useCallback((connected: boolean, state: any) => {
    if (connected) {
      toast.success('🔊 Enhanced voice connection established');
      addLog('✅ Enhanced voice connection established - ready for conversation');
    } else {
      if (state.error) {
        toast.error(`Connection lost: ${state.error}`);
        addLog(`❌ Connection lost: ${state.error}`);
      } else {
        toast.info('Voice connection closed');
        addLog('❌ Voice connection closed');
      }
    }
  }, [addLog]);

  const handleMessage = useCallback((message: any)  => {
    addLog(`📨 Message: ${message.type}`);
    
    if (message.type === 'connection_established') {
      addLog('🤝 Connected to AI assistant');
    } else if (message.type === 'greeting_sent') {
      if (message.data?.text) {
        setLastResponse(message.data.text);
        addLog(`👋 Greeting: "${message.data.text}"`);
      }
    }
  }, [addLog]);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    setLastTranscript(text);
    const status = isFinal ? 'FINAL' : 'interim';
    addLog(`👤 You (${status}): "${text}"`);
    
    if (isFinal) {
      toast.info(`You said: "${text}"`);
    }
  }, [addLog]);

  const handleAIResponse = useCallback((text: string) => {
    setLastResponse(text);
    addLog(`🤖 AI: "${text}"`);
    toast.success(`AI responded: "${text}"`);
  }, [addLog]);

  const handleError = useCallback((error: string) => {
    toast.error(`Voice error: ${error}`);
    addLog(`❌ Error: ${error}`);
    console.error('Enhanced Voice Error:', error);
  }, [addLog]);

  const {
    isConnected,
    isConnecting,
    isRecording,
    connectionState,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
    getBackendType
  } = useEnhancedVoiceWebSocket({
    userId,
    callId: callId || 'enhanced-test',
    assistantId: assistantId || 'enhanced-demo',
    onConnectionChange: handleConnectionChange,
    onMessage: handleMessage,
    onTranscript: handleTranscript,
    onAIResponse: handleAIResponse,
    onError: handleError
  });

  const handleConnect = async () => {
    try {
      addLog('🔄 Requesting microphone access...');
      
      // Test microphone access first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        } 
      });
      
      const tracks = stream.getTracks();
      addLog(`🎤 Microphone access granted - ${tracks.length} audio track(s)`);
      tracks.forEach(track => track.stop());
      
      addLog('🔄 Connecting to enhanced voice service...');
      await connect();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        toast.error('🎤 Microphone access denied');
        addLog(`❌ Microphone permission denied: ${errorMessage}`);
      } else {
        toast.error('Failed to connect to voice service');
        addLog(`❌ Connection error: ${errorMessage}`);
      }
    }
  };

  const handleDisconnect = () => {
    addLog('🔄 Disconnecting...');
    disconnect();
    setLastTranscript('');
    setLastResponse('');
  };

  const handleStartRecording = async () => {
    try {
      addLog('🎤 Starting voice recording...');
      await startRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Recording failed';
      toast.error(`Recording failed: ${errorMessage}`);
      addLog(`❌ Recording failed: ${errorMessage}`);
    }
  };

  const handleStopRecording = () => {
    addLog('🛑 Stopping voice recording...');
    stopRecording();
  };

  const handleTestMessage = () => {
    const testMessage = "Hello, this is a test message from the enhanced interface";
    addLog(`📤 Sending test message: "${testMessage}"`);
    try {
      sendTextMessage(testMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Send failed';
      toast.error(`Failed to send message: ${errorMessage}`);
      addLog(`❌ Send failed: ${errorMessage}`);
    }
  };

  const getConnectionBadgeVariant = () => {
    if (isConnected) return 'default';
    if (isConnecting) return 'secondary';
    if (error) return 'destructive';
    return 'outline';
  };

  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-4 w-4 animate-spin" />;
    if (isConnected && isRecording) return <Mic className="h-4 w-4 text-green-500" />;
    if (isConnected) return <Wifi className="h-4 w-4 text-green-500" />;
    if (error) return <WifiOff className="h-4 w-4 text-red-500" />;
    return <Volume2 className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (isConnecting) return 'Connecting to enhanced voice service...';
    if (isConnected && isRecording) return '🎤 Recording - speak now!';
    if (isConnected) return 'Connected - ready for enhanced voice chat';
    if (error) return `Error: ${error}`;
    return 'Ready to connect with enhanced reliability';
  };

  const backendType = getBackendType();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getConnectionIcon()}
            Enhanced Voice Interface
            {isRecording && (
              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
            )}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {backendType.toUpperCase()}
            </Badge>
            <Badge variant={getConnectionBadgeVariant()}>
              {isConnecting ? 'Connecting' : isConnected ? 'Connected' : error ? 'Error' : 'Disconnected'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enhanced Status Message */}
        <div className={`p-3 rounded-md border-l-4 ${
          isRecording ? 'bg-green-50 border-green-400' :
          isConnected ? 'bg-blue-50 border-blue-400' :
          error ? 'bg-red-50 border-red-400' :
          'bg-gray-50 border-gray-300'
        }`}>
          <p className="text-sm font-medium text-gray-700">{getStatusMessage()}</p>
          {connectionState.reconnectAttempt > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Reconnection attempt: {connectionState.reconnectAttempt}
            </p>
          )}
        </div>

        {/* Connection Quality Indicators */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 rounded text-center text-xs ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <Wifi className="h-3 w-3 mx-auto mb-1" />
            Connection
          </div>
          <div className={`p-2 rounded text-center text-xs ${
            isRecording ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <Mic className="h-3 w-3 mx-auto mb-1" />
            Recording
          </div>
          <div className={`p-2 rounded text-center text-xs ${
            lastResponse ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
          }`}>
            <MessageSquare className="h-3 w-3 mx-auto mb-1" />
            AI Response
          </div>
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
            <div className="text-sm font-medium text-blue-800">AI responded:</div>
            <div className="text-sm text-blue-700 mt-1">"{lastResponse}"</div>
          </div>
        )}

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!isConnected ? (
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Connect Enhanced Voice
                </>
              )}
            </Button>
          ) : (
            <>
              <Button onClick={handleDisconnect} variant="destructive" className="flex-1">
                <PhoneOff className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          )}
        </div>

        {/* Recording Controls */}
        {isConnected && (
          <div className="flex gap-2">
            {!isRecording ? (
              <Button onClick={handleStartRecording} variant="secondary" className="flex-1">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={handleStopRecording} variant="destructive" className="flex-1">
                <MicOff className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            )}
            <Button onClick={handleTestMessage} variant="outline" size="sm">
              Test Message
            </Button>
          </div>
        )}

        {/* Session Info */}
        <div className="text-sm text-gray-600 space-y-1 bg-gray-50 p-3 rounded">
          <div><strong>Backend:</strong> {backendType.toUpperCase()} {utils.isSupabase() ? '(Current)' : utils.isRailway() ? '(Railway)' : ''}</div>
          <div><strong>Call ID:</strong> {callId || 'enhanced-test'}</div>
          <div><strong>Assistant ID:</strong> {assistantId || 'enhanced-demo'}</div>
          <div><strong>User ID:</strong> {userId}</div>
          {connectionState.reconnectAttempt > 0 && (
            <div><strong>Reconnect Attempts:</strong> {connectionState.reconnectAttempt}</div>
          )}
        </div>

        {/* Enhanced Live Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Enhanced Activity Log:</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLogs([])}
              className="text-xs h-6 px-2"
            >
              Clear
            </Button>
          </div>
          <div className="bg-black text-green-400 p-3 rounded-md max-h-48 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500">Enhanced logging active - connect to see activity...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Instructions */}
        {!isConnected && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium">Enhanced Voice Chat Features:</div>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Automatic reconnection with exponential backoff</li>
                <li>Enhanced error handling and recovery</li>
                <li>Backend abstraction (ready for Railway migration)</li>
                <li>Improved audio processing and quality</li>
                <li>Better connection state management</li>
                <li>Comprehensive logging and debugging</li>
              </ul>
            </div>
          </div>
        )}

        {/* Migration Ready Notice */}
        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-md">
          <MessageSquare className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <div className="font-medium">Migration Ready Architecture:</div>
            <p className="mt-1">
              This interface uses a service layer that abstracts all backend calls. 
              To migrate to Railway, simply update the backend configuration - 
              no component changes needed!
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedVoiceInterface;
