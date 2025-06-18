
-- Fix 1: Enable RLS on call_logs table
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_logs table
CREATE POLICY "Users can view call logs for their own calls" ON public.call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calls 
      WHERE calls.id = call_logs.call_id 
      AND calls.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert call logs" ON public.call_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update call logs" ON public.call_logs
  FOR UPDATE USING (true);

-- Fix 2: Update handle_new_user function to have immutable search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, organization_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'organization_name', 'Personal'));
  RETURN NEW;
END;
$$;

-- Fix 3: Also update handle_new_user_subscription function for consistency
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, plan, trial_start, trial_end)
  VALUES (
    NEW.id, 
    'trial', 
    'free', 
    now(), 
    now() + INTERVAL '30 days'
  );
  RETURN NEW;
END;
$$;
