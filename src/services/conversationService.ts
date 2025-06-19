
export interface ConversationResponse {
  text: string;
  shouldTransfer: boolean;
  shouldEndCall: boolean;
  intent: string;
  confidence: number;
}

export interface ConversationContext {
  callId: string;
  confidence?: number;
  previousMessages?: Array<{ role: string; content: string }>;
}

// Enhanced rule-based conversation system (no OpenAI needed)
export const generateConversationResponse = async (
  userInput: string,
  context?: ConversationContext
): Promise<ConversationResponse> => {
  try {
    const input = userInput.toLowerCase().trim();
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('good morning') || input.includes('good afternoon')) {
      const greetings = [
        "Hello! Thank you for connecting. I'm here to help you with your business needs. How can I assist you today?",
        "Hi there! Great to hear from you. I'm your AI assistant ready to help with your business questions. What can I do for you?",
        "Good to connect with you! I'm here to discuss how we can help improve your business operations. What's on your mind?"
      ];
      return {
        text: greetings[Math.floor(Math.random() * greetings.length)],
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'greeting',
        confidence: 0.9
      };
    }
    
    // Business inquiry responses
    if (input.includes('business') || input.includes('service') || input.includes('help') || input.includes('solution')) {
      return {
        text: "Excellent! We specialize in business consulting, digital transformation, and operational efficiency. Our solutions help companies streamline processes and increase profitability. What specific business challenges are you facing that we might be able to help with?",
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'business_inquiry',
        confidence: 0.85
      };
    }
    
    // Pricing inquiries
    if (input.includes('price') || input.includes('cost') || input.includes('expensive') || input.includes('budget') || input.includes('quote')) {
      return {
        text: "I understand pricing is important for your decision. Our solutions are customized based on your specific needs and business size, so I'd love to connect you with one of our consultants who can provide you with a detailed quote. Would that work for you?",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'pricing_inquiry',
        confidence: 0.8
      };
    }
    
    // Technical questions
    if (input.includes('how does') || input.includes('technical') || input.includes('integration') || input.includes('api')) {
      return {
        text: "That's a great technical question! Our platform offers flexible integration options and robust APIs. I'd like to connect you with one of our technical specialists who can give you detailed information about our technical capabilities and integration process.",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'technical_inquiry',
        confidence: 0.8
      };
    }
    
    // Transfer requests
    if (input.includes('human') || input.includes('person') || input.includes('representative') || input.includes('agent') || input.includes('speak to someone')) {
      return {
        text: "Of course! I'll connect you with one of our human representatives right now. They'll be able to provide more detailed assistance and answer any specific questions you have. Please hold on for just a moment.",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'transfer_request',
        confidence: 0.9
      };
    }
    
    // Interest/positive responses
    if (input.includes('interested') || input.includes('sounds good') || input.includes('tell me more') || input.includes('yes')) {
      return {
        text: "That's wonderful to hear! I'm excited that you're interested. Let me connect you with one of our specialists who can walk you through our solutions in detail and discuss how we can specifically help your business grow.",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'interested',
        confidence: 0.85
      };
    }
    
    // Negative responses
    if (input.includes('not interested') || input.includes('no thank') || input.includes('busy') || input.includes('not right now')) {
      return {
        text: "I completely understand that timing isn't right for everyone. Thank you for taking the time to speak with me today. If your needs change in the future, please don't hesitate to reach out. Have a wonderful day!",
        shouldTransfer: false,
        shouldEndCall: true,
        intent: 'not_interested',
        confidence: 0.8
      };
    }
    
    // Goodbye/end call
    if (input.includes('goodbye') || input.includes('bye') || input.includes('end call') || input.includes('hang up') || input.includes('talk later')) {
      return {
        text: "Thank you so much for your time today! It was great speaking with you. Have a fantastic day and we look forward to potentially working together in the future. Goodbye!",
        shouldTransfer: false,
        shouldEndCall: true,
        intent: 'goodbye',
        confidence: 0.9
      };
    }
    
    // Competitor mentions
    if (input.includes('competitor') || input.includes('other company') || input.includes('already using')) {
      return {
        text: "I appreciate you sharing that information. Many of our clients have come from other solutions, and we'd love to show you what makes our approach different. Would you be interested in hearing about our unique advantages and how we might provide better value?",
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'competitor_mention',
        confidence: 0.7
      };
    }

    // Questions about the company
    if (input.includes('who are you') || input.includes('your company') || input.includes('about you')) {
      return {
        text: "Great question! We're a leading business solutions company that helps organizations optimize their operations and drive growth. We've been helping businesses like yours for many years with proven results. What would you like to know specifically about how we can help your business?",
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'company_inquiry',
        confidence: 0.8
      };
    }
    
    // Default/catchall response
    const catchallResponses = [
      `That's interesting that you mentioned "${userInput}". Let me tell you how our business solutions could help address that. We specialize in solving complex business challenges. Would you like to hear more about our approach?`,
      `I hear what you're saying about "${userInput}". Many businesses face similar challenges, and that's exactly where we excel. Our solutions are designed to tackle these kinds of issues. Can I share how we might help?`,
      `Thank you for sharing that about "${userInput}". Based on what you've told me, I think our services could be a great fit. Would you be interested in learning more about how we can help your specific situation?`
    ];
    
    return {
      text: catchallResponses[Math.floor(Math.random() * catchallResponses.length)],
      shouldTransfer: false,
      shouldEndCall: false,
      intent: 'general_inquiry',
      confidence: 0.6
    };

  } catch (error) {
    console.error('Conversation response generation failed:', error);
    
    return {
      text: "I apologize, but I'm having a small technical issue. Let me connect you with one of our human representatives who can better assist you right away.",
      shouldTransfer: true,
      shouldEndCall: false,
      intent: 'fallback',
      confidence: 0.5
    };
  }
};

