
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
      const { data, error } = await supabase.functions.invoke('assistants', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('Response from assistants function:', { data, error });

      if (error) {
        console.error('Response error:', error);
        throw error;
      }

      if (data) {
        console.log('Setting assistants data:', data);
        console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
        setAssistants(Array.isArray(data) ? data : []);
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
        voice_provider: formData.voice_provider,
        voice_id: formData.voice_id.trim(),
        model: formData.model,
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens)
      };

      console.log('Creating assistant with data:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('assistants', {
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

      if (data && typeof data === 'object' && data.id) {
        console.log('Assistant created successfully, adding to list:', data);
        setAssistants(prev => [data, ...prev]);
        showSuccessToast('AI agent created successfully');
        return true;
      } else {
        console.error('Invalid assistant data received:', data);
        throw new Error('Invalid response from server');
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
        id: assistant.id,
        name: formData.name.trim(),
        system_prompt: formData.system_prompt.trim(),
        first_message: formData.first_message.trim(),
        voice_provider: formData.voice_provider,
        voice_id: formData.voice_id.trim(),
        model: formData.model,
        temperature: Number(formData.temperature),
        max_tokens: Number(formData.max_tokens)
      };

      console.log('Updating assistant with data:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('assistants', {
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

      if (data) {
        setAssistants(prev => prev.map(a => 
          a.id === assistant.id ? data : a
        ));
        showSuccessToast('AI agent updated successfully');
        return true;
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

      const { error } = await supabase.functions.invoke('assistants', {
        method: 'DELETE',
        body: { id },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw error;
      }

      setAssistants(prev => prev.filter(a => a.id !== id));
      showSuccessToast('AI agent deleted successfully');
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
