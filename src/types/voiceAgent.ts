
export interface VoiceAgent {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  system_prompt: string;
  voice_model: string;
  voice_settings: Record<string, any>;
  tools: any[];
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceAgentFormData {
  name: string;
  description?: string;
  system_prompt: string;
  voice_model: string;
  voice_settings: Record<string, any>;
  tools: any[];
  settings: Record<string, any>;
}

export interface VoiceTestResult {
  success: boolean;
  message: string;
  transcript?: string;
  response?: string;
  error?: string;
}
