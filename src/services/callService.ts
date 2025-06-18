import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CallRequest {
  contactId: string;
  campaignId: string;
  phoneNumber: string;
  scriptId?: string;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  signalwireCallId?: string;
  error?: string;
}

class CallService {
  private wsConnection: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;

  async initiateCall(request: CallRequest): Promise<CallResponse> {
    try {
      console.log('🚀 Initiating call:', request);

      // First, create call record in database
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          contact_id: request.contactId,
          campaign_id: request.campaignId,
          phone_number: request.phoneNumber,
          script_id: request.scriptId,
          status: 'initiated',
          direction: 'outbound'
        })
        .select()
        .single();

      if (callError) {
        console.error('❌ Failed to create call record:', callError);
        return { success: false, error: callError.message };
      }

      // Make SignalWire API call
      const signalwireResponse = await this.makeSignalWireCall(request, callData.id);
      
      if (!signalwireResponse.success) {
        // Update call status to failed
        await supabase
          .from('calls')
          .update({ status: 'failed', error_message: signalwireResponse.error })
          .eq('id', callData.id);
        
        return signalwireResponse;
      }

      // Update call with SignalWire SID
      await supabase
        .from('calls')
        .update({ 
          signalwire_call_id: signalwireResponse.signalwireCallId,
          status: 'connecting'
        })
        .eq('id', callData.id);

      // Initialize WebSocket for real-time audio
      await this.initializeWebSocket(callData.id, signalwireResponse.signalwireCallId);

      return {
        success: true,
        callId: callData.id,
        signalwireCallId: signalwireResponse.signalwireCallId
      };

    } catch (error) {
      console.error('❌ Call initiation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async makeSignalWireCall(request: CallRequest, callId: string): Promise<CallResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('make-call', {
        body: {
          to: request.phoneNumber,
          callId: callId,
          campaignId: request.campaignId,
          scriptId: request.scriptId
        }
      });

      if (error) {
        console.error('❌ SignalWire API error:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        signalwireCallId: data.call_sid
      };

    } catch (error) {
      console.error('❌ SignalWire call error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SignalWire API failed' 
      };
    }
  }

  private async initializeWebSocket(callId: string, signalwireCallId: string): Promise<void> {
    try {
      const wsUrl = `wss://your-signalwire-domain.signalwire.com/ws`;
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('✅ WebSocket connected for call:', callId);
        this.setupAudioProcessing(callId);
      };

      this.wsConnection.onmessage = (event) => {
        this.handleWebSocketMessage(event, callId);
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        toast.error('Real-time audio connection failed');
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 WebSocket disconnected for call:', callId);
        this.cleanup();
      };

    } catch (error) {
      console.error('❌ WebSocket initialization error:', error);
    }
  }

  private async setupAudioProcessing(callId: string): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && this.wsConnection?.readyState === WebSocket.OPEN) {
          // Send audio data to AI agent
          this.wsConnection.send(JSON.stringify({
            type: 'audio',
            callId: callId,
            data: event.data
          }));
        }
      };

      this.mediaRecorder.start(100); // Send audio chunks every 100ms
      console.log('✅ Audio processing started for call:', callId);

    } catch (error) {
      console.error('❌ Audio setup error:', error);
      toast.error('Microphone access denied');
    }
  }

  private handleWebSocketMessage(event: MessageEvent, callId: string): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'audio_response':
          this.playAIResponse(message.audioData);
          break;
        case 'call_status':
          this.updateCallStatus(callId, message.status);
          break;
        case 'transcription':
          console.log('📝 User said:', message.text);
          break;
        default:
          console.log('📨 Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  }

  private playAIResponse(audioData: string): void {
    try {
      const audio = new Audio(`data:audio/wav;base64,${audioData}`);
      audio.play();
    } catch (error) {
      console.error('❌ Audio playback error:', error);
    }
  }

  private async updateCallStatus(callId: string, status: string): Promise<void> {
    await supabase
      .from('calls')
      .update({ status })
      .eq('id', callId);
  }

  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  async endCall(callId: string): Promise<void> {
    try {
      await supabase
        .from('calls')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      this.cleanup();
      console.log('✅ Call ended:', callId);
    } catch (error) {
      console.error('❌ End call error:', error);
    }
  }
}

export const callService = new CallService();