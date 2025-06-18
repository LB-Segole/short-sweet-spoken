import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Phone, Play, Pause, Square, Mic, MicOff, AlertCircle } from 'lucide-react';
import CallVisualization from '@/components/CallCenter/CallVisualization';
import CampaignForm from '@/components/CallCenter/CampaignForm';
import ContactUploader from '@/components/CallCenter/ContactUploader';
import { CallVerificationPanel } from '@/components/CallCenter/CallVerificationPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCallVerification } from '@/hooks/useCallVerification';

type CallStatus = 'idle' | 'calling' | 'connected' | 'completed';

const CallCenter = () => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [currentContact, setCurrentContact] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  
  const { startVerification } = useCallVerification();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'calling' || callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const validatePhoneNumber = (number: string): boolean => {
    const cleanedNumber = number.replace(/\D/g, '');
    return cleanedNumber.length >= 10;
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    
    if (phoneNumber.length >= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    } else if (phoneNumber.length >= 3) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return phoneNumber;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError('');
  };

  const startCall = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number');
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Clean and format phone number
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      let formattedNumber = cleanedNumber;
      if (!formattedNumber.startsWith('1') && formattedNumber.length === 10) {
        formattedNumber = '1' + formattedNumber;
      }
      formattedNumber = '+' + formattedNumber;

      console.log('Initiating call to:', formattedNumber);
      
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: {
          phoneNumber: formattedNumber,
          campaignId: null,
          contactId: null,
          assistantId: null,
          squadId: null
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initiate call');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Call failed');
      }

      setIsCallActive(true);
      setCallStatus('calling');
      setCurrentContact(formattedNumber);
      setCallDuration(0);
      setCurrentCallId(data.dbCallId);
      
      // Start ring verification
      if (data.dbCallId) {
        try {
          await startVerification(data.dbCallId, formattedNumber);
          console.log('✅ Ring verification started for call:', data.dbCallId);
        } catch (verificationError) {
          console.error('Failed to start ring verification:', verificationError);
        }
      }
      
      toast.success('Call initiated with ring verification!');
      
      // Simulate call connection after 3 seconds
      setTimeout(() => {
        setCallStatus('connected');
        toast.success('Call connected!');
      }, 3000);
    } catch (error) {
      console.error('Error starting call:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to start call';
      setError(errorMsg);
      toast.error(`Failed to start call: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const endCall = () => {
    setIsCallActive(false);
    setCallStatus('completed');
    setCurrentCallId(null);
    toast.success('Call ended');
    
    setTimeout(() => {
      setCallStatus('idle');
      setCallDuration(0);
      setCurrentContact('');
    }, 2000);
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    toast.info(isMuted ? 'Unmuted' : 'Muted');
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Call Center</h1>
        <p className="text-gray-600">Manage your AI-powered calling campaigns</p>
      </div>

      {/* Call Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone size={20} />
            Live Call Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Phone Number Input */}
            {!isCallActive && (
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className={`flex-1 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
                    maxLength={14}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={startCall} 
                    className="bg-green-600 hover:bg-green-700 px-6"
                    disabled={!validatePhoneNumber(phoneNumber) || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play size={16} className="mr-2" />
                        Start Call
                      </>
                    )}
                  </Button>
                </div>
                {error && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Call Status Display */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Status: <span className={`font-medium capitalize ${
                    callStatus === 'connected' ? 'text-green-600' : 
                    callStatus === 'calling' ? 'text-yellow-600' : 
                    callStatus === 'completed' ? 'text-blue-600' : 'text-gray-600'
                  }`}>{callStatus}</span>
                </p>
                {currentContact && (
                  <p className="text-sm text-gray-600">Contact: <span className="font-medium">{currentContact}</span></p>
                )}
                {callDuration > 0 && (
                  <p className="text-sm text-gray-600">Duration: <span className="font-medium">{formatDuration(callDuration)}</span></p>
                )}
              </div>
              
              {isCallActive && (
                <div className="flex gap-2">
                  <Button onClick={toggleMute} variant="outline" className={isMuted ? 'bg-red-100' : ''}>
                    {isMuted ? <MicOff size={16} className="mr-2" /> : <Mic size={16} className="mr-2" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button onClick={endCall} variant="destructive">
                    <Square size={16} className="mr-2" />
                    End Call
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call Verification Panel */}
      <CallVerificationPanel 
        callId={currentCallId || undefined} 
        phoneNumber={currentContact || phoneNumber}
      />

      {/* Call Visualization */}
      {isCallActive && <CallVisualization callStatus={callStatus} isMuted={isMuted} />}

      {/* Campaign Management */}
      <div className="grid md:grid-cols-2 gap-8">
        <CampaignForm />
        <ContactUploader />
      </div>
    </div>
  );
};

export default CallCenter;
