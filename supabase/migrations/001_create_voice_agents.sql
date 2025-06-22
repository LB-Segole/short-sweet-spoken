
-- Create voice_agents table for managing multiple AI agents
CREATE TABLE IF NOT EXISTS public.voice_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  voice_model TEXT NOT NULL DEFAULT 'aura-2-asteria-en',
  voice_settings JSONB DEFAULT '{}',
  tools JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.voice_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents" 
  ON public.voice_agents 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents" 
  ON public.voice_agents 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" 
  ON public.voice_agents 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" 
  ON public.voice_agents 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create call_sessions table for tracking voice interactions
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.voice_agents(id) NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('browser', 'outbound', 'inbound')),
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled')),
  duration_seconds INTEGER,
  transcript JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS for call_sessions
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call sessions" 
  ON public.call_sessions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call sessions" 
  ON public.call_sessions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call sessions" 
  ON public.call_sessions 
  FOR UPDATE 
  USING (auth.uid() = user_id);
