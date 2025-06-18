
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
    phone?: string;
    company?: string;
    organization_name?: string;
    country?: string;
    address?: string;
    organization?: string;
  };
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface Assistant {
  id: string;
  name: string;
  system_prompt: string;
  first_message?: string;
  voice_provider?: string;
  voice_id?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'draft';
  total_calls?: number;
  completed_calls?: number;
  success_rate?: number;
  script_id?: string;
  script?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  assistant_id?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  custom_fields?: any;
  campaign_id?: string;
  user_id?: string;
  created_at?: string;
}

export interface Call {
  id: string;
  phone_number?: string;
  status: string;
  duration: number;
  call_cost: number;
  created_at: string;
  completed_at?: string;
  ended_at?: string;
  recording_url?: string;
  transcript?: string;
  summary?: string;
  signalwire_call_id?: string;
  external_id?: string;
  contact_id?: string;
  campaign_id?: string;
  assistant_id?: string;
  user_id?: string;
  analytics?: any;
  success_score?: number;
  call_summary?: string;
  intent_matched?: string;
  transfer_reason?: string;
  updated_at?: string;
  squad_id?: string;
}

export interface VerificationCheck {
  id: string;
  type: 'signalwire_api' | 'call_connection' | 'audio_stream' | 'ai_response' | 'call_status' | 'webhook_response' | 'ring_timeout';
  status: 'pending' | 'passed' | 'failed';
  details: string;
  timestamp: string;
}

export interface VerificationSession {
  callId: string;
  sessionId: string;
  phoneNumber: string;
  checks: VerificationCheck[];
  startTime: string;
  lastUpdate: string;
  status: 'running' | 'completed' | 'failed';
  overallStatus: 'checking' | 'verified' | 'failed';
}
