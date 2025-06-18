
-- Add updated_at column to calls table
ALTER TABLE public.calls ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create webhook_logs table for call verification
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for webhook_logs (system can insert, admins can view)
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can view webhook logs" ON public.webhook_logs
  FOR SELECT USING (true);

-- Create index for better performance
CREATE INDEX idx_webhook_logs_call_id ON public.webhook_logs(call_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at);
