import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageInputProps {
  inputMessage: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  isLoading
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && inputMessage.trim()) {
      onSendMessage();
    }
  };

  return (
    <div className="border-t px-4 py-3">
      <div className="flex gap-2">
        <Input
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Type your message..."
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <Button 
          onClick={onSendMessage} 
          disabled={isLoading || !inputMessage.trim()}
          size="sm"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
