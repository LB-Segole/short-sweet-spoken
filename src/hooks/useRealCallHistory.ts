
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
      
      // Transform the data to match our interface
      const transformedCalls: RealCallRecord[] = (calls || []).map(call => ({
        id: call.id || '',
        phone_number: call.phone_number || '',
        status: call.status as RealCallRecord['status'] || 'failed',
        duration: call.duration || 0,
        call_cost: call.call_cost || 0,
        created_at: call.created_at || '',
        completed_at: call.completed_at || undefined,
        recording_url: call.recording_url || undefined,
        transcript: call.transcript || undefined,
        campaign_id: call.campaign_id || undefined,
        contact_id: call.contact_id || undefined,
        signalwire_call_id: call.signalwire_call_id || undefined,
        call_summary: call.call_summary || undefined,
        campaigns: call.campaigns && Array.isArray(call.campaigns) && call.campaigns[0] 
          ? { name: call.campaigns[0].name || '' }
          : undefined,
        contacts: call.contacts && Array.isArray(call.contacts) && call.contacts[0]
          ? { name: call.contacts[0].name || '' }
          : undefined,
      }));
      
      return {
        calls: transformedCalls,
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
