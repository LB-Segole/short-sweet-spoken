
-- Update the check constraint on the calls table to allow 'initiated' status
ALTER TABLE public.calls 
DROP CONSTRAINT IF EXISTS calls_status_check;

-- Add a new check constraint that includes 'initiated' status
ALTER TABLE public.calls 
ADD CONSTRAINT calls_status_check 
CHECK (status IN ('pending', 'initiated', 'calling', 'ringing', 'answered', 'in-progress', 'completed', 'failed', 'busy', 'no-answer', 'cancelled'));
