
-- Create the voice_agents table that the agents function expects
CREATE TABLE public.voice_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  first_message TEXT,
  voice_provider TEXT DEFAULT 'deepgram',
  voice_id TEXT DEFAULT 'aura-asteria-en',
  model TEXT DEFAULT 'nova-2',
  temperature NUMERIC DEFAULT 0.8,
  max_tokens INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.voice_agents ENABLE ROW LEVEL SECURITY;

-- Create policies for voice_agents
CREATE POLICY "Users can view their own voice agents" 
  ON public.voice_agents 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own voice agents" 
  ON public.voice_agents 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own voice agents" 
  ON public.voice_agents 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own voice agents" 
  ON public.voice_agents 
  FOR DELETE 
  USING (auth.uid() = user_id);
