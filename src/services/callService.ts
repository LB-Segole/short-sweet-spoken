
import { supabase } from '@/integrations/supabase/client';

export interface CallRecord {
  id: string;
  phone_number: string;
  status: string;
  duration: number;
  created_at: string;
  summary?: string;
  external_id?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_company?: string;
  campaign_name?: string;
  recording_url?: string;
}

export interface CallStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_duration: number;
  average_duration: number;
  success_rate: number;
}

class CallService {
  async getAllCalls(): Promise<CallRecord[]> {
    try {
      const { data, error } = await supabase
        .from('call_analytics_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(call => ({
        id: call.id || '',
        phone_number: call.contact_phone || 'Unknown',
        status: call.status || 'unknown',
        duration: call.duration || 0,
        created_at: call.created_at || '',
        summary: call.summary,
        external_id: call.external_id,
        contact_name: call.contact_name,
        contact_phone: call.contact_phone,
        contact_company: call.contact_company,
        campaign_name: call.campaign_name,
        recording_url: undefined
      }));
    } catch (error) {
      console.error('Error fetching calls:', error);
      return [];
    }
  }

  async getCallById(callId: string): Promise<CallRecord | null> {
    try {
      const { data, error } = await supabase
        .from('call_analytics_view')
        .select('*')
        .eq('id', callId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id || '',
        phone_number: data.contact_phone || 'Unknown',
        status: data.status || 'unknown',
        duration: data.duration || 0,
        created_at: data.created_at || '',
        summary: data.summary,
        external_id: data.external_id,
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_company: data.contact_company,
        campaign_name: data.campaign_name,
        recording_url: undefined
      };
    } catch (error) {
      console.error('Error fetching call:', error);
      return null;
    }
  }

  async initiateCall(phoneNumber: string, campaignId?: string): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      if (!phoneNumber) {
        throw new Error('Phone number is required');
      }

      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: { 
          phoneNumber,
          campaignId: campaignId || undefined
        }
      });

      if (error) throw error;
      
      return { 
        success: true, 
        callId: data.callId
      };
    } catch (error) {
      console.error('Error initiating call:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to initiate call'
      };
    }
  }

  async endCall(callId: string, summary?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.functions.invoke('end-call', {
        body: { callId, summary }
      });

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to end call'
      };
    }
  }

  async getCallStats(): Promise<CallStats> {
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('status, duration')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const calls = data || [];
      const totalCalls = calls.length;
      const successfulCalls = calls.filter(call => call.status === 'completed').length;
      const failedCalls = calls.filter(call => call.status === 'failed').length;
      const totalDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0);
      const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
      const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

      return {
        total_calls: totalCalls,
        successful_calls: successfulCalls,
        failed_calls: failedCalls,
        total_duration: totalDuration,
        average_duration: averageDuration,
        success_rate: successRate
      };
    } catch (error) {
      console.error('Error fetching call stats:', error);
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_duration: 0,
        average_duration: 0,
        success_rate: 0
      };
    }
  }
}

export const callService = new CallService();
