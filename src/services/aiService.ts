import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface AIResponse {
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

export const generateAIResponse = async (
  userInput: string, 
  context: ConversationContext
): Promise<AIResponse> => {
  try {
    // Get conversation history
    const { data: callLogs } = await supabase
      .from('call_logs')
      .select('speaker, message')
      .eq('call_id', context.callId)
      .order('timestamp', { ascending: true })
      .limit(10);

    // Build conversation history for context
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are Sarah, a professional AI sales assistant for First Choice Solutions LLC. 

COMPANY INFO:
- First Choice Solutions LLC provides business consulting, digital marketing, and operational efficiency services
- We help small to medium businesses improve their operations and grow their revenue
- Our services include: business process optimization, digital marketing campaigns, customer service training, and technology integration

CONVERSATION GUIDELINES:
1. Be friendly, professional, and helpful
2. Listen actively and respond to the customer's specific needs
3. Ask qualifying questions to understand their business challenges
4. Offer relevant solutions from our service portfolio
5. If the customer is interested, schedule a consultation or transfer to a human agent
6. If the customer is not interested or hostile, politely end the call
7. Keep responses concise (under 50 words) for phone conversations

RESPONSE INDICATORS:
- If customer shows interest or asks detailed questions: continue conversation
- If customer asks to speak to a human or requests transfer: set shouldTransfer = true
- If customer is clearly not interested, hostile, or asks to be removed: set shouldEndCall = true
- If customer seems confused or you can't help: set shouldTransfer = true

Current conversation context: This is a cold outreach call to introduce our services.`
      }
    ];

    // Add conversation history
    if (callLogs) {
      callLogs.forEach(log => {
        messages.push({
          role: log.speaker === 'agent' ? 'assistant' : 'user',
          content: log.message
        });
      });
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: userInput
    });

    // Generate AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 150,
      temperature: 0.7,
      functions: [
        {
          name: 'determine_call_action',
          description: 'Determine the next action for the call based on customer response',
          parameters: {
            type: 'object',
            properties: {
              response_text: {
                type: 'string',
                description: 'The AI agent\'s response to the customer'
              },
              intent: {
                type: 'string',
                enum: ['interested', 'not_interested', 'needs_info', 'wants_human', 'hostile', 'confused'],
                description: 'The detected customer intent'
              },
              should_transfer: {
                type: 'boolean',
                description: 'Whether to transfer the call to a human agent'
              },
              should_end_call: {
                type: 'boolean',
                description: 'Whether to end the call'
              },
              confidence: {
                type: 'number',
                description: 'Confidence level in the response (0-1)'
              }
            },
            required: ['response_text', 'intent', 'should_transfer', 'should_end_call', 'confidence']
          }
        }
      ],
      function_call: { name: 'determine_call_action' }
    });

    const functionCall = completion.choices[0].message.function_call;
    if (!functionCall || !functionCall.arguments) {
      throw new Error('No function call response from OpenAI');
    }

    const aiDecision = JSON.parse(functionCall.arguments);

    return {
      text: aiDecision.response_text,
      shouldTransfer: aiDecision.should_transfer,
      shouldEndCall: aiDecision.should_end_call,
      intent: aiDecision.intent,
      confidence: aiDecision.confidence
    };

  } catch (error) {
    console.error('AI response generation failed:', error);
    
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

// Analyze customer sentiment and intent
export const analyzeCustomerSentiment = async (text: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;
  confidence: number;
}> => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Analyze the customer\'s sentiment and intent from their response. Respond with JSON only.'
        },
        {
          role: 'user',
          content: `Analyze this customer response: "${text}"`
        }
      ],
      functions: [
        {
          name: 'analyze_sentiment',
          parameters: {
            type: 'object',
            properties: {
              sentiment: {
                type: 'string',
                enum: ['positive', 'neutral', 'negative']
              },
              intent: {
                type: 'string',
                enum: ['interested', 'not_interested', 'needs_info', 'wants_human', 'price_inquiry', 'complaint']
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1
              }
            },
            required: ['sentiment', 'intent', 'confidence']
          }
        }
      ],
      function_call: { name: 'analyze_sentiment' }
    });

    const result = completion.choices[0].message.function_call;
    if (result?.arguments) {
      return JSON.parse(result.arguments);
    }

    throw new Error('No sentiment analysis result');

  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    return {
      sentiment: 'neutral',
      intent: 'needs_info',
      confidence: 0.5
    };
  }
};

// Generate personalized follow-up messages
export const generateFollowUp = async (
  callSummary: string,
  customerInfo: any
): Promise<string> => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Generate a personalized follow-up email for a customer based on the call summary. 
          Keep it professional, concise, and include relevant next steps.`
        },
        {
          role: 'user',
          content: `Call Summary: ${callSummary}\nCustomer Info: ${JSON.stringify(customerInfo)}`
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    return completion.choices[0].message.content || 'Thank you for your time today. We look forward to helping your business grow.';

  } catch (error) {
    console.error('Follow-up generation failed:', error);
    return 'Thank you for your time today. We look forward to helping your business grow.';
  }
};