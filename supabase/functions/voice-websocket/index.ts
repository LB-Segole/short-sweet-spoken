
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  console.log('🔄 Voice WebSocket function called', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
    url: req.url
  })

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const callId = url.searchParams.get('callId') || 'browser-test'
  const assistantId = url.searchParams.get('assistantId') || 'demo'

  console.log('📋 WebSocket parameters', { callId, assistantId })

  // Check if this is a WebSocket upgrade request
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request', { upgrade: upgradeHeader })
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

  console.log('✅ OpenAI API key found, upgrading to WebSocket...')

  try {
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
    let isProcessingAudio = false

    // Enhanced logging function
    const log = (message: string, data?: any) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [Call: ${callId}] ${message}`, data || '')
    }

    // Get assistant configuration
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
            voice_provider: assistant.voice_provider 
          })
        }
      } catch (error) {
        log('⚠️ Exception fetching assistant, using default', error)
      }
    }

    // Default assistant configuration
    if (!assistant) {
      assistant = {
        name: 'Demo Assistant',
        system_prompt: 'You are a helpful AI assistant. Be friendly, professional, and concise. Keep responses under 2 sentences.',
        first_message: 'Hello! This is your AI assistant. How can I help you today?',
        voice_provider: 'openai',
        voice_id: 'alloy',
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 50
      }
      log('✅ Using default assistant configuration')
    }

    // Initialize conversation
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
        assistant: {
          name: assistant.name,
          voice_provider: assistant.voice_provider
        },
        timestamp: Date.now()
      }))

      // Send greeting after short delay
      if (!hasSpoken && assistant.first_message) {
        log('🎤 Sending initial greeting')
        setTimeout(async () => {
          await sendAIResponse(assistant.first_message)
          hasSpoken = true
        }, 1000)
      }
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        log('📨 Received message', { type: message.event || message.type })
        
        switch (message.event || message.type) {
          case 'connected':
          case 'connection_established':
            log('✅ Client confirmed connection')
            if (!hasSpoken && assistant.first_message) {
              await sendAIResponse(assistant.first_message)
              hasSpoken = true
            }
            break

          case 'media':
            if (isCallActive && message.media?.payload && !isProcessingAudio) {
              await handleIncomingAudio(message.media.payload)
            }
            break

          case 'text_input':
            if (message.text && message.text.trim()) {
              log('💬 Text input received', { text: message.text })
              await processTextInput(message.text)
            }
            break

          case 'request_greeting':
            log('🎤 Greeting requested by client')
            if (assistant.first_message) {
              await sendAIResponse(assistant.first_message)
            }
            break

          case 'ping':
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

    async function handleIncomingAudio(audioPayload: string) {
      try {
        audioBuffer.push(audioPayload)
        
        const now = Date.now()
        if ((now - lastProcessTime > 3000) || (audioBuffer.length > 15)) {
          isProcessingAudio = true
          lastProcessTime = now
          
          const combinedAudio = audioBuffer.join('')
          audioBuffer = []
          
          if (combinedAudio.length > 100) {
            await processAudioChunk(combinedAudio)
          }
          
          isProcessingAudio = false
        }
      } catch (error) {
        log('❌ Error handling incoming audio', error)
        isProcessingAudio = false
      }
    }

    async function processTextInput(text: string) {
      try {
        log('💭 Processing text input', { text })
        
        conversationHistory.push({
          role: 'user',
          content: text
        })

        const aiResponse = await generateAIResponse()
        
        if (aiResponse) {
          await sendAIResponse(aiResponse)
          conversationHistory.push({
            role: 'assistant',
            content: aiResponse
          })
        }
      } catch (error) {
        log('❌ Error processing text input', error)
        await sendErrorResponse('I apologize, I\'m having trouble processing that. Could you try again?')
      }
    }

    async function processAudioChunk(audioData: string) {
      try {
        log('🎤 Starting audio transcription', { dataLength: audioData.length })
        
        const transcript = await transcribeAudio(audioData)
        
        if (transcript && transcript.trim().length > 3) {
          log('👤 User said', { transcript })
          
          socket.send(JSON.stringify({
            type: 'transcript',
            text: transcript,
            timestamp: Date.now()
          }))
          
          await processTextInput(transcript)
        }
      } catch (error) {
        log('❌ Error processing audio chunk', error)
      }
    }

    async function transcribeAudio(audioData: string): Promise<string> {
      try {
        const binaryData = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
        
        const formData = new FormData()
        const audioBlob = new Blob([binaryData], { type: 'audio/wav' })
        formData.append('file', audioBlob, 'audio.wav')
        formData.append('model', 'whisper-1')
        formData.append('language', 'en')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: formData
        })

        if (!response.ok) {
          log('❌ Transcription API error', { status: response.status })
          return ''
        }

        const result = await response.json()
        return result.text || ''
      } catch (error) {
        log('❌ Transcription error', error)
        return ''
      }
    }

    async function generateAIResponse(): Promise<string> {
      try {
        log('🧠 Generating AI response')

        const recentHistory = conversationHistory.slice(-8)
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: assistant.model || 'gpt-4o-mini',
            messages: recentHistory,
            temperature: assistant.temperature || 0.8,
            max_tokens: assistant.max_tokens || 60
          })
        })

        if (!response.ok) {
          log('❌ AI generation error', { status: response.status })
          return 'I\'m having trouble processing that right now. Could you try again?'
        }

        const result = await response.json()
        const aiResponse = result.choices?.[0]?.message?.content || 'I didn\'t catch that. Could you repeat?'
        
        log('✅ AI response generated', { response: aiResponse })
        return aiResponse.trim()
      } catch (error) {
        log('❌ AI response generation error', error)
        return 'I\'m having trouble processing that right now. Could you try again?'
      }
    }

    async function sendAIResponse(text: string) {
      try {
        log('🔊 Converting text to speech', { text })
        
        const audioData = await textToSpeech(text)
        
        if (audioData) {
          socket.send(JSON.stringify({
            type: 'audio_response',
            audio: audioData,
            text: text,
            timestamp: Date.now()
          }))
          
          socket.send(JSON.stringify({
            type: 'ai_response',
            text: text,
            timestamp: Date.now()
          }))
          
          log('✅ Audio response sent successfully')
        } else {
          await sendErrorResponse(text)
        }
      } catch (error) {
        log('❌ Error sending AI response', error)
        await sendErrorResponse(text)
      }
    }

    async function sendErrorResponse(text: string) {
      try {
        socket.send(JSON.stringify({
          type: 'text_response',
          text: text,
          timestamp: Date.now(),
          fallback: true
        }))
      } catch (error) {
        log('❌ Error sending error response', error)
      }
    }

    async function textToSpeech(text: string): Promise<string> {
      try {
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
            response_format: 'wav'
          })
        })

        if (!response.ok) {
          log('❌ TTS error', { status: response.status })
          return ''
        }

        const audioBuffer = await response.arrayBuffer()
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
        
        log('✅ TTS successful', { audioLength: audioBuffer.byteLength })
        return base64Audio
      } catch (error) {
        log('❌ TTS failed', error)
        return ''
      }
    }

    log('✅ WebSocket handlers configured, returning response')
    return response

  } catch (error) {
    console.error('❌ Critical error in voice-websocket function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: Date.now()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
