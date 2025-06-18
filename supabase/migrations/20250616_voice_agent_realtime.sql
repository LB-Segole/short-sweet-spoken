-- Fix missing SUPABASE_URL and enable real-time features
-- Add missing columns and indexes for voice processing

-- Ensure tables exist before adding columns or relationships
-- First, make sure the basic tables exist
DO $$
BEGIN
  -- Create calls table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calls') THEN
    CREATE TABLE public.calls (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
  status TEXT,
      campaign_id UUID,
      contact_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
  END IF;
  
  -- Create campaigns table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaigns') THEN
    CREATE TABLE public.campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;

  -- Create contacts table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'contacts') THEN
    CREATE TABLE public.contacts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT,
      phone TEXT,
      company TEXT,
      user_id UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;

  -- Create webhook_logs table if it doesn't exist
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'webhook_logs') THEN
    CREATE TABLE public.webhook_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id UUID REFERENCES public.calls(id),
      event_type TEXT,
      event_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END
$$;

-- Make sure 'company' column exists in contacts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'company'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN company TEXT;
  END IF;
END
$$;

-- Add missing columns to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS analytics JSONB;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add missing columns to campaigns table for statistics
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS total_calls INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS completed_calls INTEGER DEFAULT 0;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS success_rate DECIMAL DEFAULT 0;

-- Create call_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('agent', 'customer')),
  message TEXT NOT NULL,
  confidence DECIMAL DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

-- Make sure 'confidence' column exists in call_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'call_logs' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE public.call_logs ADD COLUMN confidence DECIMAL DEFAULT 0;
  END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_external_id ON public.calls(external_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_id ON public.call_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON public.call_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_call_id ON public.webhook_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_calls_user_status ON public.calls(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at_status ON public.calls(created_at, status);

-- Enable RLS on all tables
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
DROP POLICY IF EXISTS "Users can view their own calls" ON public.calls;
CREATE POLICY "Users can view their own calls" ON public.calls
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calls" ON public.calls;
CREATE POLICY "Users can insert their own calls" ON public.calls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calls" ON public.calls;
CREATE POLICY "Users can update their own calls" ON public.calls
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for call_logs
DROP POLICY IF EXISTS "Users can view their call logs" ON public.call_logs;
CREATE POLICY "Users can view their call logs" ON public.call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = call_logs.call_id
      AND calls.user_id = auth.uid()
      )
    );

DROP POLICY IF EXISTS "System can insert call logs" ON public.call_logs;
CREATE POLICY "System can insert call logs" ON public.call_logs
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update call logs" ON public.call_logs;
CREATE POLICY "System can update call logs" ON public.call_logs
  FOR UPDATE USING (true);

-- RLS policies for webhook_logs
DROP POLICY IF EXISTS "Users can view their webhook logs" ON public.webhook_logs;
CREATE POLICY "Users can view their webhook logs" ON public.webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calls
      WHERE calls.id = webhook_logs.call_id
      AND calls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert webhook logs" ON public.webhook_logs;
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

-- Create function to update call analytics in real-time
CREATE OR REPLACE FUNCTION public.update_call_analytics()
RETURNS trigger AS $$
BEGIN
  -- Update call analytics when new call log is added
  IF TG_OP = 'INSERT' AND NEW.call_id IS NOT NULL THEN
    UPDATE public.calls
    SET
      analytics = COALESCE(analytics, '{}'::jsonb) || jsonb_build_object(
        'last_message_at', NEW.timestamp,
        'message_count', (
          SELECT COUNT(*)
          FROM public.call_logs
          WHERE call_id = NEW.call_id
        ),
        'avg_confidence', (
          SELECT AVG(confidence)
          FROM public.call_logs
          WHERE call_id = NEW.call_id AND confidence > 0
        )
      ),
      updated_at = now()
    WHERE id = NEW.call_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle call status changes
CREATE OR REPLACE FUNCTION public.handle_call_status_change()
RETURNS trigger AS $$
BEGIN
  -- Log status changes
  INSERT INTO public.webhook_logs (call_id, event_type, event_data)
  VALUES (
    NEW.id,
    'status_change',
    jsonb_build_object(
      'old_status', OLD.status,
      'new_status', NEW.status,
      'changed_at', now()
    )
  );

  -- Update campaign statistics if call is completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.campaigns
    SET
      total_calls = COALESCE(total_calls, 0) + 1,
      completed_calls = COALESCE(completed_calls, 0) + 1,
      updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate campaign success rate
CREATE OR REPLACE FUNCTION public.calculate_campaign_success_rate()
RETURNS trigger AS $$
BEGIN
  -- Calculate success rate based on completed calls
  IF NEW.completed_calls > 0 THEN
    NEW.success_rate = (NEW.completed_calls::decimal / GREATEST(NEW.total_calls, 1)) * 100;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function for real-time call monitoring
