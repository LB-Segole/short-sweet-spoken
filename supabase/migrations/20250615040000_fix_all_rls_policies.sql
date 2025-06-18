
-- Enable RLS on all public tables that don't have it yet
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for contacts
CREATE POLICY "Users can manage their own contacts" ON public.contacts
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for campaigns  
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for calls
CREATE POLICY "Users can manage their own calls" ON public.calls
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for assistants
CREATE POLICY "Users can manage their own assistants" ON public.assistants
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for squads
CREATE POLICY "Users can manage their own squads" ON public.squads
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for conversation_logs
CREATE POLICY "Users can view conversation logs for their own calls" ON public.conversation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calls 
      WHERE calls.id = conversation_logs.call_id 
      AND calls.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert conversation logs" ON public.conversation_logs
  FOR INSERT WITH CHECK (true);

-- Create comprehensive RLS policies for provider_keys
CREATE POLICY "Users can manage their own provider keys" ON public.provider_keys
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for user_profiles
CREATE POLICY "Users can manage their own profile" ON public.user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for subscriptions
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage subscriptions" ON public.subscriptions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update subscriptions" ON public.subscriptions
  FOR UPDATE USING (true);
