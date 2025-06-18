
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
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request')
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  // Environment variables check
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  console.log('🔧 Environment variables check:', {
    openaiApiKeyExists: !!openaiApiKey,
    deepgramApiKeyExists: !!deepgramApiKey,
    supabaseUrlExists: !!supabaseUrl,
    supabaseServiceKeyExists: !!supabaseServiceKey,
  })

  if (!openaiApiKey) {
    console.error('❌ Missing OpenAI API key')
    return new Response('Server configuration error: Missing OpenAI API key', { status: 500, headers: corsHeaders })
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('✅ WebSocket upgrade successful')

    const supabaseClient = createClient(supabaseUrl!, supabaseServiceKey!)

    // Rate limiter for API calls
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

    // Validate call record for authenticated calls
    if (userId && authToken && callId !== 'browser-test') {
      try {
        const { data: callRecord, error: callError } = await supabaseClient
          .from('calls')
          .select('id, user_id, status')
          .eq('id', callId)
          .eq('user_id', userId)
          .single()
        
        if (callError || !callRecord) {
          console.log('❌ Invalid call record', callError)
          return new Response('Invalid call session', { status: 403, headers: corsHeaders })
        }
        console.log('✅ Call record validated successfully')
      } catch (err) {
        console.log('❌ Error validating call record', err)
        return new Response('Database error', { status: 500, headers: corsHeaders })
      }
    }

    // State variables for conversation
    let assistant: any = null
    const conversationHistory: Array<{ role: string; content: string }> = []
    let hasSpoken = false
    let isCallActive = false
    let audioBuffer: string[] = []
    let lastProcessTime = Date.now()
    let isProcessingAudio = false
    let audioProcessingQueue: Promise<void> = Promise.resolve()
    let deepgramWs: WebSocket | null = null

    const log = (msg: string, data?: any) => console.log(`[${new Date().toISOString()}] [Call: ${callId}] ${msg}`, data || '')

    // Cleanup function
    const cleanup = () => {
      isCallActive = false
      isProcessingAudio = false
      audioBuffer = []
      if (deepgramWs) {
        deepgramWs.close()
        deepgramWs = null
      }
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

    // Initialize Deepgram WebSocket for STT
    const initializeDeepgram = () => {
      if (!deepgramApiKey) {
        log('⚠️ Deepgram API key not available, using OpenAI Whisper for transcription')
        return
      }

      try {
        const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=300`
        deepgramWs = new WebSocket(deepgramUrl, ['token', deepgramApiKey])

        deepgramWs.onopen = () => {
          log('✅ Deepgram WebSocket connected')
        }

        deepgramWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
              const transcript = data.channel.alternatives[0].transcript
              const isFinal = data.is_final || false
              
              if (isFinal && transcript.trim().length > 0) {
                log('📝 Deepgram transcript (final):', transcript)
                socket.send(JSON.stringify({
                  type: 'transcript',
                  text: transcript,
                  confidence: data.channel.alternatives[0].confidence || 1.0,
                  timestamp: Date.now()
                }))
                processTextInput(transcript)
              }
            }
          } catch (error) {
            log('❌ Error processing Deepgram message:', error)
          }
        }

        deepgramWs.onerror = (error) => {
          log('❌ Deepgram WebSocket error:', error)
        }

        deepgramWs.onclose = () => {
          log('🔌 Deepgram WebSocket closed')
        }
      } catch (error) {
        log('❌ Failed to initialize Deepgram:', error)
      }
    }

    // Load assistant configuration
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
        max_tokens: 100,
      }
      log('✅ Using default assistant configuration')
    }
    
    conversationHistory.push({ role: 'system', content: assistant.system_prompt })

    // WebSocket event handlers
    socket.onopen = () => {
      log('🔌 WebSocket connected')
      isCallActive = true
      initializeDeepgram()
      
      socket.send(JSON.stringify({
        type: 'connection_established',
        callId,
        assistantId,
        assistant: { name: assistant.name, voice_provider: assistant.voice_provider },
        timestamp: Date.now(),
      }))
      
      // Send initial greeting
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
        log('📨 Received message:', msg.event || msg.type)
        
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
            if (msg.text?.trim()) {
              await processTextInput(msg.text)
            }
            break
            
          case 'request_greeting':
            if (assistant.first_message) {
              await sendAIResponse(assistant.first_message)
            }
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
            log('❓ Unknown event:', msg)
        }
      } catch (err) {
        log('❌ Error processing message:', err)
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Error processing message', 
          timestamp: Date.now() 
        }))
      }
    }

    socket.onclose = (ev) => {
      log('🔌 WebSocket closed:', ev)
      cleanup()
    }

    socket.onerror = (err) => {
      log('❌ WebSocket error:', err)
      cleanup()
    }

    // Audio handling with Deepgram integration
    async function handleIncomingAudio(payload: string) {
      audioProcessingQueue = audioProcessingQueue.then(async () => {
        try {
          // Send to Deepgram if available
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            const binaryAudio = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
            deepgramWs.send(binaryAudio)
            return
          }

          // Fallback to buffer-based processing for OpenAI Whisper
          audioBuffer.push(payload)
          const now = Date.now()
          const timeout = now - lastProcessTime > 2000
          const bufferFull = audioBuffer.length > 10
          
          if ((timeout || bufferFull) && !isProcessingAudio) {
            isProcessingAudio = true
            lastProcessTime = now
            const combined = audioBuffer.join('')
            audioBuffer = []
            
            if (combined.length > 50) {
              log('🎤 Processing audio chunk', { 
                length: combined.length, 
                reason: timeout ? 'timeout' : 'buffer_full' 
              })
              await processAudioChunk(combined)
            }
            isProcessingAudio = false
          }
        } catch (err) {
          log('❌ Error in audio handler:', err)
          isProcessingAudio = false
        }
      })
    }

    // Process audio chunk with OpenAI Whisper
    async function processAudioChunk(data: string) {
      log('🎤 Transcribing audio chunk with Whisper', { length: data.length })
      const transcript = await transcribeAudioWithWhisper(data)
      if (transcript.trim().length > 3) {
        socket.send(JSON.stringify({ 
          type: 'transcript', 
          text: transcript, 
          timestamp: Date.now() 
        }))
        await processTextInput(transcript)
      }
    }

    // Transcription with OpenAI Whisper
    async function transcribeAudioWithWhisper(audioData: string): Promise<string> {
      const id = userId || callId
      if (!rateLimiter.canProceed('transcription', id)) {
        log('⚠️ Transcription rate limit exceeded')
        return ''
      }

      const maxRetries = 2
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🔊 Whisper transcription attempt ${attempt}`)
          const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
          
          if (binaryData.length < 1000) {
            log('⚠️ Audio too small for transcription')
            return ''
          }

          const formData = new FormData()
          formData.append('file', new Blob([binaryData], { type: 'audio/wav' }), 'audio.wav')
          formData.append('model', 'whisper-1')
          formData.append('language', 'en')

          const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${openaiApiKey}` },
            body: formData,
            signal: AbortSignal.timeout(15000),
          })

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            log(`⚠️ Whisper transcription error, status ${response.status}:`, errorText)
            if (response.status >= 400 && response.status < 500) return ''
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
            continue
          }

          const result = await response.json()
          log('✅ Whisper transcription success:', result.text)
          return result.text.trim()
        } catch (err) {
          log(`❌ Whisper transcription exception (attempt ${attempt}):`, err)
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
      return ''
    }

    // Text-to-Speech with enhanced provider support
    async function textToSpeech(text: string): Promise<string> {
      const id = userId || callId
      if (!rateLimiter.canProceed('tts', id)) {
        log('⚠️ TTS rate limit exceeded')
        return ''
      }

      if (!text.trim()) {
        log('⚠️ Empty TTS text')
        return ''
      }

      const truncatedText = text.length > 500 ? text.slice(0, 500) + '...' : text
      const maxRetries = 2

      // Try Deepgram TTS first if available
      if (deepgramApiKey && assistant.voice_provider === 'deepgram') {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            log(`🎵 Deepgram TTS attempt ${attempt}`)
            const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
              method: 'POST',
              headers: {
                'Authorization': `Token ${deepgramApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ text: truncatedText }),
              signal: AbortSignal.timeout(30000),
            })

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'Unknown error')
              log(`⚠️ Deepgram TTS error, status ${response.status}:`, errorText)
              if (response.status >= 400 && response.status < 500) break
              if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
              continue
            }

            const audioBuffer = await response.arrayBuffer()
            const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
            log('✅ Deepgram TTS success', { bytes: audioBuffer.byteLength })
            return base64Audio
          } catch (err) {
            log(`❌ Deepgram TTS exception (attempt ${attempt}):`, err)
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
          }
        }
      }

      // Fallback to OpenAI TTS
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🎵 OpenAI TTS attempt ${attempt}`)
          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'tts-1',
              voice: assistant.voice_id || 'alloy',
              input: truncatedText,
              response_format: 'wav',
              speed: 1.0
            }),
            signal: AbortSignal.timeout(30000),
          })

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error')
            log(`⚠️ OpenAI TTS error, status ${response.status}:`, errorText)
            if (response.status >= 400 && response.status < 500) return ''
            if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
            continue
          }

          const audioBuffer = await response.arrayBuffer()
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
          log('✅ OpenAI TTS success', { bytes: audioBuffer.byteLength })
          return base64Audio
        } catch (err) {
          log(`❌ OpenAI TTS exception (attempt ${attempt}):`, err)
          if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * attempt))
        }
      }
      return ''
    }

    // Process text input and generate AI response
    async function processTextInput(text: string) {
      log('💭 Processing text input:', text)
      conversationHistory.push({ role: 'user', content: text })
      
      try {
        const aiResponse = await generateAIResponse()
        conversationHistory.push({ role: 'assistant', content: aiResponse })
        await sendAIResponse(aiResponse)
      } catch (err) {
        log('❌ Error in text processing:', err)
        await sendErrorResponse('Sorry, I encountered an issue processing your request.')
      }
    }

    // Generate AI response using OpenAI
    async function generateAIResponse(): Promise<string> {
      log('🧠 Generating AI response')
      const messages = conversationHistory.slice(-8) // Keep recent context
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: assistant.model || 'gpt-4o-mini',
          messages,
          temperature: assistant.temperature || 0.8,
          max_tokens: assistant.max_tokens || 100,
        }),
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        log('❌ OpenAI API error:', response.status)
        return 'I apologize, but I\'m having trouble processing your request right now.'
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      log('✅ AI response generated:', content)
      return content
    }

    // Send AI response with audio
    async function sendAIResponse(text: string) {
      log('🔊 Sending AI response:', text)
      
      // Send text response first
      socket.send(JSON.stringify({ 
        type: 'ai_response', 
        text, 
        timestamp: Date.now() 
      }))

      // Generate and send audio
      const audioBase64 = await textToSpeech(text)
      if (audioBase64) {
        socket.send(JSON.stringify({ 
          type: 'audio_response', 
          audio: audioBase64, 
          text, 
          timestamp: Date.now() 
        }))
      }
    }

    // Send error response
    async function sendErrorResponse(text: string) {
      socket.send(JSON.stringify({ 
        type: 'text_response', 
        text, 
        timestamp: Date.now(), 
        fallback: true 
      }))
      log('📤 Error response sent:', text)
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
