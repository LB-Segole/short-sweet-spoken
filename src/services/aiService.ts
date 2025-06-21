
import { supabase } from '@/lib/supabase';

interface AIResponseContext {
  callId: string;
  confidence?: number;
  previousMessages?: Array<{ role: string; content: string }>;
}

interface AIResponse {
  text: string;
  shouldEndCall: boolean;
  shouldTransfer: boolean;
  intent?: string;
  confidence?: number;
}

export const generateAIResponse = async (
  transcript: string,
  context: AIResponseContext
): Promise<AIResponse> => {
  try {
    console.log('Generating AI response for:', transcript);
    
    // Simple rule-based AI response
    const response = await processTranscript(transcript);
    
    // Log the interaction
    await logAIInteraction(transcript, response, context);
    
    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    return {
      text: "I apologize, I'm experiencing some technical difficulties. Let me connect you with a human representative.",
      shouldEndCall: false,
      shouldTransfer: true,
      intent: 'technical_error',
      confidence: 1.0
    };
  }
};

const processTranscript = async (
  transcript: string
): Promise<AIResponse> => {
  const lowerTranscript = transcript.toLowerCase();
  
  // Intent detection
  if (lowerTranscript.includes('goodbye') || lowerTranscript.includes('bye') || lowerTranscript.includes('hang up')) {
    return {
      text: "Thank you for your time today. Have a wonderful day!",
      shouldEndCall: true,
      shouldTransfer: false,
      intent: 'goodbye',
      confidence: 0.95
    };
  }
  
  if (lowerTranscript.includes('human') || lowerTranscript.includes('person') || lowerTranscript.includes('representative')) {
    return {
      text: "Of course! I'll connect you with one of our human representatives right away. Please hold on.",
      shouldEndCall: false,
      shouldTransfer: true,
      intent: 'transfer_request',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('not interested') || lowerTranscript.includes('no thanks') || lowerTranscript.includes('remove me')) {
    return {
      text: "I completely understand. Thank you for letting me know. I'll make sure to update your preferences. Have a great day!",
      shouldEndCall: true,
      shouldTransfer: false,
      intent: 'not_interested',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi') || lowerTranscript.includes('hey')) {
    return {
      text: "Hello! Thank you for taking my call. I'm Sarah from First Choice Solutions. We help businesses improve their operations and increase efficiency. How has your business been doing lately?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'greeting_response',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('business') || lowerTranscript.includes('company') || lowerTranscript.includes('operations')) {
    return {
      text: "That's great to hear! We work with businesses of all sizes to streamline their operations and boost productivity. What's your biggest challenge right now when it comes to running your business efficiently?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'business_discussion',
      confidence: 0.8
    };
  }
  
  if (lowerTranscript.includes('price') || lowerTranscript.includes('cost') || lowerTranscript.includes('expensive')) {
    return {
      text: "I understand that cost is important. Our solutions are designed to pay for themselves through increased efficiency. Would you like to hear about our most popular package that's helped businesses save an average of 20% on their operational costs?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'pricing_inquiry',
      confidence: 0.8
    };
  }
  
  if (lowerTranscript.includes('yes') || lowerTranscript.includes('sure') || lowerTranscript.includes('okay')) {
    return {
      text: "Excellent! I'm glad you're interested. Let me share some information about how we can help your business grow and become more efficient. What industry are you in?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'positive_response',
      confidence: 0.8
    };
  }
  
  // Default response for unclear input
  return {
    text: "I see. That's interesting. Can you tell me a bit more about that? I want to make sure I understand how we can best help you.",
    shouldEndCall: false,
    shouldTransfer: false,
    intent: 'clarification_request',
    confidence: 0.6
  };
};

export const analyzeCustomerSentiment = async (transcript: string) => {
  const positiveIndicators = ['yes', 'sure', 'interested', 'good', 'great', 'excellent', 'okay'];
  const negativeIndicators = ['no', 'not interested', 'stop', 'remove', 'busy', 'bad', 'terrible'];
  const neutralIndicators = ['maybe', 'perhaps', 'possibly', 'think about it'];
  
  const lowerTranscript = transcript.toLowerCase();
  
  const positiveCount = positiveIndicators.filter(word => lowerTranscript.includes(word)).length;
  const negativeCount = negativeIndicators.filter(word => lowerTranscript.includes(word)).length;
  const neutralCount = neutralIndicators.filter(word => lowerTranscript.includes(word)).length;
  
  let sentiment = 'neutral';
  let confidence = 0.5;
  
  if (positiveCount > negativeCount && positiveCount > neutralCount) {
    sentiment = 'positive';
    confidence = 0.8;
  } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
    sentiment = 'negative';
    confidence = 0.8;
  } else if (neutralCount > 0) {
    sentiment = 'neutral';
    confidence = 0.7;
  }
  
  return {
    sentiment,
    confidence,
    indicators: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount
    }
  };
};

const logAIInteraction = async (
  transcript: string,
  response: AIResponse,
  context: AIResponseContext
) => {
  try {
    await supabase.from('call_logs').insert({
      call_id: context.callId,
      speaker: 'ai_system',
      message: `User: ${transcript} | AI: ${response.text}`,
      confidence: response.confidence || 0.8,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging AI interaction:', error);
  }
};
