
export interface Agent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  firstMessage: string;
  personality: 'professional' | 'friendly' | 'casual' | 'assertive';
  voiceSettings: {
    model: string;
    speed: number;
    stability: number;
  };
  conversationSettings: {
    maxTurnLength: number;
    responseDelay: number;
    endCallPhrases: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  systemPrompt: string;
  firstMessage: string;
  personality: Agent['personality'];
  voiceSettings?: Partial<Agent['voiceSettings']>;
  conversationSettings?: Partial<Agent['conversationSettings']>;
}
