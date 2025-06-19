import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';
import CallVisualization from '@/components/CallCenter/CallVisualization';
import CampaignForm from '@/components/CallCenter/CampaignForm';
import ContactUploader from '@/components/CallCenter/ContactUploader';
import { CallVerificationPanel } from '@/components/CallCenter/CallVerificationPanel';
import { CallControls } from '@/components/CallCenter/CallControls';
import { CallStatusDisplay } from '@/components/CallCenter/CallStatusDisplay';
import { CallActionButtons } from '@/components/CallCenter/CallActionButtons';
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

      console.log('🔄 Initiating call to:', formattedNumber);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      console.log('🔐 Authentication token available:', !!session.access_token);

      // Create a demo assistant if none exists
      const { data: assistants } = await supabase
        .from('assistants')
        .select('id')
        .limit(1);

      let assistantId = assistants?.[0]?.id;
      
      if (!assistantId) {
        console.log('🤖 Creating demo assistant...');
        const { data: newAssistant, error: assistantError } = await supabase
          .from('assistants')
          .insert({
            name: 'Demo Assistant',
            system_prompt: 'You are a helpful AI assistant for phone calls.',
            first_message: 'Hello! This is your AI assistant. How can I help you today?',
            voice_provider: 'deepgram',
            voice_id: 'aura-asteria-en',
            model: 'gpt-4o'
          })
          .select('id')
          .single();

        if (assistantError) {
          console.error('Failed to create demo assistant:', assistantError);
          throw new Error('Failed to create demo assistant');
        }
        
        assistantId = newAssistant.id;
        console.log('✅ Demo assistant created:', assistantId);
      }

      const callParams = {
        phoneNumber: formattedNumber,
        assistantId: assistantId,
        campaignId: null,
        contactId: null
      };

      console.log('📞 Call parameters:', callParams);
      console.log('🔗 Making request to make-outbound-call function...');
      
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: callParams,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('📡 Function response received:', { data, error });

      if (error) {
        console.error('📞 Supabase function error:', error);
        throw new Error(`Function error: ${error.message || error}`);
      }

      if (data?.success) {
        console.log('📞 Call initiated successfully, Call ID:', data.callId);
        setCurrentCallId(data.callId);
        setIsCallActive(true);
        setCallStatus('calling');
        setCurrentContact(formattedNumber);
        setCallDuration(0);
        
        // Start ring verification
        if (data.callId) {
          try {
            await startVerification(data.callId, formattedNumber);
            console.log('✅ Ring verification started for call:', data.callId);
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
      } else {
        console.error('📞 Call initiation failed:', data);
        throw new Error(data?.error || 'Failed to initiate call - no success response');
      }
    } catch (error) {
      console.error('❌ Error starting call:', error);
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
              <CallControls
                phoneNumber={phoneNumber}
                onPhoneChange={handlePhoneChange}
                onStartCall={startCall}
                isLoading={isLoading}
                error={error}
                validatePhoneNumber={validatePhoneNumber}
              />
            )}

            {/* Call Status Display */}
            <div className="flex items-center justify-between">
              <CallStatusDisplay
                callStatus={callStatus}
                currentContact={currentContact}
                callDuration={callDuration}
                formatDuration={(seconds: number) => {
                  const mins = Math.floor(seconds / 60);
                  const secs = seconds % 60;
                  return `${mins}:${secs.toString().padStart(2, '0')}`;
                }}
              />
              
              {isCallActive && (
                <CallActionButtons
                  isMuted={isMuted}
                  onToggleMute={() => {
                    setIsMuted(prev => !prev);
                    toast.info(isMuted ? 'Unmuted' : 'Muted');
                  }}
                  onEndCall={() => {
                    setIsCallActive(false);
                    setCallStatus('completed');
                    setCurrentCallId(null);
                    toast.success('Call ended');
                    
                    setTimeout(() => {
                      setCallStatus('idle');
                      setCallDuration(0);
                      setCurrentContact('');
                    }, 2000);
                  }}
                />
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
