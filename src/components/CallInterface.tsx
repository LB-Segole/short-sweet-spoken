
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Mic, Volume2, Activity, AlertCircle } from 'lucide-react';
import { Agent } from '../types/agent';
import { useCallOrchestrator } from '../hooks/useCallOrchestrator';

interface CallInterfaceProps {
  selectedAgent: Agent;
  onCallEnd: () => void;
}

export const CallInterface: React.FC<CallInterfaceProps> = ({ selectedAgent, onCallEnd }) => {
  const [phoneNumber, setPhoneNumber] = useState('+1234567890');
  
  // Get configuration from environment or defaults
  const config = {
    deepgramApiKey: import.meta.env.VITE_DEEPGRAM_API_KEY || '',
    signalwireConfig: {
      projectId: import.meta.env.VITE_SIGNALWIRE_PROJECT_ID || '',
      token: import.meta.env.VITE_SIGNALWIRE_TOKEN || '',
      spaceUrl: import.meta.env.VITE_SIGNALWIRE_SPACE_URL || '',
      phoneNumber: import.meta.env.VITE_SIGNALWIRE_PHONE_NUMBER || ''
    }
  };

  const { state, startCall, disconnect } = useCallOrchestrator(config);

  const handleStartCall = async () => {
    try {
      await startCall(selectedAgent, phoneNumber);
    } catch (error) {
      console.error('Call start failed:', error);
    }
  };

  const handleEndCall = () => {
    disconnect();
    onCallEnd();
  };

  const getStatusIcon = () => {
    if (state.error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (state.isSpeaking) return <Volume2 className="h-5 w-5 text-blue-500 animate-pulse" />;
    if (state.isListening) return <Mic className="h-5 w-5 text-green-500 animate-pulse" />;
    if (state.isConnected) return <Activity className="h-5 w-5 text-green-500" />;
    return <Phone className="h-5 w-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (state.error) return `Error: ${state.error}`;
    if (state.isSpeaking) return 'AI Speaking';
    if (state.isListening) return 'Listening';
    if (state.isConnected) return 'Connected';
    if (state.isActive) return 'Connecting...';
    return 'Ready to call';
  };

  const getStatusBadgeVariant = () => {
    if (state.error) return 'destructive';
    if (state.isActive) return 'default';
    return 'secondary';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold">Call Interface</h3>
              <p className="text-sm text-gray-600">Agent: {selectedAgent.name}</p>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Agent Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Active Agent Configuration</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span> {selectedAgent.name}
            </div>
            <div>
              <span className="text-gray-600">Personality:</span> {selectedAgent.personality}
            </div>
            <div>
              <span className="text-gray-600">Voice Model:</span> {selectedAgent.voiceSettings.model}
            </div>
            <div>
              <span className="text-gray-600">Speed:</span> {selectedAgent.voiceSettings.speed}x
            </div>
          </div>
          <div className="mt-2">
            <span className="text-gray-600">First Message:</span>
            <p className="text-sm mt-1 p-2 bg-white rounded border">
              {selectedAgent.firstMessage}
            </p>
          </div>
        </div>

        {/* Phone Number Input */}
        {!state.isActive && (
          <div>
            <Label htmlFor="phoneNumber">Phone Number to Call</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a valid phone number in E.164 format (e.g., +1234567890)
            </p>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex space-x-4">
          {!state.isActive ? (
            <>
              <Button 
                onClick={handleStartCall} 
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!phoneNumber.trim() || !config.deepgramApiKey || !config.signalwireConfig.projectId}
              >
                <Phone className="h-4 w-4 mr-2" />
                Start Call
              </Button>
              <Button 
                onClick={onCallEnd} 
                variant="outline"
                className="flex-1"
              >
                Back to Agents
              </Button>
            </>
          ) : (
            <Button 
              onClick={handleEndCall} 
              variant="destructive"
              className="flex-1"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
          )}
        </div>

        {/* Current Transcript */}
        {state.currentTranscript && (
          <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
            <div className="text-sm font-medium text-blue-800">Live Transcript:</div>
            <div className="text-sm text-blue-700 mt-1">"{state.currentTranscript}"</div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl mb-1 ${state.isConnected ? 'text-green-500' : 'text-gray-400'}`}>
              📡
            </div>
            <div className="text-xs font-medium">
              {state.isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl mb-1 ${state.isListening ? 'text-green-500' : 'text-gray-400'}`}>
              🎤
            </div>
            <div className="text-xs font-medium">
              {state.isListening ? 'Listening' : 'Idle'}
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded">
            <div className={`text-2xl mb-1 ${state.isSpeaking ? 'text-blue-500' : 'text-gray-400'}`}>
              🔊
            </div>
            <div className="text-xs font-medium">
              {state.isSpeaking ? 'Speaking' : 'Quiet'}
            </div>
          </div>
        </div>

        {/* Call Information */}
        {state.callSid && (
          <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">
            <div>Call SID: {state.callSid}</div>
            <div>Agent ID: {selectedAgent.id}</div>
          </div>
        )}

        {/* Live Logs */}
        <div>
          <h4 className="text-sm font-medium mb-2">Live Call Logs:</h4>
          <div className="bg-gray-900 text-green-400 p-3 rounded-md max-h-48 overflow-y-auto font-mono text-xs">
            {state.logs.length === 0 ? (
              <div className="text-gray-500">No logs yet... Start a call to see real-time activity</div>
            ) : (
              state.logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configuration Status */}
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.deepgramApiKey ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>DeepGram API Key: {config.deepgramApiKey ? 'Configured' : 'Missing'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${config.signalwireConfig.projectId ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>SignalWire Config: {config.signalwireConfig.projectId ? 'Configured' : 'Missing'}</span>
          </div>
        </div>

        {/* Configuration Warning */}
        {(!config.deepgramApiKey || !config.signalwireConfig.projectId) && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <div className="font-medium">Configuration Required</div>
              <p className="mt-1">Please set the following environment variables:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {!config.deepgramApiKey && <li>VITE_DEEPGRAM_API_KEY</li>}
                {!config.signalwireConfig.projectId && (
                  <>
                    <li>VITE_SIGNALWIRE_PROJECT_ID</li>
                    <li>VITE_SIGNALWIRE_TOKEN</li>
                    <li>VITE_SIGNALWIRE_SPACE_URL</li>
                    <li>VITE_SIGNALWIRE_PHONE_NUMBER</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
