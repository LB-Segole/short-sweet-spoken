-- Fix foreign key constraints for calls table to allow proper agent deletion
-- This migration addresses the issue where agents cannot be deleted due to foreign key constraints

-- First, drop the existing foreign key constraint
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_assistant_id_fkey;

-- Recreate the foreign key constraint with ON DELETE SET NULL
-- This allows deleting agents while preserving call history
ALTER TABLE public.calls 
ADD CONSTRAINT calls_assistant_id_fkey 
FOREIGN KEY (assistant_id) 
REFERENCES public.assistants(id) 
ON DELETE SET NULL;

-- Also fix the squad_id foreign key constraint
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_squad_id_fkey;

ALTER TABLE public.calls 
ADD CONSTRAINT calls_squad_id_fkey 
FOREIGN KEY (squad_id) 
REFERENCES public.squads(id) 
ON DELETE SET NULL;

-- Add index for better performance on assistant_id lookups
CREATE INDEX IF NOT EXISTS idx_calls_assistant_id_status ON public.calls(assistant_id, status);

-- Add index for better performance on squad_id lookups
CREATE INDEX IF NOT EXISTS idx_calls_squad_id_status ON public.calls(squad_id, status);

-- Add a function to safely delete agents with proper cleanup
CREATE OR REPLACE FUNCTION public.safe_delete_assistant(assistant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    active_calls_count INTEGER;
BEGIN
    -- Check for active calls
    SELECT COUNT(*) INTO active_calls_count
    FROM public.calls 
    WHERE assistant_id = assistant_uuid 
    AND status NOT IN ('completed', 'failed', 'busy', 'no-answer');
    
    -- If there are active calls, prevent deletion
    IF active_calls_count > 0 THEN
        RAISE EXCEPTION 'Cannot delete assistant with % active calls', active_calls_count;
    END IF;
    
    -- Update all associated calls to set assistant_id to NULL
    UPDATE public.calls 
    SET assistant_id = NULL, updated_at = NOW()
    WHERE assistant_id = assistant_uuid;
    
    -- Delete the assistant
    DELETE FROM public.assistants WHERE id = assistant_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.safe_delete_assistant(UUID) TO authenticated;

-- Add RLS policy for the function
CREATE POLICY "Users can safely delete their own assistants" ON public.assistants
FOR DELETE USING (
    auth.uid() = user_id AND 
    NOT EXISTS (
        SELECT 1 FROM public.calls 
        WHERE assistant_id = assistants.id 
        AND status NOT IN ('completed', 'failed', 'busy', 'no-answer')
    )
);

-- Log the migration
INSERT INTO public.webhook_logs (event_type, event_data) 
VALUES ('migration', jsonb_build_object(
    'migration', '20250620000000_fix_foreign_key_constraints',
    'description', 'Fixed foreign key constraints for calls table',
    'timestamp', NOW()
)); 