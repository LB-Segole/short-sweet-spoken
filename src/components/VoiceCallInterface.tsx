
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneOff, Mic, Volume2, AlertCircle } from 'lucide-react';
import { useVoiceOrchestrator } from '../hooks/useVoiceOrchestrator';
import CallTroubleshooting from './CallTroubleshooting';

interface VoiceCallInterfaceProps {
  deepgramApiKey: string;
  signalwireConfig: {
    projectId: string;
    token: string;
    spaceUrl: string;
    phoneNumber: string;
  };
}

const VoiceCallInterface: React.FC<VoiceCallInterfaceProps> = ({
  deepgramApiKey,
  signalwireConfig
}) => {
  const [phoneNumber, setPhoneNumber] = useState('+1234567890');
  const [callSid, setCallSid] = useState<string | null>(null);
  const [lastCallStatus, setLastCallStatus] = useState<string>('');
  const [sipResultCode, setSipResultCode] = useState<string>('');

  const {
    state,
    connect,
    disconnect,
    initiateCall
  } = useVoiceOrchestrator({
    deepgramApiKey,
    signalwireConfig
  });

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleInitiateCall = async () => {
    try {
      const webhookUrl = `${window.location.origin}/supabase/functions/v1/call-webhook`;
      
      const sid = await initiateCall(phoneNumber, webhookUrl);
      setCallSid(sid);
      setLastCallStatus('initiated');
      setSipResultCode('');
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setLastCallStatus('failed');
    }
  };

  const handleEndCall = () => {
    disconnect();
    setCallSid(null);
    if (lastCallStatus !== 'completed') {
      setLastCallStatus('canceled');
    }
  };

  const getStatusBadgeVariant = () => {
    if (state.error) return 'destructive';
    if (state.isConnected) return 'default';
    return 'secondary';
  };

  const getStatusText = () => {
    if (state.error) return `Error: ${state.error}`;
    if (state.isSpeaking) return 'AI Speaking';
    if (state.isListening) return 'Listening';
    if (state.isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Voice Call Interface
            </span>
            <Badge variant={getStatusBadgeVariant()}>
              {getStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Phone Number Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="+1234567890"
              disabled={state.isConnected}
            />
          </div>

          {/* Connection Controls */}
          <div className="flex gap-2">
            {!state.isConnected ? (
              <Button onClick={handleConnect} className="flex-1">
                <Volume2 className="h-4 w-4 mr-2" />
                Connect Voice
              </Button>
            ) : (
              <>
                <Button 
                  onClick={handleInitiateCall} 
                  disabled={!!callSid}
                  className="flex-1"
                  variant="default"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Start Call
                </Button>
                <Button 
                  onClick={handleEndCall} 
                  variant="destructive"
                  className="flex-1"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Call
                </Button>
              </>
            )}
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center p-2 bg-gray-50 rounded">
              <Mic className={`h-4 w-4 mr-2 ${state.isListening ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {state.isListening ? 'Listening' : 'Idle'}
              </span>
            </div>
            <div className="flex items-center justify-center p-2 bg-gray-50 rounded">
              <Volume2 className={`h-4 w-4 mr-2 ${state.isSpeaking ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {state.isSpeaking ? 'Speaking' : 'Quiet'}
              </span>
            </div>
          </div>

          {/* Current Transcript */}
          {state.currentTranscript && (
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="text-sm font-medium text-blue-800 mb-1">Current Transcript:</div>
              <div className="text-sm text-blue-700">"{state.currentTranscript}"</div>
            </div>
          )}

          {/* Call Information */}
          {callSid && (
            <div className="text-xs text-gray-600">
              Call SID: {callSid}
            </div>
          )}

          {/* Error Display */}
          {state.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">{state.error}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Component */}
      <CallTroubleshooting 
        lastCallStatus={lastCallStatus}
        sipResultCode={sipResultCode}
      />
    </div>
  );
};

export default VoiceCallInterface;
