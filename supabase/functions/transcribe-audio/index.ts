
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🎤 Deepgram Audio Transcription Service v2.0');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audio, format } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }
    
    console.log('🎵 Processing audio transcription...');
    
    // Get Deepgram API key
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) {
      throw new Error('Deepgram API key not configured');
    }

    // Convert base64 audio to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create form data for Deepgram
    const formData = new FormData();
    const audioBlob = new Blob([bytes], { 
      type: format === 'webm' ? 'audio/webm' : 'audio/wav' 
    });
    formData.append('audio', audioBlob, `audio.${format || 'webm'}`);

    // Call Deepgram STT API
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Deepgram API error:', errorText);
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    
    console.log('✅ Transcription successful:', transcript.substring(0, 50));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: transcript,
        confidence: result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.9
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('❌ Transcription error:', error);
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
