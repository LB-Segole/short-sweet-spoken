
import { Button } from '@/components/ui/button';
import { MessageSquare, UserPlus, FileText, HelpCircle } from 'lucide-react';

interface QuickActionsProps {
  onTransferToAgent: () => void;
  onQuickMessage: (message: string) => void;
}

const QuickActions = ({ onTransferToAgent, onQuickMessage }: QuickActionsProps) => {
  const quickMessages = [
    { icon: MessageSquare, text: "How can I get started?", message: "How can I get started with your service?" },
    { icon: FileText, text: "Pricing info", message: "Can you tell me about your pricing plans?" },
    { icon: HelpCircle, text: "Technical support", message: "I need technical support with my account" },
  ];

  return (
    <div className="border-t p-3">
      <div className="flex flex-wrap gap-2 mb-2">
        {quickMessages.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => onQuickMessage(item.message)}
            className="text-xs"
          >
            <item.icon className="h-3 w-3 mr-1" />
            {item.text}
          </Button>
        ))}
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onTransferToAgent}
        className="w-full text-xs"
      >
        <UserPlus className="h-3 w-3 mr-1" />
        Transfer to Human Agent
      </Button>
    </div>
  );
};

export default QuickActions;
