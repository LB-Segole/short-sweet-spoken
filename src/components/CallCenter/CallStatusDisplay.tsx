
import React from 'react';

type CallStatus = 'idle' | 'calling' | 'connected' | 'completed';

interface CallStatusDisplayProps {
  callStatus: CallStatus;
  currentContact: string;
  callDuration: number;
  formatDuration: (seconds: number) => string;
}

export const CallStatusDisplay: React.FC<CallStatusDisplayProps> = ({
  callStatus,
  currentContact,
  callDuration,
  formatDuration
}) => {
  return (
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
  );
};
