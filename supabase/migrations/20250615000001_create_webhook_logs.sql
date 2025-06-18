
-- Create webhook_logs table for debugging and monitoring
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  call_sid TEXT,
  status TEXT,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for webhook_logs (system can insert, admins can view)
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can view webhook logs" ON public.webhook_logs
  FOR SELECT USING (true);
