
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CallRecord {
  id: string;
  phone_number?: string;
  status: string;
  duration?: number;
  call_cost?: number;
  created_at: string;
  completed_at?: string;
  transcript?: string;
  recording_url?: string;
  campaign_id?: string;
  contact_id?: string;
  campaigns?: {
    name: string;
  };
  contacts?: {
    name: string;
    phone: string;
  };
}

export const useCallHistory = (page: number = 1, limit: number = 10) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['call-history', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      const { data: calls, error, count } = await supabase
        .from('calls')
        .select(`
          *,
          campaigns(name),
          contacts(name, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        calls: calls as CallRecord[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    }
  });

  const refreshCallHistory = () => {
    queryClient.invalidateQueries({ queryKey: ['call-history'] });
  };

  return {
    calls: data?.calls || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refreshCallHistory
  };
};
