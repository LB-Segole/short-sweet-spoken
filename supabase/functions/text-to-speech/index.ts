
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('🎙️ DeepGram Text-to-Speech Function initialized v5.0 - Pure DeepGram REST API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TTSRequest {
  text: string
  voice?: string
  model?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔊 DeepGram TTS request received');
    
    const { text, voice, model }: TTSRequest = await req.json()

    if (!text || !text.trim()) {
      throw new Error('Text is required and cannot be empty')
    }

    console.log('📝 TTS parameters:', {
      textLength: text.length,
      voice: voice || 'aura-asteria-en',
      model: model || 'aura-asteria-en'
    });

    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
    
    if (!deepgramApiKey) {
      console.error('❌ DeepGram API key not configured');
      console.log('💡 Set DEEPGRAM_API_KEY in Supabase project settings > Edge Functions > Environment Variables');
      throw new Error('DeepGram API key not configured. Please set DEEPGRAM_API_KEY in your Supabase project settings.');
    }

    const voiceModel = voice || model || 'aura-asteria-en';
    console.log('🎵 DeepGram TTS: Converting text to speech');
    console.log('📝 Text preview:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    console.log('🎵 Voice model:', voiceModel);

    // DeepGram TTS REST API call
    const response = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceModel)}`, {
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
        voice: voiceModel
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
