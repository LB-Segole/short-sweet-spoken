
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardData = () => {
  // Fetch campaign statistics
  const { data: campaignStats, isLoading: campaignStatsLoading } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('id, status');
      
      if (error) throw error;
      
      const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
      const totalCampaigns = campaigns?.length || 0;
      
      return {
        activeCampaigns,
        totalCampaigns,
        inactiveCampaigns: totalCampaigns - activeCampaigns
      };
    }
  });

  // Fetch call statistics
  const { data: callStats, isLoading: callStatsLoading } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => {
      const { data: calls, error } = await supabase
        .from('calls')
        .select('id, status, duration, created_at, call_cost');
      
      if (error) throw error;
      
      const totalCalls = calls?.length || 0;
      const successfulCalls = calls?.filter(c => c.status === 'completed').length || 0;
      const totalMinutes = calls?.reduce((sum, call) => sum + (call.duration || 0), 0) || 0;
      const totalCost = calls?.reduce((sum, call) => sum + (call.call_cost || 0), 0) || 0;
      
      // Get today's calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysCalls = calls?.filter(call => {
        if (!call.created_at) return false;
        return new Date(call.created_at) >= today;
      }).length || 0;
      
      return {
        totalCalls,
        successfulCalls,
        failedCalls: totalCalls - successfulCalls,
        totalMinutes: Math.floor(totalMinutes / 60),
        todaysCalls,
        totalCost,
        successRate: totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0
      };
    }
  });

  // Fetch recent calls for activity feed
  const { data: recentCalls, isLoading: recentCallsLoading } = useQuery({
    queryKey: ['recent-calls'],
    queryFn: async () => {
      const { data: calls, error } = await supabase
        .from('calls')
        .select(`
          id,
          status,
          created_at,
          duration,
          phone_number,
          call_cost,
          contacts(name, phone),
          campaigns(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return calls || [];
    }
  });

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  return {
    campaignStats,
    callStats,
    recentCalls,
    subscription,
    isLoading: campaignStatsLoading || callStatsLoading || recentCallsLoading || subscriptionLoading
  };
};
