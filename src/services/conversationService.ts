
export interface ConversationResponse {
  text: string;
  shouldTransfer: boolean;
  shouldEndCall: boolean;
  intent: string;
  confidence: number;
}

export interface ConversationContext {
  callId: string;
  agentPrompt?: string;
  agentPersonality?: string;
  previousMessages?: Array<{ role: string; content: string }>;
}

// Enhanced rule-based conversation system with agent context
export const generateConversationResponse = async (
  userInput: string,
  context: ConversationContext
): Promise<ConversationResponse> => {
  try {
    const input = userInput.toLowerCase().trim();
    const agentPersonality = context.agentPersonality || 'professional';
    const agentPrompt = context.agentPrompt || 'You are a helpful AI assistant.';
    
    // Use agent context to personalize responses
    let responsePrefix = '';
    if (agentPersonality === 'friendly') {
      responsePrefix = 'That sounds wonderful! ';
    } else if (agentPersonality === 'professional') {
      responsePrefix = 'I understand. ';
    } else if (agentPersonality === 'casual') {
      responsePrefix = 'Got it! ';
    }
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return {
        text: `Hello! Thank you for connecting. ${agentPrompt.includes('business') ? 'I\'m here to help with your business needs.' : 'How can I assist you today?'}`,
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'greeting',
        confidence: 0.9
      };
    }
    
    // Business inquiry responses
    if (input.includes('business') || input.includes('service') || input.includes('help')) {
      return {
        text: `${responsePrefix}I'd be happy to help you with that. Can you tell me more about what specific assistance you're looking for?`,
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'business_inquiry',
        confidence: 0.8
      };
    }
    
    // Pricing inquiries
    if (input.includes('price') || input.includes('cost') || input.includes('expensive')) {
      return {
        text: `${responsePrefix}I understand you're interested in pricing information. Let me connect you with someone who can provide detailed pricing based on your specific needs.`,
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'pricing_inquiry',
        confidence: 0.8
      };
    }
    
    // Transfer requests
    if (input.includes('human') || input.includes('person') || input.includes('representative')) {
      return {
        text: `${responsePrefix}Of course! Let me connect you with one of our human representatives who can provide more detailed assistance.`,
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'transfer_request',
        confidence: 0.9
      };
    }
    
    // Negative responses
    if (input.includes('not interested') || input.includes('no thank') || input.includes('busy')) {
      return {
        text: `${responsePrefix}I understand you're not interested right now. Thank you for your time, and please feel free to reach out if your needs change. Have a great day!`,
        shouldTransfer: false,
        shouldEndCall: true,
        intent: 'not_interested',
        confidence: 0.8
      };
    }
    
    // Generic response based on agent prompt
    const contextualResponse = agentPrompt.includes('sales') 
      ? `I'd love to learn more about how we can help your business grow. What challenges are you currently facing?`
      : `That's interesting! Can you tell me more about that so I can better assist you?`;
    
    return {
      text: `${responsePrefix}${contextualResponse}`,
      shouldTransfer: false,
      shouldEndCall: false,
      intent: 'general_inquiry',
      confidence: 0.6
    };

  } catch (error) {
    console.error('Conversation response generation failed:', error);
    
    return {
      text: "I understand. Let me connect you with one of our human representatives who can better assist you.",
      shouldTransfer: true,
      shouldEndCall: false,
      intent: 'fallback',
      confidence: 0.5
    };
  }
};

// Analyze customer sentiment
export const analyzeCustomerSentiment = (text: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  confidence: number;
} => {
  const input = text.toLowerCase();
  
  const positiveWords = ['yes', 'interested', 'good', 'great', 'help', 'want', 'need', 'love', 'like'];
  const negativeWords = ['no', 'not interested', 'busy', 'stop', 'remove', 'annoying', 'bad', 'hate'];
  
  const positiveCount = positiveWords.filter(word => input.includes(word)).length;
  const negativeCount = negativeWords.filter(word => input.includes(word)).length;
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let intent = 'general';
  let confidence = 0.5;
  
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
    intent = 'interested';
    confidence = 0.7;
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
    intent = 'not_interested';
    confidence = 0.8;
  }
  
  return { sentiment, intent, confidence };
};

// Generate follow-up messages
export const generateFollowUp = (callSummary: string, agentContext?: string): string => {
  const contextualMessage = agentContext?.includes('sales') 
    ? 'Our sales team will reach out to you with a customized proposal.'
    : 'Our team will follow up with you soon with more information.';
  
  return `Thank you for speaking with us today about ${callSummary}. We appreciate your interest and ${contextualMessage}`;
};
