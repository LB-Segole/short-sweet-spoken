import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🎙️ Deepgram Voice Agent WebSocket v17.0 - Enhanced Error Handling & Diagnostics')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  const upgradeHeader = req.headers.get('upgrade') || ''
  const method = req.method
  
  console.log(`⌛ Received: ${method} upgrade=${upgradeHeader}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight')
    return new Response(null, { headers: corsHeaders })
  }

  // Enhanced environment check with detailed diagnostics
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  console.log('🔑 Environment diagnostics:', {
    deepgramKeyPresent: !!deepgramApiKey,
    deepgramKeyLength: deepgramApiKey ? deepgramApiKey.length : 0,
    openaiKeyPresent: !!openaiApiKey,
    openaiKeyLength: openaiApiKey ? openaiApiKey.length : 0,
    hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
    hasSupabaseKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  })
  
  if (!deepgramApiKey || !openaiApiKey) {
    const missingKeys = []
    if (!deepgramApiKey) missingKeys.push('DEEPGRAM_API_KEY')
    if (!openaiApiKey) missingKeys.push('OPENAI_API_KEY')
    
    console.error('❌ Missing required API keys:', missingKeys)
    return new Response(
      JSON.stringify({ 
        error: 'Required API keys not configured',
        details: {
          missing: missingKeys,
          help: 'Please add the missing API keys to your Supabase Edge Function secrets'
        }
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    )
  }

  // Check for WebSocket upgrade AFTER environment validation
  if (upgradeHeader.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket request, returning 426')
    return new Response(
      JSON.stringify({ 
        error: "Expected WebSocket connection",
        details: "This endpoint requires a WebSocket upgrade",
        status: "ready"
      }),
      {
        status: 426,
        headers: { 
          'Content-Type': 'application/json',
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
          'Sec-WebSocket-Version': '13',
          ...corsHeaders
        },
      }
    )
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    
    // Perform WebSocket upgrade
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('✅ WebSocket upgrade successful!')

    // Connection state management
    let isConnectionAlive = true
    let deepgramSTT: WebSocket | null = null
    let deepgramTTS: WebSocket | null = null
    let assistant: any = null
    let conversationHistory: Array<{ role: string; content: string }> = []
    let assistantId = 'demo'
    let userId = 'demo-user'
    let firstMessageSent = false
    let pingInterval: number | null = null
    let connectionId = crypto.randomUUID()
    let lastPongTime = Date.now()
    let connectionEstablished = false

    // Enhanced logging function
    const log = (msg: string, data?: any) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [${connectionId}] ${msg}`, data ? JSON.stringify(data) : '')
    }

    // Safe message sending with enhanced error handling
    const sendToClient = (message: any) => {
      if (!isConnectionAlive || socket.readyState !== WebSocket.OPEN) {
        log('⚠️ Skipping message send - connection not alive', { readyState: socket.readyState })
        return false
      }
      
      try {
        const messageStr = JSON.stringify(message)
        socket.send(messageStr)
        log('📤 Sent to client:', { type: message.type, size: messageStr.length })
        return true
      } catch (error) {
        log('❌ Error sending to client:', error)
        isConnectionAlive = false
        return false
      }
    }

    // Test Deepgram connectivity
    const testDeepgramConnection = async () => {
      try {
        log('🧪 Testing Deepgram API connectivity...')
        
        const response = await fetch('https://api.deepgram.com/v1/projects', {
          method: 'GET',
          headers: {
            'Authorization': `Token ${deepgramApiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          log('✅ Deepgram API connection successful')
          return true
        } else {
          log('❌ Deepgram API test failed:', { status: response.status, statusText: response.statusText })
          return false
        }
      } catch (error) {
        log('❌ Deepgram API test error:', error)
        return false
      }
    }

    // Test OpenAI connectivity
    const testOpenAIConnection = async () => {
      try {
        log('🧪 Testing OpenAI API connectivity...')
        
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          log('✅ OpenAI API connection successful')
          return true
        } else {
          log('❌ OpenAI API test failed:', { status: response.status, statusText: response.statusText })
          return false
        }
      } catch (error) {
        log('❌ OpenAI API test error:', error)
        return false
      }
    }

    // Initialize Deepgram STT connection
    const connectSTT = async () => {
      if (!isConnectionAlive) return
      
      try {
        log('🔗 Connecting to Deepgram STT...')
        
        const sttUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300&utterance_end_ms=1000&vad_events=true&punctuate=true`
        
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          if (!isConnectionAlive) return
          log('✅ Deepgram STT connected successfully')
          sendToClient({
            type: 'stt_connected',
            status: 'STT ready for audio input',
            timestamp: Date.now()
          })
        }

        deepgramSTT.onmessage = async (event) => {
          if (!isConnectionAlive) return
          
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              const isFinal = data.is_final || false
              const speechFinal = data.speech_final || false
              
              if (transcript && transcript.length > 2) {
                log('📝 Transcript received:', { transcript: transcript.substring(0, 100), isFinal, speechFinal })
                
                sendToClient({
                  type: 'transcript',
                  text: transcript,
                  isFinal,
                  speechFinal,
                  timestamp: Date.now()
                })

                if (speechFinal || isFinal) {
                  setTimeout(async () => {
                    await processTranscript(transcript)
                  }, 100)
                }
              }
            }

            if (data.type === 'UtteranceEnd') {
              log('🔚 Utterance end detected')
            }

            if (data.type === 'SpeechStarted') {
              log('🎤 Speech detection started')
            }
            
          } catch (error) {
            log('❌ Error processing STT message:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          log('❌ Deepgram STT error:', error)
          if (isConnectionAlive) {
            setTimeout(() => connectSTT(), 2000)
          }
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 Deepgram STT closed:', { code: event.code, reason: event.reason })
          if (isConnectionAlive && event.code !== 1000) {
            setTimeout(() => connectSTT(), 2000)
          }
        }

      } catch (error) {
        log('❌ Failed to connect STT:', error)
        if (isConnectionAlive) {
          setTimeout(() => connectSTT(), 5000)
        }
      }
    }

    // Initialize Deepgram TTS connection
    const connectTTS = async () => {
      if (!isConnectionAlive) return
      
      try {
        log('🔗 Connecting to Deepgram TTS...')
        
        const voiceModel = assistant?.voice_id || 'aura-asteria-en'
        const ttsUrl = `wss://api.deepgram.com/v1/speak?model=${voiceModel}&encoding=linear16&sample_rate=24000&container=none`
        
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          if (!isConnectionAlive) return
          
          log('✅ Deepgram TTS connected successfully')
          sendToClient({
            type: 'tts_connected',
            status: 'TTS ready for text-to-speech',
            timestamp: Date.now()
          })
          
          // Send first message after TTS is ready
          if (assistant?.first_message && !firstMessageSent) {
            setTimeout(() => {
              if (isConnectionAlive) {
                sendTTSMessage(assistant.first_message)
                firstMessageSent = true
              }
            }, 500)
          }
        }

        deepgramTTS.onmessage = (event) => {
          if (!isConnectionAlive) return
          
          if (event.data instanceof ArrayBuffer) {
            const audioData = new Uint8Array(event.data)
            const base64Audio = btoa(String.fromCharCode(...audioData))
            
            sendToClient({
              type: 'audio_response',
              audio: base64Audio,
              timestamp: Date.now()
            })
          }
        }

        deepgramTTS.onerror = (error) => {
          log('❌ Deepgram TTS error:', error)
          if (isConnectionAlive) {
            setTimeout(() => connectTTS(), 2000)
          }
        }

        deepgramTTS.onclose = (event) => {
          log('🔌 Deepgram TTS closed:', { code: event.code, reason: event.reason })
          if (isConnectionAlive && event.code !== 1000) {
            setTimeout(() => connectTTS(), 2000)
          }
        }

      } catch (error) {
        log('❌ Failed to connect TTS:', error)
        if (isConnectionAlive) {
          setTimeout(() => connectTTS(), 5000)
        }
      }
    }

    // Process transcript and get AI response
    const processTranscript = async (transcript: string) => {
      if (!isConnectionAlive) return
      
      try {
        log('🤖 Processing transcript with OpenAI...', { transcript: transcript.substring(0, 100) })
        
        conversationHistory.push({ role: 'user', content: transcript })
        
        if (conversationHistory.length > 10) {
          conversationHistory = conversationHistory.slice(-10)
        }

        const systemPrompt = assistant?.system_prompt || 'You are a helpful voice assistant. Be friendly, conversational, and keep responses concise since this is a voice conversation.'
        
        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ]

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: assistant?.model || 'gpt-4o-mini',
            messages: messages,
            max_tokens: assistant?.max_tokens || 150,
            temperature: assistant?.temperature || 0.8,
          }),
        })

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`)
        }

        const openaiData = await openaiResponse.json()
        let aiResponse = openaiData.choices?.[0]?.message?.content?.trim() || ''

        if (aiResponse.length > 300) {
          aiResponse = aiResponse.substring(0, 300) + '...'
        }

        if (!aiResponse) {
          aiResponse = "I understand. Could you tell me more about that?"
        }

        log('✅ AI response generated:', aiResponse.substring(0, 100))
        
        conversationHistory.push({ role: 'assistant', content: aiResponse })
        
        sendToClient({
          type: 'ai_response',
          text: aiResponse,
          timestamp: Date.now()
        })

        await sendTTSMessage(aiResponse)

      } catch (error) {
        log('❌ Error processing transcript:', error)
        const fallbackResponse = "I'm having trouble processing your request. Could you please try again?"
        
        sendToClient({
          type: 'ai_response',
          text: fallbackResponse,
          timestamp: Date.now()
        })
        
        await sendTTSMessage(fallbackResponse)
      }
    }

    // Send text to TTS
    const sendTTSMessage = async (text: string) => {
      if (!isConnectionAlive || !deepgramTTS) return
      
      try {
        if (deepgramTTS.readyState === WebSocket.OPEN) {
          log('🔊 Converting text to speech:', text.substring(0, 100))
          
          deepgramTTS.send(JSON.stringify({ type: 'Clear' }))
          
          setTimeout(() => {
            if (isConnectionAlive && deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
              deepgramTTS.send(JSON.stringify({
                type: 'Speak',
                text: text
              }))
              
              setTimeout(() => {
                if (isConnectionAlive && deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
                  deepgramTTS.send(JSON.stringify({ type: 'Flush' }))
                }
              }, 100)
            }
          }, 100)
        } else {
          log('⚠️ TTS not ready for message:', { readyState: deepgramTTS?.readyState })
        }
      } catch (error) {
        log('❌ Error sending TTS message:', error)
      }
    }

    // Load assistant configuration
    const loadAssistant = async (id: string) => {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const { data } = await supabase
          .from('voice_agents')
          .select('*')
          .eq('id', id)
          .single()

        if (data) {
          assistant = data
          log('✅ Assistant loaded successfully:', assistant.name)
        } else {
          assistant = {
            id: id,
            name: 'Demo Assistant',
            system_prompt: 'You are a helpful voice assistant. Be friendly, conversational, and keep responses concise since this is a voice conversation.',
            first_message: 'Hello! I can hear you clearly. How can I help you today?',
            voice_id: 'aura-asteria-en',
            model: 'gpt-4o-mini',
            temperature: 0.8,
            max_tokens: 150
          }
          log('🤖 Using default assistant configuration')
        }

        sendToClient({
          type: 'connection_established',
          assistant: {
            name: assistant.name,
            first_message: assistant.first_message
          },
          timestamp: Date.now()
        })

      } catch (error) {
        log('❌ Error loading assistant:', error)
        assistant = {
          id: id,
          name: 'Demo Assistant',
          system_prompt: 'You are a helpful voice assistant.',
          first_message: 'Hello! How can I help you today?',
          voice_id: 'aura-asteria-en'
        }
      }
    }

    // Start ping-pong keepalive
    const startPingPong = () => {
      if (pingInterval) return
      
      log('💓 Starting ping-pong keepalive system')
      
      pingInterval = setInterval(() => {
        if (!isConnectionAlive || socket.readyState !== WebSocket.OPEN) {
          log('💔 Connection not alive, stopping ping')
          if (pingInterval) {
            clearInterval(pingInterval)
            pingInterval = null
          }
          return
        }

        try {
          const now = Date.now()
          
          if (now - lastPongTime > 45000) {
            log('⚠️ No pong received for 45s, connection may be dead')
            isConnectionAlive = false
            socket.close(1008, 'Keepalive timeout')
            return
          }

          socket.send(JSON.stringify({
            type: 'ping',
            timestamp: now
          }))
          log('💓 Sent ping')
          
        } catch (error) {
          log('❌ Error sending ping:', error)
          isConnectionAlive = false
        }
      }, 20000)
    }

    // Enhanced cleanup function
    const cleanup = () => {
      log('🧹 Starting cleanup process...')
      isConnectionAlive = false
      
      if (pingInterval) {
        clearInterval(pingInterval)
        pingInterval = null
        log('✅ Ping interval cleared')
      }
      
      if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN) {
        try {
          deepgramSTT.close()
          log('✅ Deepgram STT connection closed')
        } catch (error) {
          log('⚠️ Error closing STT connection:', error)
        }
      }
      
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
        try {
          deepgramTTS.close()
          log('✅ Deepgram TTS connection closed')
        } catch (error) {
          log('⚠️ Error closing TTS connection:', error)
        }
      }
      
      log('✅ Cleanup completed')
    }

    // WebSocket event handlers
    socket.onopen = async () => {
      try {
        log('🔌 Socket opened')
        isConnectionAlive = true
        connectionEstablished = true
        lastPongTime = Date.now()
        
        // Start ping-pong keepalive
        startPingPong()
        
        sendToClient({
          type: 'connection_ready',
          connectionId,
          status: 'WebSocket connection established - ready for commands',
          timestamp: Date.now()
        })
        
        // Test API connectivity
        log('🧪 Running connectivity tests...')
        const [deepgramOk, openaiOk] = await Promise.all([
          testDeepgramConnection(),
          testOpenAIConnection()
        ])
        
        if (!deepgramOk || !openaiOk) {
          sendToClient({
            type: 'error',
            error: `API connectivity issues: Deepgram=${deepgramOk}, OpenAI=${openaiOk}`,
            timestamp: Date.now()
          })
        }
        
        log('✅ WebSocket fully initialized and ready')
        
      } catch (error) {
        log('❌ Error in onopen handler:', error)
      }
    }

    socket.onmessage = async (event) => {
      if (!isConnectionAlive) return
      
      try {
        lastPongTime = Date.now()
        
        const message = JSON.parse(event.data)
        log('📨 Received from client:', { event: message.event || message.type, size: event.data.length })

        // Handle pong responses
        if (message.type === 'pong') {
          log('💓 Received pong from client')
          return
        }

        // Handle ping from client
        if (message.type === 'ping') {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }))
            log('💓 Sent pong response')
          }
          return
        }

        // Handle start event
        if (message.event === 'start') {
          log("✅ Received 'start' event", message.message)

          // Acknowledge to client
          socket.send(JSON.stringify({
            type: "ack",
            message: `Session started: ${message.message}`,
            timestamp: Date.now()
          }))

          // Load assistant config
          await loadAssistant(assistantId)

          // Connect to Deepgram STT and TTS
          await connectSTT()
          await connectTTS()

          // Send ready signal
          sendToClient({
            type: 'ready',
            status: 'Assistant is ready for voice input',
            assistant: assistant?.name,
            timestamp: Date.now()
          })

          return
        }

        // Handle other message events
        switch (message.event) {
          case 'media':
            if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN && message.media?.payload) {
              try {
                const audioBuffer = Uint8Array.from(atob(message.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(audioBuffer)
                if (Math.random() < 0.01) {
                  log('🎵 Audio forwarded to STT', { size: audioBuffer.length })
                }
              } catch (error) {
                log('❌ Error forwarding audio to STT:', error)
              }
            } else {
              log('⚠️ Cannot forward audio - STT not ready')
            }
            break

          case 'speak':
            if (message.text) {
              log('🔊 Speak event received:', message.text.substring(0, 50))
              await sendTTSMessage(message.text)
            }
            break

          case 'text_input':
            if (message.text) {
              log('📝 Processing text input:', message.text.substring(0, 50))
              setTimeout(async () => {
                await processTranscript(message.text)
              }, 100)
            }
            break

          case 'test':
            log('🧪 Test message received')
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'test_response',
                message: 'Backend received your test message',
                timestamp: Date.now()
              }))
              log('📤 Sent test response')
            }
            break

          default:
            console.warn(`❓ Unknown event: ${message.event}`)
        }

      } catch (error) {
        log('❌ Error processing client message:', error)
        sendToClient({
          type: 'error',
          error: 'Failed to process message',
          timestamp: Date.now()
        })
      }
    }

    socket.onclose = (event) => {
      try {
        log('🔌 Socket closed:', { 
          code: event.code, 
          reason: event.reason,
          wasClean: event.wasClean
        })
        
        cleanup()
        
      } catch (error) {
        log('❌ Error in onclose handler:', error)
      }
    }

    socket.onerror = (error) => {
      try {
        log('❌ Socket error:', error)
        
      } catch (handlerError) {
        log('❌ Error in onerror handler:', handlerError)
      }
    }

    log('🎯 WebSocket setup complete, returning response')
    return response

  } catch (error) {
    console.error('❌ Critical WebSocket upgrade error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'WebSocket upgrade failed: ' + error.message,
        help: 'Please check Supabase Edge Function logs for more details'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})
