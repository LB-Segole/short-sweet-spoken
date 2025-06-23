import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

console.log('🎙️ Deepgram Voice Agent WebSocket v3.0 - Real-time Voice Chat')

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
  const connectionHeader = req.headers.get('connection')
  
  if (upgradeHeader?.toLowerCase() !== 'websocket' || !connectionHeader?.toLowerCase().includes('upgrade')) {
    console.log('❌ Not a valid WebSocket upgrade request', { upgradeHeader, connectionHeader })
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  // Check required environment variables
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const huggingFaceApi = Deno.env.get('HUGGING_FACE_API')
  
  if (!deepgramApiKey || !huggingFaceApi) {
    console.error('❌ Missing required API keys', { deepgramApiKey: !!deepgramApiKey, huggingFaceApi: !!huggingFaceApi })
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
    let conversationHistory: Array<{ role: string; content: string }> = []

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
            system_prompt: 'You are a helpful voice assistant. Be friendly, conversational, and keep responses concise since this is a voice conversation.',
            voice_id: 'aura-asteria-en',
            model: 'nova-2',
            temperature: 0.8,
            max_tokens: 150
          }
        } else {
          assistant = data
          log('✅ Assistant loaded successfully:', assistant.name)
        }

        // Send assistant info to client
        sendToClient({
          type: 'assistant_loaded',
          data: { assistant },
          timestamp: Date.now()
        })

      } catch (error) {
        log('❌ Error loading assistant:', error)
        assistant = {
          id: assistantId,
          name: 'Demo Assistant',
          system_prompt: 'You are a helpful voice assistant. Be friendly, conversational, and keep responses concise.',
          voice_id: 'aura-asteria-en',
          model: 'nova-2'
        }
      }
    }

    const sendToClient = (message: any) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message))
      }
    }

    // Initialize Deepgram STT connection
    const connectSTT = async () => {
      try {
        log('🔗 Connecting to Deepgram STT...')
        const sttUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false&utterance_end_ms=1000&vad_events=true`
        
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ Deepgram STT connected successfully')
          sendToClient({
            type: 'stt_connected',
            timestamp: Date.now()
          })
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
                sendToClient({
                  type: 'transcript',
                  data: { text: transcript, isFinal },
                  timestamp: Date.now()
                })

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
          sendToClient({
            type: 'error',
            data: { error: 'Speech recognition error' },
            timestamp: Date.now()
          })
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 Deepgram STT closed:', event.code)
        }

      } catch (error) {
        log('❌ Failed to connect STT:', error)
        sendToClient({
          type: 'error',
          data: { error: 'Failed to connect speech recognition' },
          timestamp: Date.now()
        })
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
          sendToClient({
            type: 'tts_connected',
            timestamp: Date.now()
          })
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            // Convert audio data to base64 and send to client
            const audioData = new Uint8Array(event.data)
            const base64Audio = btoa(String.fromCharCode(...audioData))
            
            sendToClient({
              type: 'audio_response',
              data: { audio_base64: base64Audio },
              timestamp: Date.now()
            })
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
        
        // Add user message to conversation history
        conversationHistory.push({ role: 'user', content: transcript })
        
        // Keep only last 10 messages to avoid token limits
        if (conversationHistory.length > 10) {
          conversationHistory = conversationHistory.slice(-10)
        }

        // Prepare messages for Hugging Face
        const systemPrompt = assistant?.system_prompt || 'You are a helpful voice assistant. Be friendly, conversational, and keep responses concise since this is a voice conversation.'
        
        let conversationContext = `System: ${systemPrompt}\n\n`
        
        // Add conversation history
        for (const msg of conversationHistory.slice(-5)) { // Last 5 messages
          if (msg.role === 'user') {
            conversationContext += `Human: ${msg.content}\n`
          } else if (msg.role === 'assistant') {
            conversationContext += `Assistant: ${msg.content}\n`
          }
        }
        
        conversationContext += `Human: ${transcript}\nAssistant:`

        // Call Hugging Face API directly
        const hfResponse = await fetch(
          'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${huggingFaceApi}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: conversationContext,
              parameters: {
                max_new_tokens: assistant?.max_tokens || 100,
                temperature: assistant?.temperature || 0.8,
                do_sample: true,
                top_p: 0.9,
                return_full_text: false
              }
            }),
          }
        )

        if (!hfResponse.ok) {
          throw new Error(`Hugging Face API error: ${hfResponse.status}`)
        }

        const hfData = await hfResponse.json()
        let aiResponse = ''
        
        if (Array.isArray(hfData) && hfData.length > 0) {
          if (hfData[0].generated_text) {
            aiResponse = hfData[0].generated_text.trim()
          }
        }

        // Clean up the response
        if (aiResponse) {
          aiResponse = aiResponse.replace(/^(System:|Human:|Assistant:).*?\n/gm, '')
          aiResponse = aiResponse.replace(conversationContext, '').trim()
          aiResponse = aiResponse.replace(/^(Assistant:|AI:|Bot:)\s*/i, '').trim()
          
          // Ensure response is not too long for voice
          if (aiResponse.length > 300) {
            aiResponse = aiResponse.substring(0, 300) + '...'
          }
        }

        if (!aiResponse || aiResponse.length === 0) {
          aiResponse = "I'm sorry, I didn't catch that. Could you please repeat your question?"
        }

        log('✅ AI response generated:', aiResponse.substring(0, 50) + '...')
        
        // Add assistant response to conversation history
        conversationHistory.push({ role: 'assistant', content: aiResponse })
        
        // Send text response to client
        sendToClient({
          type: 'ai_response',
          data: { text: aiResponse },
          timestamp: Date.now()
        })

        // Convert to speech
        await convertToSpeech(aiResponse)

      } catch (error) {
        log('❌ Error processing transcript:', error)
        const fallbackResponse = "I'm having trouble processing your request. Could you please try again?"
        
        sendToClient({
          type: 'ai_response',
          data: { text: fallbackResponse },
          timestamp: Date.now()
        })
        
        await convertToSpeech(fallbackResponse)
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
      
      // Send immediate connection confirmation
      sendToClient({
        type: 'connection_established',
        data: { status: 'Connected' },
        timestamp: Date.now()
      })
      
      // Load assistant and initialize connections
      await loadAssistant()
      await connectSTT()
      await connectTTS()
      
      // Wait a bit then send ready status
      setTimeout(() => {
        sendToClient({
          type: 'ready',
          data: { status: 'Ready to chat', assistant: assistant?.name },
          timestamp: Date.now()
        })
      }, 1000)
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        log('📨 Received from client:', { type: message.type })

        switch (message.type) {
          case 'auth':
            log('🔐 Client authentication received')
            sendToClient({
              type: 'auth_confirmed',
              timestamp: Date.now()
            })
            break

          case 'start_conversation':
            log('🎬 Starting conversation...')
            sendToClient({
              type: 'conversation_started',
              data: { status: 'Listening...' },
              timestamp: Date.now()
            })
            break

          case 'audio_data':
            // Forward audio to Deepgram STT
            if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN && message.audio) {
              try {
                const audioBuffer = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0))
                deepgramSTT.send(audioBuffer)
              } catch (error) {
                log('❌ Error forwarding audio to STT:', error)
              }
            }
            break

          case 'text_message':
            if (message.text) {
              await processTranscript(message.text)
            }
            break

          case 'ping':
            sendToClient({
              type: 'pong',
              timestamp: Date.now()
            })
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