// Enhanced sentiment analysis
export const analyzeCustomerSentiment = (text: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  confidence: number;
} => {
  const input = text.toLowerCase();
  
  const positiveWords = ['yes', 'interested', 'good', 'great', 'help', 'want', 'need', 'sounds good', 'tell me more', 'perfect', 'excellent'];
  const negativeWords = ['no', 'not interested', 'busy', 'stop', 'remove', 'annoying', 'waste', 'time', 'not right now'];
  const neutralWords = ['maybe', 'think about', 'consider', 'later', 'uncertain', 'not sure'];
  
  const positiveCount = positiveWords.filter(word => input.includes(word)).length;
  const negativeCount = negativeWords.filter(word => input.includes(word)).length;
  const neutralCount = neutralWords.filter(word => input.includes(word)).length;
  
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let intent = 'general';
  let confidence = 0.5;
  
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    sentiment = 'positive';
    intent = 'interested';
    confidence = Math.min(0.9, 0.6 + (positiveCount * 0.1));
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    sentiment = 'negative';
    intent = 'not_interested';
    confidence = Math.min(0.9, 0.6 + (negativeCount * 0.1));
  } else if (neutralCount > 0) {
    sentiment = 'neutral';
    intent = 'considering';
    confidence = 0.7;
  }
  
  return { sentiment, intent, confidence };
};

// Generate follow-up messages
export const generateFollowUp = (callSummary: string): string => {
  const followUps = [
    `Thank you for our conversation today about ${callSummary}. We appreciate your interest and look forward to helping your business succeed.`,
    `It was great discussing ${callSummary} with you today. Our team will follow up with more detailed information tailored to your specific needs.`,
    `Thank you for taking the time to speak with us about ${callSummary}. We're excited about the possibility of working together to achieve your business goals.`
  ];
  
  return followUps[Math.floor(Math.random() * followUps.length)];
};
