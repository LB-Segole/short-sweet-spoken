import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const callId = url.searchParams.get('callId') || 'browser-test'
  const assistantId = url.searchParams.get('assistantId') || 'demo'

  // Check if this is a WebSocket upgrade request
  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Expected websocket connection', { 
      status: 400,
      headers: corsHeaders 
    })
  }

  // Verify required environment variables
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OpenAi_API_Key')
  if (!openaiApiKey) {
    console.error('❌ OpenAI API key not configured')
    return new Response('OpenAI API key not configured', { 
      status: 500,
      headers: corsHeaders 
    })
  }

  console.log('🔄 Upgrading to WebSocket connection...', { callId, assistantId })
  const { socket, response } = Deno.upgradeWebSocket(req)

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let assistant: any = null
  let conversationHistory: Array<{ role: string; content: string }> = []
  let hasSpoken = false
  let isCallActive = false
  let audioBuffer: Array<string> = []
  let lastProcessTime = Date.now()
  let lastHeartbeat = Date.now()

  // Enhanced logging function with detailed context
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    const context = {
      callId,
      assistantId,
      hasSpoken,
      isCallActive,
      bufferLength: audioBuffer.length,
      conversationLength: conversationHistory.length
    }
    console.log(`[${timestamp}] [Call: ${callId}] ${message}`, data ? { ...context, data } : context)
  }

  // Get assistant configuration with error handling
  if (assistantId && assistantId !== 'demo') {
    try {
      log('🔍 Fetching assistant configuration')
      const { data: assistantData, error } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single()
      
      if (error) {
        log('⚠️ Error fetching assistant from database', error)
      } else if (assistantData) {
        assistant = assistantData
        log('✅ Assistant loaded from database', { 
          name: assistant.name, 
          voice_provider: assistant.voice_provider,
          model: assistant.model 
        })
      }
    } catch (error) {
      log('⚠️ Exception fetching assistant, using default', error)
    }
  }

  // Default assistant configuration with enhanced settings
  if (!assistant) {
    assistant = {
      name: 'Demo Assistant',
      system_prompt: 'You are a helpful AI assistant from First Choice LLC. Be friendly, professional, and concise. Keep responses under 2 sentences and under 30 words. Respond naturally to what the user says and ask engaging follow-up questions.',
      first_message: 'Hello! This is your AI assistant from First Choice LLC. How are you doing today?',
      voice_provider: 'openai',
      voice_id: 'alloy',
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 50
    }
    log('✅ Using default assistant configuration')
  }

  // Initialize conversation with system prompt
  conversationHistory.push({
    role: 'system',
    content: assistant.system_prompt
  })

  log('🎯 Conversation initialized', { systemPromptLength: assistant.system_prompt.length })

  socket.onopen = async () => {
    log('🔌 WebSocket connected successfully')
    isCallActive = true
    lastHeartbeat = Date.now()
    
    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connection_established',
      callId: callId,
      assistantId: assistantId,
      assistant: {
        name: assistant.name,
        voice_provider: assistant.voice_provider
      },
      timestamp: Date.now()
    }))

    // Send greeting immediately after connection
    if (!hasSpoken && assistant.first_message) {
      log('🎤 Sending initial greeting')
      await sendAIResponse(assistant.first_message)
      hasSpoken = true
    }
  }

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data)
      lastHeartbeat = Date.now()
      
      log('📨 Received message', { 
        type: message.event || message.type,
        hasPayload: !!message.media?.payload,
        textLength: message.text?.length 
      })
      
      switch (message.event || message.type) {
        case 'connected':
        case 'connection_established':
          log('✅ Client confirmed connection')
          // Send greeting if not already sent
          if (!hasSpoken && assistant.first_message) {
            log('🎤 Sending greeting after client confirmation')
            await sendAIResponse(assistant.first_message)
            hasSpoken = true
          }
          break

        case 'media':
          if (isCallActive && message.media?.payload) {
            log('🎵 Received audio data', { payloadLength: message.media.payload.length })
            await handleIncomingAudio(message.media.payload)
          } else {
            log('⚠️ Received media message but missing payload or call inactive')
          }
          break

        case 'text_input':
          if (message.text && message.text.trim()) {
            log('💬 Text input received', { text: message.text, length: message.text.length })
            await processTextInput(message.text)
          } else {
            log('⚠️ Empty text input received')
          }
          break

        case 'request_greeting':
          log('🎤 Greeting requested by client')
          if (assistant.first_message) {
            await sendAIResponse(assistant.first_message)
          }
          break

        case 'ping':
          log('💓 Heartbeat ping received')
          socket.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }))
          break

        case 'stop':
        case 'disconnect':
          log('🛑 Call ended by client')
          isCallActive = false
          break

        default:
          log('❓ Unknown event received', { event: message.event || message.type })
      }
    } catch (error) {
      log('❌ Error processing WebSocket message', error)
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message',
        timestamp: Date.now()
      }))
    }
  }

  socket.onclose = (event) => {
    log('🔌 WebSocket closed', { code: event.code, reason: event.reason })
    isCallActive = false
  }

  socket.onerror = (error) => {
    log('❌ WebSocket error', error)
    isCallActive = false
  }

  // Enhanced audio handling with better validation
  async function handleIncomingAudio(audioPayload: string) {
    try {
      if (!audioPayload || audioPayload.length < 10) {
        log('⚠️ Audio payload too small, skipping', { length: audioPayload.length })
        return
      }

      // Add to buffer
      audioBuffer.push(audioPayload)
      log('📝 Added audio to buffer', { 
        bufferLength: audioBuffer.length,
        payloadLength: audioPayload.length 
      })
      
      // Process audio every 2 seconds or when buffer reaches threshold
      const now = Date.now()
      const shouldProcess = (now - lastProcessTime > 2000) || (audioBuffer.length > 15)
      
      if (shouldProcess) {
        lastProcessTime = now
        
        // Combine buffer and process
        const combinedAudio = audioBuffer.join('')
        audioBuffer = []
        
        if (combinedAudio.length > 100) {
          log('🎵 Processing combined audio chunk', { 
            combinedLength: combinedAudio.length,
            processingDelay: now - lastProcessTime 
          })
          await processAudioChunk(combinedAudio)
        } else {
          log('⚠️ Combined audio too small, skipping processing', { length: combinedAudio.length })
        }
      }
    } catch (error) {
      log('❌ Error handling incoming audio', error)
    }
  }

  async function processTextInput(text: string) {
    try {
      log('💭 Processing text input', { text, length: text.length })
      
      // Add user message to conversation
      conversationHistory.push({
        role: 'user',
        content: text
      })

      log('📚 Updated conversation history', { messageCount: conversationHistory.length })

      // Generate AI response
      const aiResponse = await generateAIResponse()
      
      if (aiResponse) {
        log('🤖 AI response generated', { response: aiResponse, length: aiResponse.length })
        await sendAIResponse(aiResponse)
        
        // Add AI response to conversation
        conversationHistory.push({
          role: 'assistant',
          content: aiResponse
        })

        // Log conversation to database
        await logConversation(text, aiResponse)
      } else {
        log('⚠️ No AI response generated')
      }
    } catch (error) {
      log('❌ Error processing text input', error)
      await sendErrorResponse('I apologize, I\'m having trouble processing that. Could you try again?')
    }
  }

  async function processAudioChunk(audioData: string) {
    try {
      log('🎤 Starting audio transcription', { 
        dataLength: audioData.length,
        estimatedDuration: Math.round(audioData.length / 4000) // Rough estimate
      })
      
      const startTime = Date.now()
      const transcript = await transcribeAudio(audioData)
      const transcriptionTime = Date.now() - startTime
      
      if (transcript && transcript.trim().length > 2) {
        log('👤 User said', { 
          transcript, 
          transcriptionTime,
          confidence: transcript.length > 10 ? 'high' : 'medium'
        })
        
        // Send transcript event to client
        socket.send(JSON.stringify({
          type: 'transcript',
          text: transcript,
          confidence: transcript.length > 10 ? 0.8 : 0.6,
          timestamp: Date.now()
        }))
        
        // Process as text input
        await processTextInput(transcript)
      } else {
        log('🔇 No meaningful transcript received', {
          transcript: transcript || '(empty)',
          transcriptionTime,
          audioDataLength: audioData.length
        })
      }
    } catch (error) {
      log('❌ Error processing audio chunk', error)
      // Send error notification to client
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Error processing audio. Please try speaking again.',
        timestamp: Date.now()
      }))
    }
  }

  async function transcribeAudio(audioData: string): Promise<string> {
    try {
      log('🎤 Transcribing audio with OpenAI Whisper', { dataLength: audioData.length })
      
      // Decode base64 audio with error handling
      let binaryData: Uint8Array
      try {
        binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
        log('✅ Decoded binary data', { binaryDataLength: binaryData.length })
      } catch (decodeError) {
        log('❌ Base64 decode error', decodeError)
        return ''
      }
      
      // Create form data for OpenAI Whisper
      const formData = new FormData()
      const audioBlob = new Blob([binaryData], { type: 'audio/wav' })
      formData.append('file', audioBlob, 'audio.wav')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')
      formData.append('response_format', 'json')

      log('📡 Sending request to OpenAI Whisper API')
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('❌ OpenAI Whisper API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        return ''
      }

      const result = await response.json()
      const transcript = result.text || ''
      
      log('✅ Transcription successful', {
        transcript,
        length: transcript.length,
        duration: result.duration,
        language: result.language
      })

      return transcript.trim()
    } catch (error) {
      log('❌ Transcription error', error)
      return ''
    }
  }

  async function generateAIResponse(): Promise<string> {
    try {
      log('🧠 Generating AI response', { 
        model: assistant.model,
        historyLength: conversationHistory.length 
      })

      // Keep only recent conversation history to stay within token limits
      const recentHistory = conversationHistory.slice(-8) // Increased from 6 to 8
      
      const requestBody = {
        model: assistant.model || 'gpt-4o-mini',
        messages: recentHistory,
        temperature: assistant.temperature || 0.7,
        max_tokens: assistant.max_tokens || 50,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      }

      log('📡 Calling OpenAI API', { 
        model: requestBody.model,
        messageCount: recentHistory.length,
        maxTokens: requestBody.max_tokens
      })

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('❌ OpenAI API error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        })
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const result = await response.json()
      const aiResponse = result.choices?.[0]?.message?.content || 'I apologize, but I didn\'t catch that. Could you please repeat?'
      
      log('✅ OpenAI response received', { 
        response: aiResponse,
        usage: result.usage,
        finishReason: result.choices?.[0]?.finish_reason
      })
      
      return aiResponse.trim()
    } catch (error) {
      log('❌ AI response generation error', error)
      return 'I\'m having trouble processing that right now. Could you try again?'
    }
  }

  async function sendAIResponse(text: string) {
    try {
      log('🔊 Converting text to speech', { text, length: text.length })
      
      // Generate speech from text
      const audioData = await textToSpeech(text)
      
      if (audioData) {
        log('📤 Sending audio response via WebSocket', { audioLength: audioData.length })
        
        // Send audio response
        socket.send(JSON.stringify({
          type: 'audio_response',
          audio: audioData,
          text: text,
          timestamp: Date.now()
        }))
        
        // Also send text response for UI display
        socket.send(JSON.stringify({
          type: 'ai_response',
          text: text,
          timestamp: Date.now()
        }))
        
        log('✅ Audio response sent successfully')
      } else {
        log('❌ Failed to generate audio, sending text only')
        await sendErrorResponse(text)
      }
    } catch (error) {
      log('❌ Error sending AI response', error)
      await sendErrorResponse(text)
    }
  }

  async function sendErrorResponse(text: string) {
    try {
      // Send text-only response as fallback
      socket.send(JSON.stringify({
        type: 'text_response',
        text: text,
        timestamp: Date.now()
      }))
      log('📤 Sent text-only response')
    } catch (error) {
      log('❌ Error sending error response', error)
    }
  }

  async function textToSpeech(text: string): Promise<string> {
    try {
      return await openAITTS(text)
    } catch (error) {
      log('❌ TTS error', error)
      return ''
    }
  }

  async function openAITTS(text: string): Promise<string> {
    try {
      log('🎙️ Calling OpenAI TTS API', { text, voice: assistant.voice_id })

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: assistant.voice_id || 'alloy',
          input: text,
          response_format: 'wav',
          speed: 1.0
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('❌ OpenAI TTS error', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorText 
        })
        throw new Error(`OpenAI TTS error: ${response.status}`)
      }

      const audioBuffer = await response.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
      
      log('✅ OpenAI TTS successful', { 
        audioLength: audioBuffer.byteLength,
        base64Length: base64Audio.length 
      })
      
      return base64Audio
    } catch (error) {
      log('❌ OpenAI TTS failed', error)
      throw error
    }
  }

  async function logConversation(userMessage: string, aiResponse: string) {
    try {
      const { error } = await supabaseClient
        .from('conversation_logs')
        .insert([
          {
            call_id: callId,
            speaker: 'user',
            message: userMessage,
            timestamp: new Date().toISOString()
          },
          {
            call_id: callId,
            speaker: 'assistant',
            message: aiResponse,
            timestamp: new Date().toISOString()
          }
        ])
      
      if (error) {
        log('⚠️ Error logging conversation to database', error)
      } else {
        log('✅ Conversation logged successfully')
      }
    } catch (error) {
      log('⚠️ Exception logging conversation', error)
    }
  }

  // Heartbeat monitor to detect dead connections
  const heartbeatMonitor = setInterval(() => {
    const now = Date.now()
    if (now - lastHeartbeat > 60000) { // 60 seconds timeout
      log('💔 Heartbeat timeout, closing connection')
      socket.close(1000, 'Heartbeat timeout')
      clearInterval(heartbeatMonitor)
    }
  }, 30000) // Check every 30 seconds

  return response
})
