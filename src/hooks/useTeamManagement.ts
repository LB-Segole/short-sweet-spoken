
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  billing_email?: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_by?: string;
  invited_at?: string;
  joined_at?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export const useTeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTeams(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTeam = async (teamData: { name: string; description?: string; billing_email?: string }): Promise<Team | null> => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('teams')
        .insert({
          ...teamData,
          owner_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setTeams(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Team created successfully",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;
      
      setTeamMembers(data || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  const inviteTeamMember = async (teamId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email,
          role,
          invited_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setTeamInvitations(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: `Invitation sent to ${email}`,
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTeamMemberRole = async (memberId: string, newRole: TeamMember['role']): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );
      
      toast({
        title: "Success",
        description: "Member role updated successfully",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeTeamMember = async (memberId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      
      toast({
        title: "Success",
        description: "Member removed from team",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  return {
    teams,
    teamMembers,
    teamInvitations,
    isLoading,
    error,
    loadTeams,
    createTeam,
    loadTeamMembers,
    inviteTeamMember,
    updateTeamMemberRole,
    removeTeamMember
  };
};
