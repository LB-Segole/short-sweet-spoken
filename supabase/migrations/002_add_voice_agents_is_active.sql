
-- Add missing is_active column to voice_agents table
ALTER TABLE public.voice_agents 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to have is_active = true
UPDATE public.voice_agents 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for better performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_voice_agents_is_active 
ON public.voice_agents(is_active);

-- Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for voice_agents table
DROP TRIGGER IF EXISTS update_voice_agents_updated_at ON public.voice_agents;
CREATE TRIGGER update_voice_agents_updated_at
    BEFORE UPDATE ON public.voice_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
