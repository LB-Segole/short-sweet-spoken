
import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface QuickActionsProps {
  onTransferToAgent: () => void;
  onQuickMessage: (message: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onTransferToAgent, onQuickMessage }) => {
  return (
    <div className="border-t px-4 py-3">
      <div className="flex gap-2 mb-3">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onTransferToAgent}
          className="text-xs"
        >
          <Phone className="h-3 w-3 mr-1" />
          Transfer to Agent
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onQuickMessage("How do I get started with First Choice LLC?")}
          className="text-xs"
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default QuickActions;
