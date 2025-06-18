import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  console.log('🚀 voice-websocket function invoked', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries()),
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const callId = url.searchParams.get('callId') || 'browser-test'
  const assistantId = url.searchParams.get('assistantId') || 'demo'
  const userId = url.searchParams.get('userId')
  const authToken = url.searchParams.get('authToken')

  console.log('📋 WebSocket parameters extracted:', { callId, assistantId, userId, hasAuthToken: !!authToken })

  // Validate authentication for non-demo calls
  if (callId !== 'browser-test' && (!userId || !authToken)) {
    console.log('❌ Missing authentication parameters')
    return new Response('Authentication required', { status: 401, headers: corsHeaders })
  }

  // Verify WebSocket upgrade headers
  const upgradeHeader = req.headers.get('upgrade')
  const connectionHeader = req.headers.get('connection')
  console.log('🔍 Connection headers check:', { upgrade: upgradeHeader, connection: connectionHeader })
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request')
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  // Environment variables
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  console.log('🔧 Environment variables check:', {
    openaiApiKeyExists: !!openaiApiKey,
    supabaseUrlExists: !!supabaseUrl,
    supabaseServiceKeyExists: !!supabaseServiceKey,
  })
  if (!openaiApiKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables')
    return new Response('Server configuration error', { status: 500, headers: corsHeaders })
  }

  // Rate limiter
  const rateLimiter = {
    transcriptions: new Map<string, number[]>(),
    tts: new Map<string, number[]>(),
    canProceed(type: 'transcription' | 'tts', identifier: string, maxPerMinute = 10) {
      const now = Date.now()
      const windowStart = now - 60000
      const map = type === 'transcription' ? this.transcriptions : this.tts
      const requests = map.get(identifier) || []
      const recent = requests.filter((t) => t > windowStart)
      if (recent.length >= maxPerMinute) return false
      recent.push(now)
      map.set(identifier, recent)
      return true
    },
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('✅ WebSocket upgrade successful')

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Validate call record for authenticated calls
    if (userId && authToken && callId !== 'browser-test') {
      try {
        const { data: callRecord, error: callError } = await supabaseClient
          .from('calls')
          .select('id, user_id, status, auth_token')
          .eq('id', callId)
          .eq('user_id', userId)
          .eq('status', 'active')
          .single()
        if (callError || !callRecord) {
          console.log('❌ Invalid call record', callError)
          return new Response('Invalid call session', { status: 403, headers: corsHeaders })
        }
        if (callRecord.auth_token !== authToken) {
          console.log('❌ Invalid auth token')
          return new Response('Authentication failed', { status: 403, headers: corsHeaders })
        }
        console.log('✅ Call record validated successfully')
      } catch (err) {
        console.log('❌ Error validating call record', err)
        return new Response('Database error', { status: 500, headers: corsHeaders })
      }
    }

    // State variables
    let assistant: any = null
    const conversationHistory: Array<{ role: string; content: string }> = []
    let hasSpoken = false
    let isCallActive = false
    let audioBuffer: string[] = []
    let lastProcessTime = Date.now()
    let isProcessingAudio = false
    let audioProcessingQueue: Promise<void> = Promise.resolve()

    const log = (msg: string, data?: any) => console.log(`[${new Date().toISOString()}] [Call: ${callId}] ${msg}`, data || '')

    // Cleanup on close/error
    const cleanup = () => {
      isCallActive = false
      isProcessingAudio = false
      audioBuffer = []
      if (userId && callId !== 'browser-test') {
        supabaseClient
          .from('calls')
          .update({ status: 'completed', ended_at: new Date().toISOString() })
          .eq('id', callId)
          .eq('user_id', userId)
          .then(({ error }) => {
            if (error) log('⚠️ Error updating call status on cleanup', error)
            else log('✅ Call status updated to completed')
          })
      }
    }

    // Load assistant config
    if (assistantId !== 'demo') {
      try {
        log('🔍 Fetching assistant configuration')
        const { data: assistantData, error } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('id', assistantId)
          .single()
        if (assistantData) {
          assistant = assistantData
          log('✅ Assistant loaded', { name: assistant.name })
        }
      } catch (err) {
        log('⚠️ Error fetching assistant, using default', err)
      }
    }
    if (!assistant) {
      assistant = {
        name: 'Demo Assistant',
        system_prompt: 'You are a helpful AI assistant. Be friendly, professional, and concise. Keep responses under 2 sentences.',
        first_message: 'Hello! This is your AI assistant. How can I help you today?',
        voice_provider: 'openai',
        voice_id: 'alloy',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 50,
      }
      log('✅ Using default assistant configuration')
    }
    conversationHistory.push({ role: 'system', content: assistant.system_prompt })

    log('🎯 WebSocket handlers configured')

    // ----- WebSocket Events -----
    socket.onopen = () => {
      log('🔌 WebSocket connected')
      isCallActive = true
      socket.send(
        JSON.stringify({
          type: 'connection_established',
          callId,
          assistantId,
          assistant: { name: assistant.name, voice_provider: assistant.voice_provider },
          timestamp: Date.now(),
        })
      )
      if (!hasSpoken && assistant.first_message) {
        setTimeout(async () => {
          await sendAIResponse(assistant.first_message)
          hasSpoken = true
        }, 1000)
      }
    }

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        log('📨 Received message', msg)
        switch (msg.event || msg.type) {
          case 'connection_established':
            if (!hasSpoken && assistant.first_message) {
              await sendAIResponse(assistant.first_message)
              hasSpoken = true
            }
            break
          case 'media':
            if (isCallActive && msg.media?.payload) {
              await handleIncomingAudio(msg.media.payload)
            }
            break
          case 'text_input':
            if (msg.text?.trim()) await processTextInput(msg.text)
            break
          case 'request_greeting':
            if (assistant.first_message) await sendAIResponse(assistant.first_message)
            break
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
            break
          case 'stop':
          case 'disconnect':
            log('🛑 Call ended by client')
            isCallActive = false
            break
          default:
            log('❓ Unknown event', msg)
        }
      } catch (err) {
        log('❌ Error processing message', err)
        socket.send(
          JSON.stringify({ type: 'error', message: 'Error processing message', timestamp: Date.now() })
        )
      }
    }

    socket.onclose = (ev) => { log('🔌 WebSocket closed', ev); cleanup() }
    socket.onerror = (err) => { log('❌ WebSocket error', err); cleanup() }

    // ----- Audio Handling -----
    async function handleIncomingAudio(payload: string) {
      audioProcessingQueue = audioProcessingQueue.then(async () => {
        try {
          audioBuffer.push(payload)
          const now = Date.now()
          const timeout = now - lastProcessTime > 2000
          const full = audioBuffer.length > 10
          if ((timeout || full) && !isProcessingAudio) {
            isProcessingAudio = true
            lastProcessTime = now
            const combined = audioBuffer.join('')
            audioBuffer = []
            if (combined.length > 50) {
              log('🎤 Processing audio chunk', { length: combined.length, reason: timeout ? 'timeout' : 'buffer_full' })
              await processAudioChunk(combined)
            }
            isProcessingAudio = false
          }
        } catch (err) {
          log('❌ Error in audio handler', err)
          isProcessingAudio = false
        }
      })
    }

    async function processAudioChunk(data: string) {
      log('🎤 Transcribing audio chunk', { length: data.length })
      const transcript = await transcribeAudio(data)
      if (transcript.trim().length > 3) {
        socket.send(JSON.stringify({ type: 'transcript', text: transcript, timestamp: Date.now() }))
        await processTextInput(transcript)
      }
    }

    // ----- Transcription -----
    async function transcribeAudio(audioData: string): Promise<string> {
      const id = userId || callId
      if (!rateLimiter.canProceed('transcription', id)) {
        log('⚠️ Transcription rate limit exceeded')
        return ''
      }
      const maxRetries = 2
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🔊 Transcription attempt ${attempt}`)
          const bin = Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))
          if (bin.length < 1000) { log('⚠️ Audio too small'); return '' }
          const fd = new FormData()
          fd.append('file', new Blob([bin], { type: 'audio/wav' }), 'audio.wav')
          fd.append('model', 'whisper-1')
          fd.append('language', 'en')
          const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiApiKey}` },
            body: fd,
            signal: AbortSignal.timeout(15000),
          })
          if (!resp.ok) {
            const body = await resp.text().catch(() => 'Unknown error')
            log(`⚠️ Transcription error, status ${resp.status}`, body)
            if (resp.status >= 400 && resp.status < 500) return ''
            if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt))
            continue
          }
          const { text } = await resp.json()
          log('✅ Transcription success', text)
          return text.trim()
        } catch (err) {
          log(`❌ Transcription exception (attempt ${attempt})`, err)
          if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
      return ''
    }

    // ----- Text-to-Speech -----
    async function textToSpeech(text: string): Promise<string> {
      const id = userId || callId
      if (!rateLimiter.canProceed('tts', id)) {
        log('⚠️ TTS rate limit exceeded')
        return 'I\'m processing too many requests right now. Please speak more slowly.'
      }
      if (!text.trim()) { log('⚠️ Empty TTS text'); return '' }
      const truncated = text.length > 500 ? text.slice(0, 500) + '...' : text
      const maxRetries = 2
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🎵 TTS attempt ${attempt}`)
          const resp = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tts-1', voice: assistant.voice_id, input: truncated, response_format: 'wav', speed: 1.0 }),
            signal: AbortSignal.timeout(30000),
          })
          if (!resp.ok) {
            const body = await resp.text().catch(() => 'Unknown error')
            log(`⚠️ TTS error, status ${resp.status}`, body)
            if (resp.status >= 400 && resp.status < 500) return ''
            if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt))
            continue
          }
          const buf = await resp.arrayBuffer()
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
          log('✅ TTS success', { bytes: buf.byteLength })
          return b64
        } catch (err) {
          log(`❌ TTS exception (attempt ${attempt})`, err)
          if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1000 * attempt))
        }
      }
      return ''
    }

    // ----- Text Input & AI Response -----
    async function processTextInput(text: string) {
      log('💭 Processing text input', { text })
      conversationHistory.push({ role: 'user', content: text })
      try {
        const aiResp = await generateAIResponse()
        conversationHistory.push({ role: 'assistant', content: aiResp })
        await sendAIResponse(aiResp)
      } catch (err) {
        log('❌ Error in text input', err)
        await sendErrorResponse('Sorry, something went wrong.')
      }
    }

    async function generateAIResponse(): Promise<string> {
      log('🧠 Generating AI response')
      const messages = conversationHistory.slice(-8)
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: assistant.model,
          messages,
          temperature: assistant.temperature,
          max_tokens: assistant.max_tokens,
        }),
      })
      if (!resp.ok) {
        log('❌ AI generation error', { status: resp.status })
        return 'I\'m having trouble right now.'
      }
      const { choices } = await resp.json()
      return choices[0].message.content.trim()
    }

    async function sendAIResponse(text: string) {
      log('🔊 Sending AI response', { text })
      const audio = await textToSpeech(text)
      if (audio) socket.send(JSON.stringify({ type: 'audio_response', audio, text, timestamp: Date.now() }))
      socket.send(JSON.stringify({ type: 'ai_response', text, timestamp: Date.now() }))
    }

    async function sendErrorResponse(text: string) {
      socket.send(JSON.stringify({ type: 'text_response', text, timestamp: Date.now(), fallback: true }))
      log('📤 Fallback text response sent')
    }

    return response
  } catch (error) {
    console.error('❌ Critical error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
