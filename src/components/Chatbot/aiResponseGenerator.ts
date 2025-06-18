
export const generateAIResponse = async (userMessage: string): Promise<string> => {
  // Simple AI responses for common queries
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! I'm great, thanks for asking! I'm here to help you with your First Choice LLC voice calling needs. How can I assist you today?";
  }
  
  if (lowerMessage.includes('how are you')) {
    return "I'm doing wonderful, thank you for asking! I'm here and ready to help you with any questions about First Choice LLC's voice calling services.";
  }
  
  if (lowerMessage.includes('pricing') || lowerMessage.includes('cost') || lowerMessage.includes('price')) {
    return "Our pricing is very competitive! We offer a free trial to get you started, then flexible monthly plans. You can view our detailed pricing at /pricing or I can transfer you to a live agent for a personalized quote.";
  }
  
  if (lowerMessage.includes('campaign') || lowerMessage.includes('calling')) {
    return "First Choice LLC makes it easy to create and manage voice calling campaigns! You can set up campaigns in your dashboard, upload contact lists, and track performance in real-time. Would you like me to guide you through creating your first campaign?";
  }
  
  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return "I'm here to help! You can ask me about our services, pricing, getting started, or technical questions. For complex issues, I can also transfer you to one of our live support agents.";
  }
  
  if (lowerMessage.includes('trial') || lowerMessage.includes('free')) {
    return "Great question! We offer a 30-day free trial with full access to our platform. You can start making calls immediately and see how First Choice LLC can boost your business. Would you like me to help you get started?";
  }
  
  if (lowerMessage.includes('feature') || lowerMessage.includes('what can')) {
    return "First Choice LLC offers powerful features including AI-powered voice calling, campaign management, real-time analytics, call recording, transcription, and more! Our platform is designed to help businesses connect with customers efficiently.";
  }

  if (lowerMessage.includes('api') || lowerMessage.includes('integration')) {
    return "Yes! We provide a comprehensive REST API for integrating with your existing systems. You can programmatically manage campaigns, make calls, and access analytics. Check out our API documentation for details.";
  }

  // Default response for unrecognized queries
  return "That's a great question! I want to make sure I give you the most accurate information. Would you like me to transfer you to one of our live agents who can provide detailed assistance with your specific needs?";
};
