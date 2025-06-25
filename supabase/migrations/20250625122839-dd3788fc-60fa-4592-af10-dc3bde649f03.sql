
-- Create tables for agent orchestration and chaining
CREATE TABLE public.agent_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  configuration JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual chain steps
CREATE TABLE public.chain_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES public.agent_chains(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  agent_id UUID REFERENCES public.assistants(id),
  flow_id UUID, -- Reference to agent flows when implemented
  conditions JSONB DEFAULT '{}',
  fallback_step_id UUID REFERENCES public.chain_steps(id),
  timeout_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for chain executions and monitoring
CREATE TABLE public.chain_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES public.agent_chains(id),
  call_id UUID REFERENCES public.calls(id),
  current_step_id UUID REFERENCES public.chain_steps(id),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'timeout')),
  execution_log JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Create table for team management
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  billing_email TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for team members and roles
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(team_id, user_id)
);

-- Create table for agent templates in marketplace
CREATE TABLE public.agent_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  template_data JSONB NOT NULL,
  created_by UUID NOT NULL,
  team_id UUID REFERENCES public.teams(id),
  is_public BOOLEAN NOT NULL DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for template ratings and reviews
CREATE TABLE public.template_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.agent_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);

-- Add RLS policies for agent chains
ALTER TABLE public.agent_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent chains
CREATE POLICY "Users can manage their own agent chains" 
  ON public.agent_chains 
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage chain steps for their chains" 
  ON public.chain_steps 
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_steps.chain_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view chain executions for their chains" 
  ON public.chain_executions 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_chains 
      WHERE id = chain_executions.chain_id AND user_id = auth.uid()
    )
  );

-- RLS policies for teams
CREATE POLICY "Team members can view their teams" 
  ON public.teams 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners can update their teams" 
  ON public.teams 
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" 
  ON public.teams 
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- RLS policies for team members
CREATE POLICY "Team members can view team membership" 
  ON public.team_members 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm 
      WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
    )
  );

-- RLS policies for agent templates
CREATE POLICY "Users can view public templates or their own" 
  ON public.agent_templates 
  FOR SELECT
  USING (
    is_public = true OR 
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE team_id = agent_templates.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates" 
  ON public.agent_templates 
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" 
  ON public.agent_templates 
  FOR UPDATE
  USING (created_by = auth.uid());

-- RLS policies for template reviews
CREATE POLICY "Users can view all reviews" 
  ON public.template_reviews 
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews" 
  ON public.template_reviews 
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" 
  ON public.template_reviews 
  FOR UPDATE
  USING (user_id = auth.uid());

-- Create function to update template ratings
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_templates 
  SET 
    rating_average = (
      SELECT AVG(rating)::NUMERIC(3,2) 
      FROM public.template_reviews 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.template_reviews 
      WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
    )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update ratings
CREATE TRIGGER update_template_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.template_reviews
  FOR EACH ROW EXECUTE FUNCTION update_template_rating();
