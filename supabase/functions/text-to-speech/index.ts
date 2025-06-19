
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('🎙️ DeepGram Text-to-Speech Function initialized v6.0 - Fixed Voice Models');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TTSRequest {
  text: string
  voice?: string
  model?: string
  voice_provider?: string
}

// Map OpenAI voice models to DeepGram equivalents
const mapVoiceToDeepgram = (voiceId: string): string => {
  const voiceMap: Record<string, string> = {
    'alloy': 'aura-asteria-en',
    'echo': 'aura-luna-en', 
    'fable': 'aura-stella-en',
    'onyx': 'aura-zeus-en',
    'nova': 'aura-hera-en',
    'shimmer': 'aura-orion-en'
  };
  
  // If it's already a DeepGram voice, return as-is
  if (voiceId && voiceId.startsWith('aura-')) {
    return voiceId;
  }
  
  // Map OpenAI voices to DeepGram equivalents
  return voiceMap[voiceId] || 'aura-asteria-en';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔊 DeepGram TTS request received');
    
    const { text, voice, model, voice_provider }: TTSRequest = await req.json()

    if (!text || !text.trim()) {
      throw new Error('Text is required and cannot be empty')
    }

    // Map voice to DeepGram model
    const deepgramVoice = mapVoiceToDeepgram(voice || model || 'aura-asteria-en');

    console.log('📝 TTS parameters:', {
      textLength: text.length,
      originalVoice: voice || model,
      mappedVoice: deepgramVoice,
      voice_provider: voice_provider || 'deepgram'
    });

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    
    if (!deepgramApiKey) {
      console.error('❌ DeepGram API key not configured');
      console.log('💡 Set DEEPGRAM_API_KEY in Supabase project settings > Edge Functions > Environment Variables');
      throw new Error('DeepGram API key not configured. Please set DEEPGRAM_API_KEY in your Supabase project settings.');
    }

    console.log('🎵 DeepGram TTS: Converting text to speech');
    console.log('📝 Text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    console.log('🎵 Voice model:', deepgramVoice);

    // DeepGram TTS REST API call
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(deepgramVoice)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text.trim()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ DeepGram TTS API error:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      })
      throw new Error(`DeepGram TTS error: ${response.status} - ${errorText}`)
    }

    const audioBuffer = await response.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    
    console.log('✅ DeepGram TTS successful:', { 
      audioLength: audioBuffer.byteLength,
      base64Length: base64Audio.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        audioContent: base64Audio,
        format: 'wav',
        provider: 'deepgram',
        voice: deepgramVoice,
        originalVoice: voice || model
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ TTS error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        provider: 'deepgram'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
