
export interface VoiceAgent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  voice_model: string;
  voice_settings: {
    speed?: number;
    pitch?: number;
    volume?: number;
    emotion?: string;
  };
  tools: Array<{
    type: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  settings: {
    turn_detection?: {
      type: 'server_vad' | 'push_to_talk';
      threshold?: number;
      silence_duration_ms?: number;
    };
    temperature?: number;
    max_tokens?: number;
    interruption_handling?: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CallSession {
  id: string;
  agent_id: string;
  user_id: string;
  session_type: 'browser' | 'outbound' | 'inbound';
  phone_number?: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  duration_seconds?: number;
  transcript: Array<{
    speaker: 'user' | 'agent';
    text: string;
    timestamp: string;
  }>;
  metadata: Record<string, any>;
  created_at: string;
  ended_at?: string;
}

export interface VoiceAgentFormData {
  name: string;
  description: string;
  system_prompt: string;
  voice_model: string;
  voice_settings: {
    speed: number;
    pitch: number;
    volume: number;
    emotion: string;
  };
  tools: Array<{
    type: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  settings: {
    turn_detection: {
      type: 'server_vad' | 'push_to_talk';
      threshold: number;
      silence_duration_ms: number;
    };
    temperature: number;
    max_tokens: number;
    interruption_handling: boolean;
  };
}
