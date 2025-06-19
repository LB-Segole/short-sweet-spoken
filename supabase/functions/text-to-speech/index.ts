
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('🎙️ Text-to-Speech Function initialized v3.0 - Fixed API key handling');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TTSRequest {
  text: string
  voice: string
  voice_provider: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔊 TTS request received');
    
    const { text, voice, voice_provider }: TTSRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    console.log('📝 TTS parameters:', {
      textLength: text.length,
      voice: voice,
      provider: voice_provider
    });

    let audioContent: string

    if (voice_provider === 'elevenlabs') {
      audioContent = await elevenLabsTTS(text, voice)
    } else {
      audioContent = await openAITTS(text, voice)
    }

    console.log('✅ TTS successful, audio length:', audioContent.length);

    return new Response(
      JSON.stringify({
        success: true,
        audioContent
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
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function openAITTS(text: string, voice: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  // Better error handling with more specific message
  if (!openaiApiKey) {
    console.error('❌ OpenAI API key not configured');
    console.log('💡 Please set OPENAI_API_KEY in Supabase project settings > Edge Functions > Environment Variables');
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your Supabase project settings.');
  }

  console.log('🎙️ OpenAI TTS: Converting text to speech');
  console.log('📝 Text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
  console.log('🎵 Voice:', voice || 'alloy');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: voice || 'alloy',
      input: text,
      response_format: 'mp3'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ OpenAI TTS API error:', { 
      status: response.status, 
      statusText: response.statusText,
      error: errorText 
    })
    throw new Error(`OpenAI TTS error: ${response.status} - ${errorText}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
  
  console.log('✅ OpenAI TTS successful:', { 
    audioLength: audioBuffer.byteLength,
    base64Length: base64Audio.length
  })
  
  return base64Audio
}

async function elevenLabsTTS(text: string, voiceId: string): Promise<string> {
  const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
  
  if (!elevenLabsApiKey) {
    console.error('❌ ElevenLabs API key not configured');
    console.log('💡 Please set ELEVENLABS_API_KEY in Supabase project settings > Edge Functions > Environment Variables');
    throw new Error('ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in your Supabase project settings.');
  }

  console.log('🎙️ ElevenLabs TTS: Converting text to speech');
  console.log('📝 Text:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));
  console.log('🎵 Voice ID:', voiceId || '9BWtsMINqrJLrRacOk9x');

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || '9BWtsMINqrJLrRacOk9x'}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${elevenLabsApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('❌ ElevenLabs TTS API error:', { 
      status: response.status, 
      statusText: response.statusText,
      error: errorText 
    })
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
  
  console.log('✅ ElevenLabs TTS successful:', { 
    audioLength: audioBuffer.byteLength,
    base64Length: base64Audio.length
  })
  
  return base64Audio
}
