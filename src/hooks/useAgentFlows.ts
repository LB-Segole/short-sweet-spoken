
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface AgentFlow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  flow_data: {
    nodes: any[];
    edges: any[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useAgentFlows = () => {
  const [flows, setFlows] = useState<AgentFlow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadFlows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('agent_flows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setFlows(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flows';
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

  const createFlow = async (flowData: Omit<AgentFlow, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<AgentFlow | null> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('agent_flows')
        .insert(flowData)
        .select()
        .single();

      if (error) throw error;
      
      setFlows(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Agent flow created successfully",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create flow';
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

  const updateFlow = async (id: string, updates: Partial<AgentFlow>): Promise<AgentFlow | null> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('agent_flows')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setFlows(prev => prev.map(flow => flow.id === id ? data : flow));
      
      toast({
        title: "Success",
        description: "Agent flow updated successfully",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update flow';
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

  const deleteFlow = async (id: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('agent_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFlows(prev => prev.filter(flow => flow.id !== id));
      
      toast({
        title: "Success",
        description: "Agent flow deleted successfully",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete flow';
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
    loadFlows();
  }, []);

  return {
    flows,
    isLoading,
    error,
    loadFlows,
    createFlow,
    updateFlow,
    deleteFlow
  };
};
