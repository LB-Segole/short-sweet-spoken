
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Bot, AlertCircle } from 'lucide-react';
import AIChat from './AIChat';
import { showErrorToast } from '@/utils/errorHandling';

const FloatingAIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    try {
      setIsOpen(prev => !prev);
      setError(null);
    } catch (error) {
      const errorMessage = showErrorToast(error, 'Failed to toggle chat');
      setError(errorMessage);
    }
  };

  const handleClose = () => {
    try {
      setIsOpen(false);
      setError(null);
    } catch (error) {
      showErrorToast(error, 'Failed to close chat');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <div className="relative">
          <Button
            onClick={handleToggle}
            className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all bg-blue-600 hover:bg-blue-700"
            aria-label="Open AI Chat"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
          {error && (
            <div className="absolute bottom-16 right-0 bg-red-100 border border-red-300 rounded-lg p-2 text-red-700 text-sm max-w-xs">
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-2xl border w-[400px] h-[600px] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">AI Agent</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-white hover:bg-blue-700"
              aria-label="Close AI Chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {error ? (
              <div className="p-4 flex items-center justify-center h-full">
                <div className="text-center text-red-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{error}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setError(null)}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <AIChat />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingAIChat;
