
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Campaign } from '@/types';

export const useCampaigns = () => {
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns, isLoading, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Campaign[];
    }
  });

  // Create campaign mutation
  const createCampaign = useMutation({
    mutationFn: async (campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([campaignData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campaign created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    }
  });

  // Update campaign mutation
  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campaign updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update campaign: ${error.message}`);
    }
  });

  // Delete campaign mutation
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
      toast.success('Campaign deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete campaign: ${error.message}`);
    }
  });

  return {
    campaigns: campaigns || [],
    isLoading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign
  };
};
