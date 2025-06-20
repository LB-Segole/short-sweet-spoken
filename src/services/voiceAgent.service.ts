import { supabase } from '@/integrations/supabase/client';

export interface VoiceCallParams {
  phoneNumber: string;
  assistantId: string;
  campaignId?: string;
  contactId?: string;
  squadId?: string;
}

export interface CallAnalytics {
  totalCalls: number;
  completedCalls: number;
  transferredCalls: number;
  successRate: number;
  transferRate: number;
  averageDuration: number;
  averageSuccessScore: number;
  calls: any[];
}

export interface ProviderKey {
  provider: 'openai' | 'deepgram' | 'elevenlabs' | 'signalwire';
  configured: boolean;
  created_at?: string;
}

class VoiceAgentService {
  // Voice WebSocket Connection
  createVoiceConnection(assistantId: string): WebSocket {
    const wsUrl = `wss://${window.location.hostname}/functions/voice-websocket`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Voice WebSocket connected');
      // Initialize with assistant configuration
      ws.send(JSON.stringify({
        type: 'config',
        assistantId
      }));
    };
    
    return ws;
  }

  // Outbound Call Initiation
  async initiateCall(params: VoiceCallParams): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: params
      });

      if (error) throw new Error(error.message || 'Failed to initiate call');
      
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

  // Call Analytics
  async getCallAnalytics(timeframe: '1d' | '7d' | '30d' = '7d'): Promise<CallAnalytics | null> {
    try {
      const { data, error } = await supabase.functions.invoke('analytics', {
        body: { timeframe }
      });

      if (error) throw new Error(error.message || 'Failed to fetch analytics');
      
      return data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  async getCallDetails(callId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase.functions.invoke('analytics', {
        body: { callId }
      });

      if (error) throw new Error(error.message || 'Failed to fetch call details');
      
      return data;
    } catch (error) {
      console.error('Error fetching call details:', error);
      return null;
    }
  }

  // Provider Keys Management
  async getProviderKeys(): Promise<ProviderKey[]> {
    try {
      const { data, error } = await supabase.functions.invoke('provider-keys');

      if (error) throw new Error(error.message || 'Failed to fetch provider keys');
      
      return data || [];
    } catch (error) {
      console.error('Error fetching provider keys:', error);
      return [];
    }
  }

  async setProviderKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('provider-keys', {
        body: { provider, api_key: apiKey }
      });

      if (error) throw new Error(error.message || 'Failed to set provider key');
      
      return true;
    } catch (error) {
      console.error('Error setting provider key:', error);
      return false;
    }
  }

  async deleteProviderKey(provider: string): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke('provider-keys', {
        body: { provider, _method: 'DELETE' }
      });

      if (error) throw new Error(error.message || 'Failed to delete provider key');
      
      return true;
    } catch (error) {
      console.error('Error deleting provider key:', error);
      return false;
    }
  }

  // Real-time Call Monitoring
  subscribeToCallUpdates(callId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`call-${callId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls',
        filter: `id=eq.${callId}`
      }, callback)
      .subscribe();
  }

  // Audio Utils
  encodeAudioForWebSocket(audioBuffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  async getUserMedia(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
  }
}

export const voiceAgentService = new VoiceAgentService();
