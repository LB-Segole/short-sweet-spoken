
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, AlertCircle } from 'lucide-react';

interface CallControlsProps {
  phoneNumber: string;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartCall: () => void;
  isLoading: boolean;
  error: string;
  validatePhoneNumber: (number: string) => boolean;
}

export const CallControls: React.FC<CallControlsProps> = ({
  phoneNumber,
  onPhoneChange,
  onStartCall,
  isLoading,
  error,
  validatePhoneNumber
}) => {
  return (
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
          onChange={onPhoneChange}
          className={`flex-1 ${error ? 'border-red-300 focus:border-red-500' : ''}`}
          maxLength={14}
          disabled={isLoading}
        />
        <Button 
          onClick={onStartCall} 
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
  );
};
