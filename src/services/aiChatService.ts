import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AIResponse {
  success: boolean;
  response?: string;
  error?: string;
  agent?: {
    id: string;
    name: string;
    voice_model: string;
  };
}

export class AIChatService {
  private conversationHistory: Map<string, ChatMessage[]> = new Map();

  async sendMessage(
    agentId: string,
    message: string,
    sessionId?: string
  ): Promise<AIResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get conversation history for this session
      const sessionKey = sessionId || agentId;
      const history = this.conversationHistory.get(sessionKey) || [];

      const { data, error } = await supabase.functions.invoke('huggingface-chat', {
        body: {
          agentId,
          message,
          conversationHistory: history
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('AI Chat Service error:', error);
        throw error;
      }

      if (data?.success && data?.response) {
        // Update conversation history
        const updatedHistory = [
          ...history,
          { role: 'user' as const, content: message, timestamp: new Date().toISOString() },
          { role: 'assistant' as const, content: data.response, timestamp: new Date().toISOString() }
        ];

        // Keep only last 20 messages to prevent memory issues
        if (updatedHistory.length > 20) {
          updatedHistory.splice(0, updatedHistory.length - 20);
        }

        this.conversationHistory.set(sessionKey, updatedHistory);

        return {
          success: true,
          response: data.response,
          agent: data.agent
        };
      }

      throw new Error(data?.error || 'Failed to get AI response');

    } catch (error) {
      console.error('AI Chat Service error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  getConversationHistory(sessionId: string): ChatMessage[] {
    return this.conversationHistory.get(sessionId) || [];
  }

  clearConversationHistory(sessionId: string): void {
    this.conversationHistory.delete(sessionId);
  }

  clearAllHistory(): void {
    this.conversationHistory.clear();
  }
}

export const aiChatService = new AIChatService();
