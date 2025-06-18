// Define all types here

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt?: string;
  user_metadata?: {
    phone?: string;
    country?: string;
    address?: string;
    organization?: string;
    [key: string]: any;
  };
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  callLimit: number;
  isPopular?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt?: string;
  description?: string;
  scriptId?: string;
  callsMade?: number;
  callsAnswered?: number;
  avgCallDuration?: number;
  script?: string;
}

export interface Call {
  id: string;
  campaignId: string;
  contactName?: string;
  contactPhone?: string;
  contactId?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'transferred';
  startTime?: string;
  endTime?: string;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  notes?: string;
}

// Call status types for different contexts
export type CallStatus = 'idle' | 'calling' | 'connected' | 'completed';
export type DatabaseCallStatus = 'pending' | 'calling' | 'connected' | 'completed' | 'failed' | 'transferred';

// New types for Vapi-like functionality
export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  first_message?: string;
  voice_provider: 'openai' | 'elevenlabs';
  voice_id: string;
  model: string;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface Squad {
  id: string;
  user_id: string;
  name: string;
  configuration: {
    assistants: {
      id: string;
      name: string;
      transfers?: {
        to: string;
        conditions: string[];
        message: string;
      }[];
    }[];
    initial_assistant: string;
  };
  created_at: string;
}

export interface ConversationLog {
  id: string;
  call_id: string;
  speaker: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
  metadata?: any;
}

export interface ProviderKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'deepgram' | 'elevenlabs' | 'signalwire';
  api_key: string;
  created_at: string;
}

export interface CallAnalytics {
  call_id: string;
  summary?: string;
  success_score?: number;
  intent_matched?: string;
  transfer_reason?: string;
  duration?: number;
  analytics?: {
    summary: string;
    intent_matched: string;
    success_score: number;
    key_points: string[];
  };
}

export interface VoiceWebSocketMessage {
  type: 'audio' | 'transcript' | 'response' | 'config' | 'transfer';
  data: any;
  assistantId?: string;
  callId?: string;
  text?: string;
}
