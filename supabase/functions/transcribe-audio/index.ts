
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DeepgramClient } from "https://esm.sh/@deepgram/sdk@2.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get audio data from request
    const formData = await req.formData();
    const audioFile = formData.get('audio');
    
    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('No audio file provided');
    }
    
    // Get buffer from file
    const buffer = await audioFile.arrayBuffer();
    
    // Initialize Deepgram client
    const deepgram = new DeepgramClient(Deno.env.get('DEEPGRAM_API_KEY') || '');
    
    // Send audio to Deepgram for transcription
    const transcriptionResponse = await deepgram.transcription.preRecorded({
      buffer: new Uint8Array(buffer),
      mimetype: audioFile.type,
    }, {
      punctuate: true,
      model: 'nova-2',
      language: 'en-US',
    });
    
    const transcript = transcriptionResponse.results?.channels[0]?.alternatives[0]?.transcript || '';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to transcribe audio' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
