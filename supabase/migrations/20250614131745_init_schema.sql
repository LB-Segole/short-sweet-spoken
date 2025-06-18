
-- Create user profiles table for API key management
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  api_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  organization_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assistants table for multi-agent support
CREATE TABLE public.assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  first_message TEXT,
  voice_provider TEXT DEFAULT 'openai',
  voice_id TEXT DEFAULT 'alloy',
  model TEXT DEFAULT 'gpt-4o',
  temperature DECIMAL DEFAULT 0.8,
  max_tokens INTEGER DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create squads table for multi-agent conversations
CREATE TABLE public.squads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced calls table with analytics
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS assistant_id UUID REFERENCES public.assistants(id);
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS squad_id UUID REFERENCES public.squads(id);
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS call_summary TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS success_score INTEGER;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS intent_matched TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS transfer_reason TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS analytics JSONB;

-- Create conversation_logs table for detailed conversation tracking
CREATE TABLE public.conversation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL, -- 'user', 'assistant', 'system'
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create provider_keys table for API key management
CREATE TABLE public.provider_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'openai', 'deepgram', 'elevenlabs', 'signalwire'
  api_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Assistants policies
CREATE POLICY "Users can view their own assistants" ON public.assistants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assistants" ON public.assistants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assistants" ON public.assistants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assistants" ON public.assistants FOR DELETE USING (auth.uid() = user_id);

-- Squads policies
CREATE POLICY "Users can view their own squads" ON public.squads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own squads" ON public.squads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own squads" ON public.squads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own squads" ON public.squads FOR DELETE USING (auth.uid() = user_id);

-- Conversation logs policies
CREATE POLICY "Users can view conversation logs for their calls" ON public.conversation_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.calls WHERE calls.id = conversation_logs.call_id AND calls.campaign_id IN (
    SELECT campaigns.id FROM public.campaigns WHERE campaigns.created_at IS NOT NULL
  ))
);

-- Provider keys policies
CREATE POLICY "Users can view their own provider keys" ON public.provider_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own provider keys" ON public.provider_keys FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, organization_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Personal'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_assistants_user_id ON public.assistants(user_id);
CREATE INDEX idx_calls_assistant_id ON public.calls(assistant_id);
CREATE INDEX idx_conversation_logs_call_id ON public.conversation_logs(call_id);
CREATE INDEX idx_provider_keys_user_id ON public.provider_keys(user_id);