CREATE OR REPLACE FUNCTION public.get_active_calls(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE (
  call_id UUID,
  external_id TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT,
  duration INTEGER,
  message_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.external_id,
    co.name,
    co.phone,
    c.status,
    EXTRACT(EPOCH FROM (now() - c.created_at))::INTEGER as duration,
    COUNT(cl.id) as message_count,
    MAX(cl.timestamp) as last_activity
  FROM public.calls c
  LEFT JOIN public.contacts co ON c.contact_id = co.id
  LEFT JOIN public.call_logs cl ON c.id = cl.call_id
  WHERE c.user_id = user_uuid
    AND c.status IN ('ringing', 'answered', 'in-progress')
    AND c.created_at > now() - INTERVAL '1 hour'
  GROUP BY c.id, c.external_id, co.name, co.phone, c.status, c.created_at
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get call transcription
-- Fixing the 'timestamp' column name issue by using a different name
CREATE OR REPLACE FUNCTION public.get_call_transcription(call_uuid UUID)
RETURNS TABLE (
  speaker TEXT,
  message TEXT,
  confidence DECIMAL,
  message_timestamp TIMESTAMP WITH TIME ZONE  -- Changed from 'timestamp' to 'message_timestamp'
) AS $$
BEGIN
  -- Check if user has access to this call
  IF NOT EXISTS (
    SELECT 1 FROM public.calls
    WHERE id = call_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to call transcription';
  END IF;

  RETURN QUERY
  SELECT
    cl.speaker,
    cl.message,
    cl.confidence,
    cl.timestamp
  FROM public.call_logs cl
  WHERE cl.call_id = call_uuid
  ORDER BY cl.timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification function for failed calls
CREATE OR REPLACE FUNCTION public.notify_failed_call()
RETURNS trigger AS $$
BEGIN
  -- Send notification for failed calls
  IF NEW.status IN ('failed', 'busy', 'no-answer') AND OLD.status != NEW.status THEN
    INSERT INTO public.webhook_logs (call_id, event_type, event_data)
    VALUES (
      NEW.id,
      'call_failed_notification',
      jsonb_build_object(
        'reason', NEW.status,
        'contact_id', NEW.contact_id,
        'campaign_id', NEW.campaign_id,
        'failed_at', now()
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers AFTER function definitions
DROP TRIGGER IF EXISTS trigger_update_call_analytics ON public.call_logs;
CREATE TRIGGER trigger_update_call_analytics
  AFTER INSERT OR UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_call_analytics();

DROP TRIGGER IF EXISTS trigger_handle_call_status_change ON public.calls;
CREATE TRIGGER trigger_handle_call_status_change
  AFTER UPDATE OF status ON public.calls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_call_status_change();

DROP TRIGGER IF EXISTS trigger_calculate_campaign_success_rate ON public.campaigns;
CREATE TRIGGER trigger_calculate_campaign_success_rate
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_campaign_success_rate();

DROP TRIGGER IF EXISTS trigger_notify_failed_call ON public.calls;
CREATE TRIGGER trigger_notify_failed_call
  AFTER UPDATE OF status ON public.calls
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_failed_call();

-- Enable real-time subscriptions
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'call_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_logs;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'webhook_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE webhook_logs;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- Publication doesn't exist yet, create it
    CREATE PUBLICATION supabase_realtime FOR TABLE calls, call_logs, webhook_logs;
  WHEN OTHERS THEN
    -- If any other error, just continue
    NULL;
END
$$;

-- Create view for call analytics dashboard with safe column references
CREATE OR REPLACE VIEW public.call_analytics_view AS
WITH contact_info AS (
  SELECT
    c.id AS contact_id,
    c.name,
    c.phone,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'company'
      )
      THEN c.company
      ELSE NULL::TEXT
    END AS company
  FROM public.contacts c
),
call_log_stats AS (
  SELECT
    cl.call_id,
    COUNT(cl.id) as message_count,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'call_logs' AND column_name = 'confidence'
      )
      THEN AVG(cl.confidence)
      ELSE NULL::DECIMAL
    END as avg_confidence,
    MIN(cl.timestamp) as first_message_at,
    MAX(cl.timestamp) as last_message_at
  FROM public.call_logs cl
  GROUP BY cl.call_id
)
SELECT
  c.id,
  c.external_id,
  c.status,
  CASE
    WHEN c.ended_at IS NOT NULL THEN EXTRACT(EPOCH FROM (c.ended_at - c.created_at))::INTEGER
    ELSE NULL
  END as duration,
  c.created_at,
  c.ended_at,
  c.analytics,
  c.summary,
  co.name as contact_name,
  co.phone as contact_phone,
  co.company as contact_company,
  camp.name as campaign_name,
  COALESCE(cls.message_count, 0) as message_count,
  cls.avg_confidence,
  cls.first_message_at,
  cls.last_message_at
FROM public.calls c
LEFT JOIN contact_info co ON c.contact_id = co.contact_id
LEFT JOIN public.campaigns camp ON c.campaign_id = camp.id
LEFT JOIN call_log_stats cls ON c.id = cls.call_id;

-- Grant permissions for the view
GRANT SELECT ON public.call_analytics_view TO authenticated;

-- Insert default assistant if none exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM public.assistants
    WHERE user_id = auth.uid()
    LIMIT 1
  ) THEN
    INSERT INTO public.assistants (
      user_id,
      name,
      system_prompt,
      first_message,
      voice_provider,
      voice_id,
      model,
      temperature,
      max_tokens
    )
    VALUES (
      auth.uid(),
      'Default Sales Assistant',
      'You are Sarah, a professional AI sales assistant for First Choice Solutions LLC. Be friendly, helpful, and focus on understanding customer needs.',
      'Hello! This is Sarah from First Choice Solutions. How can I help your business today?',
      'openai',
      'alloy',
      'gpt-4',
      0.8,
      500
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Continue even if there's an error with the insertion
    NULL;
END
$$;

-- Add comment for documentation
COMMENT ON TABLE public.call_logs IS 'Stores real-time conversation logs for voice calls';
COMMENT ON TABLE public.webhook_logs IS 'Stores webhook events and system logs for call processing';
COMMENT ON VIEW public.call_analytics_view IS 'Aggregated view for call analytics and reporting';
COMMENT ON FUNCTION public.get_active_calls IS 'Returns currently active calls for real-time monitoring';
COMMENT ON FUNCTION public.get_call_transcription IS 'Returns full transcription for a specific call';