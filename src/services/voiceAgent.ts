
import { supabase } from '@/lib/supabase';
import { generateAIResponse } from './aiService';

export interface VoiceAgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  voice: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ConversationState {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  context: {
    callId: string;
    contactId?: string;
    campaignId?: string;
    customerInfo?: any;
  };
  metadata: {
    startTime: Date;
    lastActivity: Date;
    messageCount: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
}

export class VoiceAgent {
  private config: VoiceAgentConfig;
  private conversationState: ConversationState;

  constructor(config: VoiceAgentConfig, callId: string, contactId?: string, campaignId?: string) {
    this.config = config;
    this.conversationState = {
      messages: [
        {
          role: 'system',
          content: config.systemPrompt,
          timestamp: new Date()
        }
      ],
      context: {
        callId,
        contactId,
        campaignId
      },
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0
      }
    };
  }

  async processUserInput(transcript: string): Promise<{
    response: string;
    shouldEndCall: boolean;
    shouldTransfer: boolean;
    intent?: string;
    confidence?: number;
  }> {
    try {
      // Add user message to conversation
      this.conversationState.messages.push({
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });

      // Generate AI response using the aiService
      const aiResponse = await generateAIResponse(transcript, {
        callId: this.conversationState.context.callId,
        previousMessages: this.conversationState.messages
      });

      // Add AI response to conversation
      this.conversationState.messages.push({
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date()
      });

      // Update conversation metadata
      this.conversationState.metadata.lastActivity = new Date();
      this.conversationState.metadata.messageCount += 1;

      // Log the conversation
      await this.logConversation(transcript, aiResponse.text, aiResponse.confidence || 0.8);

      return {
        response: aiResponse.text,
        shouldEndCall: aiResponse.shouldEndCall,
        shouldTransfer: aiResponse.shouldTransfer,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence
      };

    } catch (error) {
      console.error('Error processing user input:', error);
      
      return {
        response: "I apologize, but I'm experiencing some technical difficulties. Let me connect you with a human representative.",
        shouldEndCall: false,
        shouldTransfer: true,
        intent: 'technical_error',
        confidence: 1.0
      };
    }
  }

  async generateInitialMessage(): Promise<string> {
    try {
      // Use a simple greeting based on the agent's configuration
      const greeting = "Hello! Thank you for taking my call. I'm an AI assistant from First Choice Solutions. How are you doing today?";
      
      // Add to conversation history
      this.conversationState.messages.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      });

      // Log the initial message
      await this.logConversation('', greeting, 0.9);

      return greeting;
    } catch (error) {
      console.error('Error generating initial message:', error);
      return "Hello! Thank you for taking my call. How can I help you today?";
    }
  }

  private async logConversation(userMessage: string, agentResponse: string, confidence: number): Promise<void> {
    try {
      await supabase.from('call_logs').insert({
        call_id: this.conversationState.context.callId,
        speaker: userMessage ? 'user' : 'assistant',
        message: userMessage || agentResponse,
        confidence: confidence,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging conversation:', error);
    }
  }

  getConversationState(): ConversationState {
    return this.conversationState;
  }

  getConfig(): VoiceAgentConfig {
    return this.config;
  }

  // Calculate conversation duration in seconds
  getConversationDuration(): number {
    const now = new Date();
    const startTime = this.conversationState.metadata.startTime;
    return Math.floor((now.getTime() - startTime.getTime()) / 1000);
  }

  // Get conversation summary
  getConversationSummary(): {
    duration: number;
    messageCount: number;
    lastActivity: Date;
    sentiment?: string;
  } {
    return {
      duration: this.getConversationDuration(),
      messageCount: this.conversationState.metadata.messageCount,
      lastActivity: this.conversationState.metadata.lastActivity,
      sentiment: this.conversationState.metadata.sentiment
    };
  }
}

// Factory function to create a voice agent
export async function createVoiceAgent(
  agentId: string, 
  callId: string, 
  contactId?: string, 
  campaignId?: string
): Promise<VoiceAgent> {
  try {
    // Fetch agent configuration from database
    const { data: agent, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) throw error;
    if (!agent) throw new Error('Agent not found');

    const config: VoiceAgentConfig = {
      id: agent.id,
      name: agent.name,
      systemPrompt: agent.system_prompt,
      voice: agent.voice_id || 'default',
      model: agent.model || 'gpt-3.5-turbo',
      temperature: agent.temperature || 0.7,
      maxTokens: agent.max_tokens || 500
    };

    return new VoiceAgent(config, callId, contactId, campaignId);
  } catch (error) {
    console.error('Error creating voice agent:', error);
    throw error;
  }
}
