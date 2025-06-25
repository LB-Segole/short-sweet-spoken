
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useDashboardData = () => {
  // Fetch campaign statistics
  const { data: campaignStats, isLoading: campaignStatsLoading, error: campaignStatsError } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      try {
        const { data: campaigns, error } = await supabase
          .from('campaigns')
          .select('id, status');
        
        if (error) {
          console.warn('Campaign stats error:', error);
          return { activeCampaigns: 0, totalCampaigns: 0, inactiveCampaigns: 0 };
        }
        
        const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
        const totalCampaigns = campaigns?.length || 0;
        
        return {
          activeCampaigns,
          totalCampaigns,
          inactiveCampaigns: totalCampaigns - activeCampaigns
        };
      } catch (error) {
        console.warn('Campaign stats fetch failed:', error);
        return { activeCampaigns: 0, totalCampaigns: 0, inactiveCampaigns: 0 };
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch call statistics
  const { data: callStats, isLoading: callStatsLoading, error: callStatsError } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => {
      try {
        const { data: calls, error } = await supabase
          .from('calls')
          .select('id, status, duration, created_at, call_cost');
        
        if (error) {
          console.warn('Call stats error:', error);
          return {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalMinutes: 0,
            todaysCalls: 0,
            totalCost: 0,
            successRate: 0
          };
        }
        
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
      } catch (error) {
        console.warn('Call stats fetch failed:', error);
        return {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalMinutes: 0,
          todaysCalls: 0,
          totalCost: 0,
          successRate: 0
        };
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch recent calls for activity feed
  const { data: recentCalls, isLoading: recentCallsLoading, error: recentCallsError } = useQuery({
    queryKey: ['recent-calls'],
    queryFn: async () => {
      try {
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
        
        if (error) {
          console.warn('Recent calls error:', error);
          return [];
        }
        return calls || [];
      } catch (error) {
        console.warn('Recent calls fetch failed:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .single();
        
        if (error && error.code !== 'PGRST116') {
          console.warn('Subscription error:', error);
          return null;
        }
        return data;
      } catch (error) {
        console.warn('Subscription fetch failed:', error);
        return null;
      }
    },
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const hasAnyError = campaignStatsError || callStatsError || recentCallsError || subscriptionError;

  return {
    campaignStats,
    callStats,
    recentCalls,
    subscription,
    isLoading: campaignStatsLoading || callStatsLoading || recentCallsLoading || subscriptionLoading,
    error: hasAnyError
  };
};
