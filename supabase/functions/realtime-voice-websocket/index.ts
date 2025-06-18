import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  console.log('🚀 realtime-voice-websocket function invoked', {
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
  const userId = url.searchParams.get('userId') || 'demo-user'

  console.log('📋 WebSocket parameters extracted:', { callId, assistantId, userId })

  // Verify WebSocket upgrade headers
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request')
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    console.error('❌ Missing OpenAI API key')
    return new Response('Server configuration error', { status: 500, headers: corsHeaders })
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('✅ WebSocket upgrade successful')

    let openaiWs: WebSocket | null = null
    let isConnected = false
    let sessionId: string | null = null

    const log = (msg: string, data?: any) => console.log(`[${new Date().toISOString()}] [Call: ${callId}] ${msg}`, data || '')

    // Initialize OpenAI Realtime WebSocket connection
    const connectToOpenAI = async () => {
      try {
        log('🔗 Connecting to OpenAI Realtime API...')
        openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        })

        openaiWs.onopen = () => {
          log('✅ Connected to OpenAI Realtime API')
          isConnected = true

          // Send session configuration immediately
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['audio', 'text'],
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              instructions: 'You are LavaBall, a friendly voice assistant. Be helpful, concise, and engaging. Keep responses under 2 sentences unless more detail is specifically requested.',
              voice: 'alloy',
              input_audio_transcription: {
                enabled: true,
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              temperature: 0.7,
              max_response_output_tokens: 150
            }
          }

          openaiWs?.send(JSON.stringify(sessionConfig))
          log('📤 Session configuration sent to OpenAI')

          // Send initial greeting message
          setTimeout(() => {
            const greetingMessage = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'assistant',
                content: [
                  {
                    type: 'input_text',
                    text: 'Hello! This is LavaBall, your friendly voice assistant. How can I help you today?'
                  }
                ]
              }
            }
            openaiWs?.send(JSON.stringify(greetingMessage))
            
            // Trigger response generation
            openaiWs?.send(JSON.stringify({ type: 'response.create' }))
            log('👋 Initial greeting sent')
          }, 100)

          // Notify client of successful connection
          socket.send(JSON.stringify({
            type: 'connection_established',
            data: {
              sessionId,
              status: 'connected',
              assistant: 'LavaBall'
            },
            timestamp: Date.now()
          }))
        }

        openaiWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            log('📨 Received from OpenAI:', { type: data.type })

            // Handle session creation
            if (data.type === 'session.created') {
              sessionId = data.session?.id || 'unknown'
              log('🆔 Session created:', sessionId)
            }

            // Forward all OpenAI messages to client
            socket.send(JSON.stringify({
              type: data.type,
              data: data,
              timestamp: Date.now()
            }))

            // Special handling for audio deltas
            if (data.type === 'response.audio.delta') {
              log('🎵 Audio delta forwarded', { deltaLength: data.delta?.length })
            }

            // Log transcript events
            if (data.type === 'conversation.item.input_audio_transcription.completed') {
              log('📝 User transcript:', data.transcript)
            }

          } catch (error) {
            log('❌ Error processing OpenAI message:', error)
          }
        }

        openaiWs.onerror = (error) => {
          log('❌ OpenAI WebSocket error:', error)
          socket.send(JSON.stringify({
            type: 'error',
            data: { message: 'OpenAI connection error' },
            timestamp: Date.now()
          }))
        }

        openaiWs.onclose = (event) => {
          log('🔌 OpenAI WebSocket closed:', { code: event.code, reason: event.reason })
          isConnected = false
        }

      } catch (error) {
        log('❌ Failed to connect to OpenAI:', error)
        socket.send(JSON.stringify({
          type: 'error',
          data: { message: 'Failed to connect to OpenAI Realtime API' },
          timestamp: Date.now()
        }))
      }
    }

    // Client WebSocket handlers
    socket.onopen = () => {
      log('🔌 Client WebSocket connected')
      connectToOpenAI()
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        log('📨 Received from client:', { type: message.type || message.event })

        // Forward client messages to OpenAI
        if (openaiWs && isConnected) {
          if (message.type === 'input_audio_buffer.append') {
            // Forward audio data to OpenAI
            openaiWs.send(JSON.stringify(message))
            log('🎤 Audio forwarded to OpenAI', { audioLength: message.audio?.length })
          } else if (message.type === 'conversation.item.create') {
            // Forward text messages
            openaiWs.send(JSON.stringify(message))
            openaiWs.send(JSON.stringify({ type: 'response.create' }))
            log('💬 Text message forwarded to OpenAI')
          } else if (message.type === 'ping') {
            // Handle ping/pong
            socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
          } else {
            // Forward other events
            openaiWs.send(JSON.stringify(message))
          }
        } else {
          log('⚠️ OpenAI not connected, queuing message')
        }

      } catch (error) {
        log('❌ Error processing client message:', error)
      }
    }

    socket.onclose = (event) => {
      log('🔌 Client WebSocket closed:', { code: event.code, reason: event.reason })
      if (openaiWs) {
        openaiWs.close()
      }
    }

    socket.onerror = (error) => {
      log('❌ Client WebSocket error:', error)
    }

    // Keep connection alive
    const pingInterval = setInterval(() => {
      if (openaiWs && isConnected) {
        openaiWs.send(JSON.stringify({ type: 'ping' }))
      }
    }, 15000)

    // Cleanup on close
    socket.addEventListener('close', () => {
      clearInterval(pingInterval)
      if (openaiWs) {
        openaiWs.close()
      }
    })

    return response

  } catch (error) {
    console.error('❌ Critical error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
