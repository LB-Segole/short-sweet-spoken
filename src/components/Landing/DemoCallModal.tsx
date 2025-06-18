
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, X, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DemoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DemoCallModal: React.FC<DemoCallModalProps> = ({ isOpen, onClose }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const validatePhoneNumber = (number: string): boolean => {
    const cleanedNumber = number.replace(/\D/g, '');
    return cleanedNumber.length >= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean and validate phone number
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (!validatePhoneNumber(phoneNumber)) {
      setErrorMessage("Please enter a valid phone number (at least 10 digits)");
      toast.error("Please enter a valid phone number (at least 10 digits)");
      return;
    }

    // Format phone number with country code if not present
    let formattedNumber = cleanedNumber;
    if (!formattedNumber.startsWith('1') && formattedNumber.length === 10) {
      formattedNumber = '1' + formattedNumber;
    }
    formattedNumber = '+' + formattedNumber;

    setStatus('submitting');
    setErrorMessage('');
    
    try {
      console.log('Initiating demo call to:', formattedNumber);
      
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: {
          phoneNumber: formattedNumber,
          campaignId: 'demo-call',
          contactId: null,
          assistantId: null, // Will create demo assistant automatically
          squadId: null
        }
      });

      console.log('Demo call response:', { data, error });

      if (error) {
        console.error('Demo call error:', error);
        throw new Error(error.message || 'Failed to initiate demo call');
      }

      if (!data?.success) {
        console.error('Demo call failed:', data);
        throw new Error(data?.error || 'Demo call failed');
      }

      setStatus('success');
      toast.success('Demo call initiated successfully! You should receive a call within the next minute.');
      
      // Reset after 3 seconds
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setPhoneNumber('');
        setErrorMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error initiating demo call:', error);
      const errorMsg = error instanceof Error ? error.message : 'Please try again.';
      setStatus('error');
      setErrorMessage(errorMsg);
      toast.error(`Failed to initiate demo call: ${errorMsg}`);
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleClose = () => {
    onClose();
    setStatus('idle');
    setPhoneNumber('');
    setErrorMessage('');
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
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
    setErrorMessage(''); // Clear error when user starts typing
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full relative overflow-hidden">
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10"
          disabled={status === 'submitting'}
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="p-6 sm:p-8">
          <div className="bg-indigo-100 text-indigo-600 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6">
            <Phone className="h-6 w-6" />
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-2">Try a Demo Call</h2>
          <p className="text-gray-600 text-center mb-6">
            Enter your phone number and our AI agent will call you for a live demonstration.
          </p>
          
          {status === 'success' ? (
            <div className="text-center">
              <div className="bg-green-100 text-green-600 p-4 rounded-md mb-4">
                <p className="font-medium">Success!</p>
                <p>Your demo call has been initiated. You should receive a call within the next minute.</p>
              </div>
              <p className="text-sm text-gray-500">Closing this window automatically...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Phone Number
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  className={`w-full ${errorMessage ? 'border-red-300 focus:border-red-500' : ''}`}
                  disabled={status === 'submitting'}
                  maxLength={14}
                  required
                />
                {errorMessage && (
                  <div className="flex items-center mt-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errorMessage}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">US/Canada numbers only</p>
              </div>
              
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={status === 'submitting' || !validatePhoneNumber(phoneNumber)}
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Initiating Call...
                  </>
                ) : (
                  'Start Demo Call'
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-4">
                By clicking, you agree to receive a demo call from First Choice LLC. Standard call rates may apply.
              </p>
            </form>
          )}
        </div>
        
        <div className="bg-gray-50 px-6 py-4 text-sm text-gray-500 text-center border-t">
          This is a live demo with real AI voice conversation. <br />
          <span className="text-indigo-600">Experience the future of customer engagement!</span>
        </div>
      </div>
    </div>
  );
};

export default DemoCallModal;
