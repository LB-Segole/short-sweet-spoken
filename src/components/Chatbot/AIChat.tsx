import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Message } from './types';
import { generateAIResponse } from './aiResponseGenerator';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import QuickActions from './QuickActions';
import MessageInput from './MessageInput';

const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hello! I'm your First Choice LLC AI agent. How can I help you today?",
      sender: 'agent',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const aiResponse = await generateAIResponse(inputMessage);
      
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'agent',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      toast.error('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferToAgent = () => {
    const transferMessage: Message = {
      id: Date.now().toString(),
      content: "I'm connecting you with a live support agent. They'll be with you shortly!",
      sender: 'agent',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, transferMessage]);
    
    // Simulate transfer
    setTimeout(() => {
      window.open('mailto:support@firstchoicellc.com?subject=Transfer from AI Chat - Support Request', '_blank');
      toast.success('Transfer initiated! Please check your email client.');
    }, 1000);
  };

  const handleQuickMessage = (message: string) => {
    setInputMessage(message);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          Chat
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>
        
        <QuickActions 
          onTransferToAgent={handleTransferToAgent}
          onQuickMessage={handleQuickMessage}
        />
        
        <MessageInput
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </CardContent>
    </Card>
  );
};

export default AIChat;
