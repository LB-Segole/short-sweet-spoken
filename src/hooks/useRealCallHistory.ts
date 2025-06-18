
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RealCallRecord {
  id: string;
  phone_number: string;
  status: 'completed' | 'failed' | 'busy' | 'no-answer' | 'in-progress';
  duration: number; // in seconds
  call_cost: number;
  created_at: string;
  completed_at?: string;
  recording_url?: string;
  transcript?: string;
  campaign_id?: string;
  contact_id?: string;
  signalwire_call_id?: string;
  call_summary?: string;
  campaigns?: {
    name: string;
  };
  contacts?: {
    name: string;
  };
}

export const useRealCallHistory = (page: number = 1, limit: number = 10) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['real-call-history', page, limit],
    queryFn: async () => {
      const offset = (page - 1) * limit;
      
      // Only fetch calls that have actually been completed (have signalwire_call_id)
      const { data: calls, error, count } = await supabase
        .from('calls')
        .select(`
          id,
          phone_number,
          status,
          duration,
          call_cost,
          created_at,
          completed_at,
          recording_url,
          transcript,
          campaign_id,
          contact_id,
          signalwire_call_id,
          call_summary,
          campaigns(name),
          contacts(name)
        `, { count: 'exact' })
        .not('signalwire_call_id', 'is', null) // Only real calls
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      return {
        calls: calls as RealCallRecord[],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      };
    }
  });

  const refreshCallHistory = () => {
    queryClient.invalidateQueries({ queryKey: ['real-call-history'] });
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
