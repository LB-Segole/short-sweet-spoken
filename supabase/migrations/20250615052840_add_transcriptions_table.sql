
-- Drop existing policies for assistants table if they exist
DROP POLICY IF EXISTS "Users can view their own assistants" ON public.assistants;
DROP POLICY IF EXISTS "Users can create their own assistants" ON public.assistants;
DROP POLICY IF EXISTS "Users can update their own assistants" ON public.assistants;
DROP POLICY IF EXISTS "Users can delete their own assistants" ON public.assistants;
DROP POLICY IF EXISTS "Users can manage their own assistants" ON public.assistants;

-- Create comprehensive RLS policies for assistants that allow all operations
CREATE POLICY "Users can manage their own assistants" ON public.assistants
  FOR ALL USING (auth.uid() = user_id);
