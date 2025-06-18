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

  console.log('🔄 Upgrading to WebSocket connection...')
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

  // Enhanced logging function
  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [Call: ${callId}] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  // Get assistant configuration
  if (assistantId && assistantId !== 'demo') {
    try {
      const { data: assistantData } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single()
      
      if (assistantData) {
        assistant = assistantData
        log('✅ Assistant loaded:', { name: assistant.name, voice_provider: assistant.voice_provider })
      }
    } catch (error) {
      log('⚠️ Error fetching assistant, using default:', error)
    }
  }

  // Default assistant configuration
  if (!assistant) {
    assistant = {
      name: 'Demo Assistant',
      system_prompt: 'You are a helpful AI assistant from First Choice LLC. Be friendly, professional, and concise. Keep responses under 2 sentences and under 30 words. Ask engaging questions to keep the conversation flowing.',
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

  socket.onopen = async () => {
    log('🔌 WebSocket connected successfully')
    isCallActive = true
    
    // Send connection acknowledgment
    socket.send(JSON.stringify({
      type: 'connection_established',
      callId: callId,
      assistantId: assistantId,
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
      log('📨 Received message:', { type: message.event || message.type })
      
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
            await handleIncomingAudio(message.media.payload)
          }
          break

        case 'text_input':
          if (message.text && message.text.trim()) {
            log('💬 Text input received:', message.text)
            await processTextInput(message.text)
          }
          break

        case 'request_greeting':
          log('🎤 Greeting requested')
          if (assistant.first_message) {
            await sendAIResponse(assistant.first_message)
          }
          break

        case 'stop':
        case 'disconnect':
          log('🛑 Call ended by client')
          isCallActive = false
          break

        default:
          log('❓ Unknown event received:', message.event || message.type)
      }
    } catch (error) {
      log('❌ Error processing WebSocket message:', error)
    }
  }

  socket.onclose = (event) => {
    log('🔌 WebSocket closed', { code: event.code, reason: event.reason })
    isCallActive = false
  }

  socket.onerror = (error) => {
    log('❌ WebSocket error:', error)
    isCallActive = false
  }

  async function handleIncomingAudio(audioPayload: string) {
    try {
      // Add to buffer
      audioBuffer.push(audioPayload)
      
      // Process audio every 2 seconds or when buffer reaches threshold
      const now = Date.now()
      if (now - lastProcessTime > 2000 || audioBuffer.length > 20) {  // Reduced buffer threshold from 50 to 20
        lastProcessTime = now
        
        // Combine buffer and process
        const combinedAudio = audioBuffer.join('')
        audioBuffer = []
        
        if (combinedAudio.length > 100) {  // Reduced minimum threshold from 500 to 100
          log('🎵 Processing audio chunk', { length: combinedAudio.length })
          await processAudioChunk(combinedAudio)
        }
      }
    } catch (error) {
      log('❌ Error handling incoming audio:', error)
    }
  }

  async function processTextInput(text: string) {
    try {
      log('💭 Processing text input:', text)
      
      // Add user message to conversation
      conversationHistory.push({
        role: 'user',
        content: text
      })

      // Generate AI response
      const aiResponse = await generateAIResponse()
      
      if (aiResponse) {
        log('🤖 AI response generated:', aiResponse)
        await sendAIResponse(aiResponse)
        
        // Add AI response to conversation
        conversationHistory.push({
          role: 'assistant',
          content: aiResponse
        })

        // Log conversation
        await logConversation(text, aiResponse)
      }
    } catch (error) {
      log('❌ Error processing text input:', error)
    }
  }

  async function processAudioChunk(audioData: string) {
    try {
      log('🎤 Starting audio transcription', { dataLength: audioData.length })
      
      // Convert audio to format suitable for transcription
      const transcript = await transcribeAudio(audioData)
      
      if (transcript && transcript.trim().length > 2) {
        log('👤 User said:', transcript)
        
        // Send transcript event
        socket.send(JSON.stringify({
          type: 'transcript',
          text: transcript,
          timestamp: Date.now()
        }))
        
        // Process as text input
        await processTextInput(transcript)
      } else {
        log('🔇 No meaningful transcript received', {
          audioDataLength: audioData.length,
          transcript: transcript || '(empty)'
        })
      }
    } catch (error) {
      log('❌ Error processing audio chunk:', error)
    }
  }

  async function transcribeAudio(audioData: string): Promise<string> {
    try {
      log('🎤 Transcribing audio with OpenAI Whisper', { dataLength: audioData.length })
      
      // Decode base64 audio
      const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      log('✅ Decoded binary data', { binaryDataLength: binaryData.length })
      
      // Create form data for OpenAI Whisper
      const formData = new FormData()
      const audioBlob = new Blob([binaryData], { type: 'audio/wav' })
      formData.append('file', audioBlob, 'audio.wav')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

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
        log('❌ OpenAI Whisper API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
        return ''
      }

      const result = await response.json()
      const transcript = result.text || ''
      
      log('✅ Transcription result:', {
        transcript,
        length: transcript.length,
        whisperResponse: result
      })

      return transcript
    } catch (error) {
      log('❌ Transcription error:', error)
      // Send a notification to the client about the transcription error
        socket.send(JSON.stringify({
        type: 'error',
        message: 'Error transcribing audio. Please try speaking again.',
          timestamp: Date.now()
        }))
      return ''
    }
  }

  async function generateAIResponse(): Promise<string> {
    try {
      // Keep only recent conversation history to stay within token limits
      const recentHistory = conversationHistory.slice(-6)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: assistant.model || 'gpt-4o-mini',
          messages: recentHistory,
          temperature: assistant.temperature || 0.7,
          max_tokens: assistant.max_tokens || 50
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        log('❌ OpenAI API error:', { status: response.status, error: errorText })
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const result = await response.json()
      const aiResponse = result.choices?.[0]?.message?.content || 'I apologize, but I didn\'t catch that. Could you please repeat?'
      
      log('✅ OpenAI response received:', { response: aiResponse, usage: result.usage })
      
      return aiResponse
    } catch (error) {
      log('❌ AI response generation error:', error)
      return 'I\'m having trouble processing that right now. Could you try again?'
    }
  }

  async function sendAIResponse(text: string) {
    try {
      log('🔊 Converting text to speech:', text)
      
      // Generate speech from text
      const audioData = await textToSpeech(text)
      
      if (audioData) {
        log('📤 Sending audio response via WebSocket')
        
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
        
        // Send text-only response as fallback
        socket.send(JSON.stringify({
          type: 'text_response',
          text: text,
          timestamp: Date.now()
        }))
      }
    } catch (error) {
      log('❌ Error sending AI response:', error)
      
      // Send text fallback on error
      socket.send(JSON.stringify({
        type: 'text_response',
        text: text,
        timestamp: Date.now()
      }))
  }
  }

  async function textToSpeech(text: string): Promise<string> {
    try {
      return await openAITTS(text)
    } catch (error) {
      log('❌ TTS error:', error)
      return ''
    }
  }

  async function openAITTS(text: string): Promise<string> {
    try {
      log('🎙️ Calling OpenAI TTS API')

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
        log('❌ OpenAI TTS error:', { status: response.status, error: errorText })
        throw new Error(`OpenAI TTS error: ${response.status}`)
      }

      const audioBuffer = await response.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
      
      log('✅ OpenAI TTS successful', { audioLength: audioBuffer.byteLength })
      
      return base64Audio
    } catch (error) {
      log('❌ OpenAI TTS failed:', error)
      throw error
    }
  }

  async function logConversation(userMessage: string, aiResponse: string) {
    try {
      await supabaseClient
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
      
      log('✅ Conversation logged successfully')
    } catch (error) {
      log('⚠️ Error logging conversation:', error)
    }
  }

  return response
})
