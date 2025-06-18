
import { supabase } from '@/integrations/supabase/client';

export interface InitiateCallParams {
  phoneNumber: string;
  campaignId?: string;
  contactId?: string;
  voiceConfig?: {
    voice: string;
    language?: string;
  };
}

class SignalWireService {
  async initiateCall(params: InitiateCallParams): Promise<{ success: boolean; callId?: string; error?: string }> {
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate call';
      return { 
        success: false, 
        error: errorMessage
      };
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<{ transcript?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: formData
      });

      if (error) throw new Error(error.message || 'Failed to transcribe audio');
      
      return { transcript: data.transcript };
    } catch (error) {
      console.error('Error transcribing audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      return { error: errorMessage };
    }
  }

  async processWithOpenAI(params: { 
    transcript: string; 
    campaignContext?: string; 
    previousMessages?: Array<{ role: string; content: string }> 
  }): Promise<{ response?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-openai', {
        body: params
      });

      if (error) throw new Error(error.message || 'Failed to process with OpenAI');
      
      return { response: data.response };
    } catch (error) {
      console.error('Error processing with OpenAI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process with OpenAI';
      return { error: errorMessage };
    }
  }

  async textToSpeech(params: { text: string; voice?: string }): Promise<{ audioContent?: string; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: params
      });

      if (error) throw new Error(error.message || 'Failed to convert text to speech');
      
      return { audioContent: data.audioContent };
    } catch (error) {
      console.error('Error converting text to speech:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to convert text to speech';
      return { error: errorMessage };
    }
  }
}

export const signalWireService = new SignalWireService();
