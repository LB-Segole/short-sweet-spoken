
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';
import { Assistant, AssistantFormData } from '@/types/assistant';

export const useAssistants = () => {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAssistants = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showErrorToast('Please log in to view AI agents', 'Authentication required');
        return;
      }

      console.log('Making GET request to load assistants');
      const { data, error } = await supabase.functions.invoke('agents', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Response from agents function:', { data, error });

      if (error) {
        console.error('Response error:', error);
        throw error;
      }

      if (data?.success && data?.agents) {
        console.log('Setting assistants data:', data.agents);
        setAssistants(Array.isArray(data.agents) ? data.agents : []);
      } else {
        setAssistants([]);
      }
    } catch (error) {
      console.error('Error loading AI agents:', error);
      showErrorToast(error, 'Failed to load AI agents');
    } finally {
      setIsLoading(false);
    }
  };

  const createAssistant = async (formData: AssistantFormData) => {
    if (!formData.name || !formData.system_prompt) {
      showErrorToast('Please fill in all required fields', 'Validation error');
      return false;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showErrorToast('Please log in to create AI agents', 'Authentication required');
        return false;
      }

      const requestBody = {
        name: formData.name.trim(),
        system_prompt: formData.system_prompt.trim(),
        first_message: formData.first_message.trim(),
        voice_provider: formData.voice_provider || 'deepgram',
        voice_id: formData.voice_id.trim(),
        model: formData.model,
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens)
      };

      console.log('Creating assistant with data:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('agents', {
        method: 'POST',
        body: requestBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Create response:', { data, error });

      if (error) {
        console.error('Create error:', error);
        throw error;
      }

      if (data?.success && data?.agent) {
        console.log('Assistant created successfully, adding to list:', data.agent);
        setAssistants(prev => [data.agent, ...prev]);
        showSuccessToast('AI agent created successfully');
        return true;
      } else {
        console.error('Invalid assistant data received:', data);
        throw new Error(data?.error || 'Invalid response from server');
      }
    } catch (error) {
      console.error('Error creating AI agent:', error);
      showErrorToast(error, 'Failed to create AI agent. Please try again.');
    }
    return false;
  };

  const updateAssistant = async (assistant: Assistant, formData: AssistantFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showErrorToast('Please log in to update AI agents', 'Authentication required');
        return false;
      }

      const requestBody = {
        id: assistant.id, // Include the agent ID
        name: formData.name.trim(),
        system_prompt: formData.system_prompt.trim(),
        first_message: formData.first_message.trim(),
        voice_provider: formData.voice_provider || 'deepgram',
        voice_id: formData.voice_id.trim(),
        model: formData.model,
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens)
      };

      console.log('Updating assistant with data:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('agents', {
        method: 'PUT',
        body: requestBody,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Update response:', { data, error });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      if (data?.success && data?.agent) {
        setAssistants(prev => prev.map(a => 
          a.id === assistant.id ? data.agent : a
        ));
        showSuccessToast('AI agent updated successfully');
        return true;
      } else {
        throw new Error(data?.error || 'Failed to update assistant');
      }
    } catch (error) {
      console.error('Error updating AI agent:', error);
      showErrorToast(error, 'Failed to update AI agent');
    }
    return false;
  };

  const deleteAssistant = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI agent?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('agents', {
        method: 'DELETE',
        body: { id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setAssistants(prev => prev.filter(a => a.id !== id));
        showSuccessToast('AI agent deleted successfully');
      } else {
        throw new Error(data?.error || 'Failed to delete assistant');
      }
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      showErrorToast(error, 'Failed to delete AI agent');
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  return {
    assistants,
    isLoading,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    loadAssistants
  };
};
