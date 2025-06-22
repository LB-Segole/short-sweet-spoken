
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { VoiceAgent, VoiceAgentFormData } from '@/types/voiceAgent';

export const useVoiceAgents = () => {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('voice_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAgents(data || []);
    } catch (err) {
      console.error('Error loading voice agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const createAgent = async (formData: VoiceAgentFormData): Promise<VoiceAgent | null> => {
    try {
      const { data, error } = await supabase
        .from('voice_agents')
        .insert({
          name: formData.name,
          description: formData.description,
          system_prompt: formData.system_prompt,
          voice_model: formData.voice_model,
          voice_settings: formData.voice_settings,
          tools: formData.tools,
          settings: formData.settings,
        })
        .select()
        .single();

      if (error) throw error;
      
      setAgents(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error creating voice agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      return null;
    }
  };

  const updateAgent = async (id: string, formData: VoiceAgentFormData): Promise<VoiceAgent | null> => {
    try {
      const { data, error } = await supabase
        .from('voice_agents')
        .update({
          name: formData.name,
          description: formData.description,
          system_prompt: formData.system_prompt,
          voice_model: formData.voice_model,
          voice_settings: formData.voice_settings,
          tools: formData.tools,
          settings: formData.settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setAgents(prev => prev.map(agent => agent.id === id ? data : agent));
      return data;
    } catch (err) {
      console.error('Error updating voice agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      return null;
    }
  };

  const deleteAgent = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voice_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setAgents(prev => prev.filter(agent => agent.id !== id));
      return true;
    } catch (err) {
      console.error('Error deleting voice agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      return false;
    }
  };

  const toggleAgentStatus = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('voice_agents')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setAgents(prev => prev.map(agent => 
        agent.id === id ? { ...agent, is_active: isActive } : agent
      ));
      return true;
    } catch (err) {
      console.error('Error toggling agent status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle agent status');
      return false;
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  return {
    agents,
    isLoading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
  };
};
