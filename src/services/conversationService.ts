
import { supabase } from '@/lib/supabase';

interface ConversationContext {
  callId: string;
  agentPrompt?: string;
  agentPersonality?: string;
  previousMessages: Array<{ role: string; content: string }>;
}

interface ConversationResponse {
  text: string;
  shouldEndCall: boolean;
  shouldTransfer: boolean;
  intent?: string;
  confidence?: number;
}

export const generateConversationResponse = async (
  transcript: string,
  context: ConversationContext
): Promise<ConversationResponse> => {
  try {
    // Log the conversation input
    console.log('Generating response for:', transcript);
    console.log('Context:', context);

    // Simple AI response logic - in production, you'd use a proper LLM
    const response = await generateSimpleResponse(transcript, context);

    // Log the conversation to database
    await supabase.from('conversation_logs').insert({
      call_id: context.callId,
      user_message: transcript,
      ai_response: response.text,
      intent: response.intent,
      created_at: new Date().toISOString()
    });

    return response;
  } catch (error) {
    console.error('Error generating conversation response:', error);
    
    // Fallback response
    return {
      text: "I'm sorry, I'm having trouble understanding. Could you please repeat that?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'error',
      confidence: 0.5
    };
  }
};

const generateSimpleResponse = async (
  transcript: string,
  context: ConversationContext
): Promise<ConversationResponse> => {
  const lowerTranscript = transcript.toLowerCase();
  
  // Handle common intents
  if (lowerTranscript.includes('goodbye') || lowerTranscript.includes('bye')) {
    return {
      text: "Thank you for your time. Have a great day!",
      shouldEndCall: true,
      shouldTransfer: false,
      intent: 'goodbye',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('transfer') || lowerTranscript.includes('human')) {
    return {
      text: "I'll transfer you to one of our human representatives right away.",
      shouldEndCall: false,
      shouldTransfer: true,
      intent: 'transfer_request',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('hello') || lowerTranscript.includes('hi')) {
    return {
      text: "Hello! Thank you for taking my call. I'm Sarah, an AI assistant from First Choice Solutions. How are you doing today?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'greeting',
      confidence: 0.9
    };
  }
  
  if (lowerTranscript.includes('business') || lowerTranscript.includes('service')) {
    return {
      text: "Great! We specialize in helping businesses like yours improve their operations and increase efficiency. What specific challenges are you facing in your business right now?",
      shouldEndCall: false,
      shouldTransfer: false,
      intent: 'business_inquiry',
      confidence: 0.8
    };
  }
  
  if (lowerTranscript.includes('not interested') || lowerTranscript.includes('no thank you')) {
    return {
      text: "I understand. Thank you for your time, and have a wonderful day!",
      shouldEndCall: true,
      shouldTransfer: false,
      intent: 'not_interested',
      confidence: 0.9
    };
  }
  
  // Default response
  return {
    text: "That's interesting. Can you tell me more about that? I'd love to understand how we might be able to help you.",
    shouldEndCall: false,
    shouldTransfer: false,
    intent: 'general_inquiry',
    confidence: 0.6
  };
};

export const analyzeCustomerSentiment = async (transcript: string) => {
  // Simple sentiment analysis - in production, use a proper service
  const positiveWords = ['good', 'great', 'excellent', 'yes', 'interested', 'helpful'];
  const negativeWords = ['bad', 'no', 'not interested', 'stop', 'remove', 'annoying'];
  
  const lowerTranscript = transcript.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerTranscript.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerTranscript.includes(word)).length;
  
  let sentiment = 'neutral';
  if (positiveCount > negativeCount) {
    sentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative';
  }
  
  return {
    sentiment,
    confidence: Math.max(positiveCount, negativeCount) > 0 ? 0.8 : 0.5,
    positiveWords: positiveCount,
    negativeWords: negativeCount
  };
};
