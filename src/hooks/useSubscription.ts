
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SubscriptionData {
  id?: string;
  status: string;
  plan: string;
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  trial_end?: string;
  trial_start?: string;
  isLoading: boolean;
  error?: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData>({
    status: 'inactive',
    plan: 'free',
    subscribed: false,
    isLoading: true
  });

  const checkSubscription = async () => {
    if (!user) {
      setSubscription({ 
        status: 'inactive',
        plan: 'free', 
        subscribed: false, 
        isLoading: false 
      });
      return;
    }

    try {
      setSubscription(prev => ({ ...prev, isLoading: true }));
      
      // Check subscription status from database
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        const now = new Date();
        const trialEnd = data.trial_end ? new Date(data.trial_end) : null;
        const subscriptionEnd = data.subscription_end ? new Date(data.subscription_end) : null;
        
        const isTrialActive = trialEnd && now < trialEnd;
        const isSubscriptionActive = subscriptionEnd && now < subscriptionEnd;
        
        setSubscription({
          id: data.id,
          status: data.status,
          plan: data.plan,
          subscribed: isTrialActive || isSubscriptionActive || false,
          subscription_tier: data.plan,
          subscription_end: data.subscription_end,
          trial_end: data.trial_end,
          trial_start: data.trial_start,
          isLoading: false
        });
      } else {
        // No subscription record, user is not subscribed
        setSubscription({
          status: 'inactive',
          plan: 'free',
          subscribed: false,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({
        status: 'inactive',
        plan: 'free',
        subscribed: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check subscription'
      });
    }
  };

  const startFreeTrial = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          status: 'trial',
          plan: 'free',
          trial_start: new Date().toISOString(),
          trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Free trial started!');
      checkSubscription();
    },
    onError: (error) => {
      toast.error('Failed to start trial: ' + error.message);
    }
  });

  const getDaysRemaining = () => {
    if (!subscription.trial_end) return 0;
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const isTrialActive = () => {
    if (!subscription.trial_end) return false;
    const now = new Date();
    const trialEnd = new Date(subscription.trial_end);
    return now < trialEnd && subscription.status === 'trial';
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  return {
    ...subscription,
    subscription: subscription, // Add this for backward compatibility
    refreshSubscription: checkSubscription,
    startFreeTrial,
    getDaysRemaining,
    isTrialActive: isTrialActive()
  };
};
