
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, PhoneCall, PhoneOff, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';
import { Assistant } from '@/types/assistant';
import VoiceInterface from '@/components/VoiceInterface';

interface CallInterfaceProps {
  assistants: Assistant[];
}

type CallStatus = 'idle' | 'initiating' | 'calling' | 'in-call' | 'ended';

const CallInterface: React.FC<CallInterfaceProps> = ({ assistants }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const selectedAssistant = assistants.find(a => a.id === selectedAssistantId);

  // Subscribe to call updates when a call is active
  useEffect(() => {
    if (!currentCallId) return;

    console.log('Subscribing to call updates for:', currentCallId);
    
    const channel = supabase
      .channel(`call-updates-${currentCallId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `signalwire_call_id=eq.${currentCallId}`
        },
        (payload) => {
          console.log('Call status update:', payload.new);
          const newStatus = payload.new?.status;
          
          if (newStatus === 'ringing' || newStatus === 'calling') {
            setCallStatus('calling');
            setStatusMessage('Phone is ringing...');
          } else if (newStatus === 'in-progress') {
            setCallStatus('in-call');
            setStatusMessage('Call connected and in progress');
          } else if (newStatus === 'completed' || newStatus === 'busy' || newStatus === 'no-answer' || newStatus === 'failed') {
            setCallStatus('ended');
            setStatusMessage(`Call ${newStatus}`);
            // Reset after 3 seconds
            setTimeout(() => {
              setCallStatus('idle');
              setCurrentCallId(null);
              setPhoneNumber('');
              setSelectedAssistantId('');
              setStatusMessage('');
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Unsubscribing from call updates');
      supabase.removeChannel(channel);
    };
  }, [currentCallId]);

  const handleMakeCall = async () => {
    if (!phoneNumber.trim()) {
      showErrorToast('Please enter a phone number');
      return;
    }

    if (!selectedAssistantId) {
      showErrorToast('Please select an AI agent');
      return;
    }

    try {
      setCallStatus('initiating');
      setStatusMessage('Preparing call request...');

      // Validate phone number format
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      if (cleanNumber.length < 10) {
        showErrorToast('Please enter a valid phone number');
        setCallStatus('idle');
        setStatusMessage('');
        return;
      }

      console.log('Making call with assistant:', selectedAssistant?.name);
      
      const callParams = {
        phoneNumber: phoneNumber,
        assistantId: selectedAssistantId,
        campaignId: null,
        contactId: null
      };

      console.log('Call parameters:', callParams);
      
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: callParams
      });

      console.log('Call response:', { data, error });

      if (error) {
        console.error('Call error:', error);
        setCallStatus('idle');
        setStatusMessage('');
        throw error;
      }

      if (data?.success) {
        console.log('Call initiated successfully, SignalWire ID:', data.callId);
        setCurrentCallId(data.callId);
        setCallStatus('calling');
        setStatusMessage('Call initiated, dialing...');
        showSuccessToast(`Call initiated! Calling ${phoneNumber} with ${selectedAssistant?.name}...`);
      } else {
        setCallStatus('idle');
        setStatusMessage('');
        throw new Error(data?.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      setCallStatus('idle');
      setStatusMessage('');
      showErrorToast('Failed to initiate call');
    }
  };

  const handleEndCall = async () => {
    if (!currentCallId) return;

    try {
      console.log('Ending call:', currentCallId);
      setStatusMessage('Ending call...');
      
      const { data, error } = await supabase.functions.invoke('end-call', {
        body: { callId: currentCallId }
      });

      if (error) {
        console.error('Error ending call via edge function:', error);
        // Don't throw error, just continue with UI reset
      }

      if (data?.success) {
        setStatusMessage('Call ended successfully');
        showSuccessToast('Call ended successfully');
      } else {
        setStatusMessage('Call ended');
        // Still show success since call might already be ended
        showSuccessToast('Call ended');
      }
      
      // Reset UI regardless of API response
      setTimeout(() => {
        setCallStatus('idle');
        setCurrentCallId(null);
        setPhoneNumber('');
        setSelectedAssistantId('');
        setStatusMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error ending call:', error);
      setStatusMessage('Call ended');
      showSuccessToast('Call ended');
      
      // Still reset the UI
      setTimeout(() => {
        setCallStatus('idle');
        setCurrentCallId(null);
        setPhoneNumber('');
        setSelectedAssistantId('');
        setStatusMessage('');
      }, 2000);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length >= 10) {
      const country = digits.length > 10 ? digits.slice(0, -10) : '1';
      const area = digits.slice(-10, -7);
      const prefix = digits.slice(-7, -4);
      const line = digits.slice(-4);
      
      let formatted = `+${country}`;
      if (area) formatted += ` (${area}`;
      if (prefix) formatted += `) ${prefix}`;
      if (line) formatted += `-${line}`;
      
      return formatted;
    }
    
    return value;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getButtonConfig = () => {
    switch (callStatus) {
      case 'initiating':
        return {
          text: 'Initiating...',
          icon: PhoneCall,
          disabled: true,
          variant: 'default' as const
        };
      case 'calling':
        return {
          text: 'Calling...',
          icon: PhoneCall,
          disabled: true,
          variant: 'default' as const
        };
      case 'in-call':
        return {
          text: 'In Call...',
          icon: PhoneCall,
          disabled: true,
          variant: 'destructive' as const
        };
      case 'ended':
        return {
          text: 'Call Ended',
          icon: PhoneOff,
          disabled: true,
          variant: 'secondary' as const
        };
      default:
        return {
          text: 'Make Call',
          icon: Phone,
          disabled: false,
          variant: 'default' as const
        };
    }
  };

  const buttonConfig = getButtonConfig();
  const ButtonIcon = buttonConfig.icon;

  const showEndCallButton = callStatus === 'calling' || callStatus === 'in-call';

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-blue-600" />
          Voice AI Interface
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="outbound" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outbound">Outbound Calls</TabsTrigger>
            <TabsTrigger value="browser">Browser Voice Test</TabsTrigger>
          </TabsList>
          
          <TabsContent value="outbound" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assistant-select">Select AI Agent</Label>
              <Select 
                value={selectedAssistantId} 
                onValueChange={setSelectedAssistantId}
                disabled={callStatus !== 'idle'}
              >
                <SelectTrigger id="assistant-select">
                  <SelectValue placeholder="Choose an AI agent for the call" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{assistant.name}</span>
                        <span className="text-xs text-gray-500">
                          {assistant.voice_provider} • {assistant.model}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAssistant && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm font-medium text-gray-700 mb-1">Selected Agent:</p>
                <p className="text-sm text-gray-600 mb-2">{selectedAssistant.name}</p>
                <p className="text-xs text-gray-500">
                  First message: "{selectedAssistant.first_message || 'Default greeting'}"
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone-number">Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                disabled={callStatus !== 'idle'}
              />
              <p className="text-xs text-gray-500">
                Enter the phone number to call. This is a real call with no time limits.
              </p>
            </div>

            {/* Call Status Indicator */}
            {callStatus !== 'idle' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {statusMessage || 'Processing...'}
                  </span>
                </div>
              </div>
            )}

            {/* Call Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleMakeCall}
                className="flex-1"
                disabled={buttonConfig.disabled || !phoneNumber.trim() || !selectedAssistantId}
                variant={buttonConfig.variant}
              >
                <ButtonIcon className="w-4 h-4 mr-2" />
                {buttonConfig.text}
              </Button>

              {showEndCallButton && (
                <Button
                  onClick={handleEndCall}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </Button>
              )}
            </div>

            {assistants.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">No AI agents available</p>
                <p className="text-gray-400 text-xs">Create an AI agent first to make calls</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="browser" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mic className="h-4 w-4" />
                <span>Test voice AI directly in your browser</span>
              </div>
              
              <VoiceInterface 
                callId="browser-test"
                assistantId={selectedAssistantId || 'demo'}
                className="border-0 shadow-none"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CallInterface;
