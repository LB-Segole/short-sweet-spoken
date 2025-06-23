
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

console.log('🎙️ Deepgram Voice Agent WebSocket v2.0 - Enhanced Assistant Integration')

serve(async (req) => {
  console.log('🚀 deepgram-voice-agent function invoked', {
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
  const assistantId = url.searchParams.get('assistantId') || 'demo'
  const userId = url.searchParams.get('userId') || 'demo-user'

  console.log('📋 WebSocket parameters extracted:', { assistantId, userId })

  // Verify WebSocket upgrade headers
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request')
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  if (!deepgramApiKey) {
    console.error('❌ Missing Deepgram API key')
    return new Response('Server configuration error', { status: 500, headers: corsHeaders })
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('✅ WebSocket upgrade successful')

    let deepgramSTT: WebSocket | null = null
    let deepgramTTS: WebSocket | null = null
    let isConnected = false
    let assistant: any = null

    const log = (msg: string, data?: any) => console.log(`[${new Date().toISOString()}] [${assistantId}] ${msg}`, data || '')

    // Get assistant configuration
    const loadAssistant = async () => {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('id', assistantId)
          .single()

        if (error || !data) {
          log('⚠️ Assistant not found, using default configuration')
          assistant = {
            id: assistantId,
            name: 'Demo Assistant',
            system_prompt: 'You are a helpful voice assistant. Be friendly and concise.',
            voice_id: 'aura-asteria-en',
            model: 'nova-2'
          }
        } else {
          assistant = data
          log('✅ Assistant loaded successfully:', assistant.name)
        }

        // Send assistant info to client
        socket.send(JSON.stringify({
          type: 'assistant_loaded',
          data: { assistant },
          timestamp: Date.now()
        }))

      } catch (error) {
        log('❌ Error loading assistant:', error)
        assistant = {
          id: assistantId,
          name: 'Demo Assistant',
          system_prompt: 'You are a helpful voice assistant. Be friendly and concise.',
          voice_id: 'aura-asteria-en',
          model: 'nova-2'
        }
      }
    }

    // Initialize Deepgram STT connection
    const connectSTT = async () => {
      try {
        log('🔗 Connecting to Deepgram STT...')
        const sttUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true`
        
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ Deepgram STT connected successfully')
        }

        deepgramSTT.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcript = data.channel.alternatives[0].transcript
              const isFinal = data.is_final || false
              
              if (transcript.trim() && isFinal) {
                log('📝 Final transcript received:', transcript)
                
                // Send transcript to client
                socket.send(JSON.stringify({
                  type: 'transcript',
                  data: { text: transcript, isFinal },
                  timestamp: Date.now()
                }))

                // Get AI response
                await processTranscript(transcript)
              }
            }
          } catch (error) {
            log('❌ Error processing STT message:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          log('❌ Deepgram STT error:', error)
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 Deepgram STT closed:', event.code)
        }

      } catch (error) {
        log('❌ Failed to connect STT:', error)
      }
    }

    // Initialize Deepgram TTS connection
    const connectTTS = async () => {
      try {
        log('🔗 Connecting to Deepgram TTS...')
        const ttsUrl = `wss://api.deepgram.com/v1/speak?model=${assistant?.voice_id || 'aura-asteria-en'}&encoding=linear16&sample_rate=24000`
        
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          log('✅ Deepgram TTS connected successfully')
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Convert audio data to base64 and send to client
            const audioData = new Uint8Array(event.data)
            const base64Audio = btoa(String.fromCharCode(...audioData))
            
            socket.send(JSON.stringify({
              type: 'audio_response',
              data: { audio_base64: base64Audio },
              timestamp: Date.now()
            }))
          }
        }

        deepgramTTS.onerror = (error) => {
          log('❌ Deepgram TTS error:', error)
        }

        deepgramTTS.onclose = (event) => {
          log('🔌 Deepgram TTS closed:', event.code)
        }

      } catch (error) {
        log('❌ Failed to connect TTS:', error)
      }
    }

    // Process transcript and get AI response
    const processTranscript = async (transcript: string) => {
      try {
        log('🤖 Processing transcript with AI...')
        
        // Call Hugging Face chat function
        const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/huggingface-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            assistantId: assistant.id,
            message: transcript,
            conversationHistory: []
          })
        })

        const result = await response.json()
        
        if (result.success && result.response) {
          const aiResponse = result.response
          log('✅ AI response received:', aiResponse.substring(0, 50) + '...')
          
          // Send text response to client
          socket.send(JSON.stringify({
            type: 'ai_response',
            data: { text: aiResponse },
            timestamp: Date.now()
          }))

          // Convert to speech
          await convertToSpeech(aiResponse)
        } else {
          log('❌ AI response error:', result.error)
        }

      } catch (error) {
        log('❌ Error processing transcript:', error)
      }
    }

    // Convert text to speech
    const convertToSpeech = async (text: string) => {
      try {
        if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
          log('🔊 Converting text to speech...')
          
          deepgramTTS.send(JSON.stringify({
            type: 'Speak',
            text: text
          }))
          
          // Flush the TTS
          setTimeout(() => {
            if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
              deepgramTTS.send(JSON.stringify({ type: 'Flush' }))
            }
          }, 100)
        }
      } catch (error) {
        log('❌ Error converting to speech:', error)
      }
    }

    // Client WebSocket handlers
    socket.onopen = async () => {
      log('🔌 Client WebSocket connected')
      isConnected = true
      
      // Load assistant and initialize connections
      await loadAssistant()
      await connectSTT()
      await connectTTS()
      
      // Send connection confirmation
      socket.send(JSON.stringify({
        type: 'connection_established',
        data: { status: 'Connected', assistant: assistant?.name },
        timestamp: Date.now()
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        log('📨 Received from client:', { type: message.type })

        switch (message.type) {
          case 'auth':
            log('🔐 Client authentication received')
            break

          case 'start_conversation':
            log('🎬 Starting conversation...')
            socket.send(JSON.stringify({
              type: 'conversation_started',
              timestamp: Date.now()
            }))
            break

          case 'audio_data':
            // Forward audio to Deepgram STT
            if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN && message.audio) {
              const audioBuffer = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0))
              deepgramSTT.send(audioBuffer)
            }
            break

          case 'text_message':
            if (message.text) {
              await processTranscript(message.text)
            }
            break

          default:
            log('❓ Unknown message type:', message.type)
        }

      } catch (error) {
        log('❌ Error processing client message:', error)
      }
    }

    socket.onclose = (event) => {
      log('🔌 Client WebSocket closed:', { code: event.code, reason: event.reason })
      isConnected = false
      
      // Clean up Deepgram connections
      if (deepgramSTT) {
        deepgramSTT.close()
        deepgramSTT = null
      }
      
      if (deepgramTTS) {
        deepgramTTS.close()
        deepgramTTS = null
      }
    }

    socket.onerror = (error) => {
      log('❌ Client WebSocket error:', error)
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
