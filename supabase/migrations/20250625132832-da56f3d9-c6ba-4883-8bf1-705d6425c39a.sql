
-- Create missing tables for agent orchestration and team management
-- Use IF NOT EXISTS and DROP IF EXISTS to handle existing objects

-- Create agent_flows table for visual flow configurations
CREATE TABLE IF NOT EXISTS public.agent_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  flow_data JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for agent_flows
ALTER TABLE public.agent_flows ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_flows (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own flows" ON public.agent_flows;
CREATE POLICY "Users can view their own flows" ON public.agent_flows
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own flows" ON public.agent_flows;
CREATE POLICY "Users can create their own flows" ON public.agent_flows
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own flows" ON public.agent_flows;
CREATE POLICY "Users can update their own flows" ON public.agent_flows
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own flows" ON public.agent_flows;
CREATE POLICY "Users can delete their own flows" ON public.agent_flows
  FOR DELETE USING (auth.uid() = user_id);

-- Add foreign key constraints for existing tables (only if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_chain_executions_chain_id') THEN
        ALTER TABLE public.chain_executions 
        ADD CONSTRAINT fk_chain_executions_chain_id 
        FOREIGN KEY (chain_id) REFERENCES public.agent_chains(id) ON DELETE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_chain_executions_call_id') THEN
        ALTER TABLE public.chain_executions 
        ADD CONSTRAINT fk_chain_executions_call_id 
        FOREIGN KEY (call_id) REFERENCES public.calls(id) ON DELETE SET NULL;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_chain_steps_chain_id') THEN
        ALTER TABLE public.chain_steps 
        ADD CONSTRAINT fk_chain_steps_chain_id 
        FOREIGN KEY (chain_id) REFERENCES public.agent_chains(id) ON DELETE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_chain_steps_agent_id') THEN
        ALTER TABLE public.chain_steps 
        ADD CONSTRAINT fk_chain_steps_agent_id 
        FOREIGN KEY (agent_id) REFERENCES public.assistants(id) ON DELETE SET NULL;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_chain_steps_flow_id') THEN
        ALTER TABLE public.chain_steps 
        ADD CONSTRAINT fk_chain_steps_flow_id 
        FOREIGN KEY (flow_id) REFERENCES public.agent_flows(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Enable RLS for chain_executions and chain_steps
ALTER TABLE public.chain_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_steps ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chain_executions (drop if exists first)
DROP POLICY IF EXISTS "Users can view executions of their chains" ON public.chain_executions;
CREATE POLICY "Users can view executions of their chains" ON public.chain_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create executions for their chains" ON public.chain_executions;
CREATE POLICY "Users can create executions for their chains" ON public.chain_executions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update executions of their chains" ON public.chain_executions;
CREATE POLICY "Users can update executions of their chains" ON public.chain_executions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for chain_steps (drop if exists first)
DROP POLICY IF EXISTS "Users can view steps of their chains" ON public.chain_steps;
CREATE POLICY "Users can view steps of their chains" ON public.chain_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create steps for their chains" ON public.chain_steps;
CREATE POLICY "Users can create steps for their chains" ON public.chain_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update steps of their chains" ON public.chain_steps;
CREATE POLICY "Users can update steps of their chains" ON public.chain_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete steps of their chains" ON public.chain_steps;
CREATE POLICY "Users can delete steps of their chains" ON public.chain_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_id AND user_id = auth.uid()
    )
  );

-- Enable RLS for agent_chains
ALTER TABLE public.agent_chains ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_chains (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own chains" ON public.agent_chains;
CREATE POLICY "Users can view their own chains" ON public.agent_chains
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own chains" ON public.agent_chains;
CREATE POLICY "Users can create their own chains" ON public.agent_chains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chains" ON public.agent_chains;
CREATE POLICY "Users can update their own chains" ON public.agent_chains
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chains" ON public.agent_chains;
CREATE POLICY "Users can delete their own chains" ON public.agent_chains
  FOR DELETE USING (auth.uid() = user_id);

-- Create activity_logs table for audit trails
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_logs (drop if exists first)
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Team members can view team activity logs" ON public.activity_logs;
CREATE POLICY "Team members can view team activity logs" ON public.activity_logs
  FOR SELECT USING (
    team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = activity_logs.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create activity logs" ON public.activity_logs;
CREATE POLICY "Users can create activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Enable RLS for team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_invitations (drop if exists first)
DROP POLICY IF EXISTS "Team members can view team invitations" ON public.team_invitations;
CREATE POLICY "Team members can view team invitations" ON public.team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = team_invitations.team_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can create invitations" ON public.team_invitations;
CREATE POLICY "Team members can create invitations" ON public.team_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = team_invitations.team_id AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Enable RLS for teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams (drop if exists first, handling the existing one)
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
CREATE POLICY "Team members can view their teams" ON public.teams
  FOR SELECT USING (
    auth.uid() = owner_id OR EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create teams" ON public.teams;
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Team owners can update their teams" ON public.teams;
CREATE POLICY "Team owners can update their teams" ON public.teams
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Team owners can delete their teams" ON public.teams;
CREATE POLICY "Team owners can delete their teams" ON public.teams
  FOR DELETE USING (auth.uid() = owner_id);

-- Enable RLS for team_members table
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team_members (drop if exists first)
DROP POLICY IF EXISTS "Team members can view team membership" ON public.team_members;
CREATE POLICY "Team members can view team membership" ON public.team_members
  FOR SELECT USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team admins can manage team membership" ON public.team_members;
CREATE POLICY "Team admins can manage team membership" ON public.team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = team_members.team_id AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Create function to automatically add team owner as member
CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS add_team_owner_as_member_trigger ON public.teams;
CREATE TRIGGER add_team_owner_as_member_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_owner_as_member();

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_chain_executions_chain_id ON public.chain_executions(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_executions_status ON public.chain_executions(status);
CREATE INDEX IF NOT EXISTS idx_chain_steps_chain_id ON public.chain_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_team_id ON public.activity_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
