
import React from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Square } from 'lucide-react';

interface CallActionButtonsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const CallActionButtons: React.FC<CallActionButtonsProps> = ({
  isMuted,
  onToggleMute,
  onEndCall
}) => {
  return (
    <div className="flex gap-2">
      <Button onClick={onToggleMute} variant="outline" className={isMuted ? 'bg-red-100' : ''}>
        {isMuted ? <MicOff size={16} className="mr-2" /> : <Mic size={16} className="mr-2" />}
        {isMuted ? 'Unmute' : 'Mute'}
      </Button>
      <Button onClick={onEndCall} variant="destructive">
        <Square size={16} className="mr-2" />
        End Call
      </Button>
    </div>
  );
};
