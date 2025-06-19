
import { supabase } from '@/lib/supabase';

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

// Simple rule-based conversation system to replace OpenAI
export const generateConversationResponse = async (
  userInput: string, 
  context: ConversationContext
): Promise<ConversationResponse> => {
  try {
    // Simple rule-based responses
    const input = userInput.toLowerCase().trim();
    
    // Greeting responses
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return {
        text: "Hello! Thank you for connecting with First Choice Solutions. I'm here to help you with your business needs. How can I assist you today?",
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'greeting',
        confidence: 0.9
      };
    }
    
    // Business inquiry responses
    if (input.includes('business') || input.includes('service') || input.includes('help')) {
      return {
        text: "Great! We specialize in business consulting, digital marketing, and operational efficiency. What specific challenges is your business facing that we might help with?",
        shouldTransfer: false,
        shouldEndCall: false,
        intent: 'business_inquiry',
        confidence: 0.8
      };
    }
    
    // Pricing inquiries
    if (input.includes('price') || input.includes('cost') || input.includes('expensive')) {
      return {
        text: "I understand you're interested in our pricing. Our solutions are customized based on your specific needs. Would you like me to connect you with one of our consultants to discuss pricing?",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'pricing_inquiry',
        confidence: 0.8
      };
    }
    
    // Transfer requests
    if (input.includes('human') || input.includes('person') || input.includes('representative')) {
      return {
        text: "Of course! Let me connect you with one of our human representatives who can provide more detailed assistance.",
        shouldTransfer: true,
        shouldEndCall: false,
        intent: 'transfer_request',
        confidence: 0.9
      };
    }
    
    // Negative responses
    if (input.includes('not interested') || input.includes('no thank') || input.includes('busy')) {
      return {
        text: "I understand you're not interested right now. Thank you for your time, and feel free to reach out if your needs change in the future. Have a great day!",
        shouldTransfer: false,
        shouldEndCall: true,
        intent: 'not_interested',
        confidence: 0.8
      };
    }
    
    // Generic positive response
    return {
      text: `That's interesting! I heard you mention "${userInput}". Let me tell you more about how First Choice Solutions can help your business grow and become more efficient. Would you like to hear about our services?`,
      shouldTransfer: false,
      shouldEndCall: false,
      intent: 'general_inquiry',
      confidence: 0.6
    };

  } catch (error) {
    console.error('Conversation response generation failed:', error);
    
    // Fallback response
    return {
      text: "I understand. Let me connect you with one of our human representatives who can better assist you.",
      shouldTransfer: true,
      shouldEndCall: false,
      intent: 'fallback',
      confidence: 0.5
    };
  }
};

// Analyze customer sentiment without OpenAI
export const analyzeCustomerSentiment = (text: string): {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  confidence: number;
} => {
  const input = text.toLowerCase();
  
  // Positive indicators
  const positiveWords = ['yes', 'interested', 'good', 'great', 'help', 'want', 'need'];
  const negativeWords = ['no', 'not interested', 'busy', 'stop', 'remove', 'annoying'];
  
  const positiveCount = positiveWords.filter(word => input.includes(word)).length;
  const negativeCount = negativeWords.filter(wor => input.includes(word)).length;
  
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
export const generateFollowUp = (callSummary: string): string => {
  return `Thank you for speaking with us today about ${callSummary}. We appreciate your interest in First Choice Solutions and look forward to helping your business succeed. Our team will follow up with you soon with more information tailored to your needs.`;
};
