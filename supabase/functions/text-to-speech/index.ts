
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { text, voice, voice_provider }: TTSRequest = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    let audioContent: string

    if (voice_provider === 'elevenlabs') {
      audioContent = await elevenLabsTTS(text, voice)
    } else {
      audioContent = await openAITTS(text, voice)
    }

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
    console.error('TTS error:', error)
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
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  console.log('🎙️ OpenAI TTS: Converting text to speech:', text)

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
    console.error('OpenAI TTS API error:', { status: response.status, error: errorText })
    throw new Error(`OpenAI TTS error: ${response.status} - ${errorText}`)
  }

  const audioBuffer = await response.arrayBuffer()
  const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
  
  console.log('✅ OpenAI TTS successful:', { audioLength: audioBuffer.byteLength })
  
  return base64Audio
}

async function elevenLabsTTS(text: string, voiceId: string): Promise<string> {
  const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
  if (!elevenLabsApiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

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
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`)
  }

  const audioBuffer = await response.arrayBuffer()
  return btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
}
