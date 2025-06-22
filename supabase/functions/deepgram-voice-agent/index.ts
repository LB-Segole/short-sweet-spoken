import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 Deepgram Voice Agent WebSocket v1.0 - Multi-Agent Support');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId')
  const userId = url.searchParams.get('userId')

  console.log('🔗 [INIT] Voice Agent Connection Request:', { agentId, userId });

  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!deepgramApiKey) {
    console.error('❌ [CONFIG] Missing DEEPGRAM_API_KEY')
    return new Response('DeepGram API key not configured', { status: 500, headers: corsHeaders })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let voiceAgent: any = null
    let isAgentActive = false
    let deepgramSTT: WebSocket | null = null
    let deepgramTTS: WebSocket | null = null
    let conversationBuffer: Array<{ role: string; content: string }> = []
    let keepAliveInterval: number | null = null
    let sessionId: string | null = null

    const log = (msg: string, data?: any) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [${agentId}] ${msg}`, data || '')
    }

    // Load voice agent configuration
    const loadVoiceAgent = async () => {
      if (!agentId) {
        log('⚠️ [CONFIG] No agentId provided, using default config')
        voiceAgent = {
          name: 'Default Agent',
          system_prompt: 'You are a helpful AI assistant.',
          voice_model: 'aura-2-asteria-en',
          settings: {
            temperature: 0.8,
            max_tokens: 500,
            turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 1000 }
          }
        }
        return
      }

      try {
        log('🔍 [CONFIG] Loading voice agent configuration...', { agentId })
        const { data: agentData, error } = await supabaseClient
          .from('voice_agents')
          .select('*')
          .eq('id', agentId)
          .eq('is_active', true)
          .single()

        if (error || !agentData) {
          throw new Error(`Voice agent not found or inactive: ${agentId}`)
        }

        voiceAgent = agentData
        log('✅ [CONFIG] Voice agent loaded successfully', { 
          name: voiceAgent.name, 
          voice_model: voiceAgent.voice_model 
        })
      } catch (err) {
        log('❌ [CONFIG] Error loading voice agent', err)
        throw err
      }
    }

    // Initialize Deepgram STT
    const initializeSTT = () => {
      try {
        const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300&utterance_end_ms=1500&vad_events=true&punctuate=true'
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ [STT] Deepgram STT connected successfully')
        }

        deepgramSTT.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              const isFinal = data.is_final || false
              const speechFinal = data.speech_final || false
              
              if (transcript && (isFinal || speechFinal)) {
                log('🎯 [STT] Final transcript received:', transcript)
                
                // Send to client
                socket.send(JSON.stringify({
                  type: 'conversation.item.input_audio_transcription.completed',
                  transcript,
                  timestamp: Date.now()
                }))
                
                // Process with AI
                await processConversation(transcript)
              }
            }
          } catch (error) {
            log('❌ [STT] Error processing STT message:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          log('❌ [STT] Deepgram STT error:', error)
          setTimeout(initializeSTT, 2000)
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 [STT] Deepgram STT closed:', event.code)
          if (isAgentActive && event.code !== 1000) {
            setTimeout(initializeSTT, 2000)
          }
        }
      } catch (error) {
        log('❌ [STT] Error initializing STT:', error)
      }
    }

    // Initialize Deepgram TTS
    const initializeTTS = () => {
      try {
        const ttsUrl = `wss://api.deepgram.com/v1/speak?model=${voiceAgent.voice_model}&encoding=linear16&sample_rate=24000&container=none`
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          log('✅ [TTS] Deepgram TTS connected successfully')
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            try {
              const audioArray = new Uint8Array(event.data)
              const base64Audio = btoa(String.fromCharCode(...audioArray))
              
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'response.audio.delta',
                  delta: base64Audio,
                  timestamp: Date.now()
                }))
              }
            } catch (error) {
              log('❌ [TTS] Error processing TTS audio:', error)
            }
          }
        }

        deepgramTTS.onerror = (error) => {
          log('❌ [TTS] Deepgram TTS error:', error)
          setTimeout(initializeTTS, 2000)
        }

        deepgramTTS.onclose = (event) => {
          log('🔌 [TTS] Deepgram TTS closed:', event.code)
          if (isAgentActive && event.code !== 1000) {
            setTimeout(initializeTTS, 2000)
          }
        }
      } catch (error) {
        log('❌ [TTS] Error initializing TTS:', error)
      }
    }

    // Process conversation with AI
    const processConversation = async (transcript: string) => {
      try {
        log('🧠 [AI] Processing conversation:', transcript.substring(0, 100))
        
        conversationBuffer.push({ role: 'user', content: transcript })

        // Use OpenAI if available, otherwise use simple responses
        let response = ''
        if (openaiApiKey) {
          const messages = [
            { role: 'system', content: voiceAgent.system_prompt },
            ...conversationBuffer.slice(-10) // Keep last 10 messages
          ]

          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4.1-2025-04-14',
              messages,
              max_tokens: voiceAgent.settings.max_tokens || 500,
              temperature: voiceAgent.settings.temperature || 0.8,
            })
          })

          if (openaiResponse.ok) {
            const aiData = await openaiResponse.json()
            response = aiData.choices?.[0]?.message?.content?.trim() || ''
          }
        }

        if (!response) {
          // Fallback responses
          const fallbacks = [
            "I understand. Could you tell me more about that?",
            "That's interesting. What would you like to know?",
            "I'm here to help. How can I assist you further?",
            "Thanks for sharing that with me. What else can I help with?"
          ]
          response = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        log('🤖 [AI] Generated response:', response)
        
        conversationBuffer.push({ role: 'assistant', content: response })
        
        // Send transcript to client
        socket.send(JSON.stringify({
          type: 'response.audio_transcript.delta',
          delta: response,
          timestamp: Date.now()
        }))

        // Send to TTS
        if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
          deepgramTTS.send(JSON.stringify({
            type: 'Speak',
            text: response
          }))
        }

      } catch (error) {
        log('❌ [AI] Error processing conversation:', error)
        
        // Send error response
        const errorResponse = "I'm having trouble processing that. Could you try again?"
        if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
          deepgramTTS.send(JSON.stringify({
            type: 'Speak',
            text: errorResponse
          }))
        }
      }
    }

    // Start keepalive
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(() => {
        try {
          if (deepgramSTT?.readyState === WebSocket.OPEN) {
            deepgramSTT.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          if (deepgramTTS?.readyState === WebSocket.OPEN) {
            deepgramTTS.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          log('💓 [KEEPALIVE] Sent to Deepgram connections')
        } catch (error) {
          log('❌ [KEEPALIVE] Error:', error)
        }
      }, 5000) as unknown as number
    }

    // Cleanup function
    const cleanup = () => {
      isAgentActive = false
      
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }
      
      if (deepgramSTT) {
        deepgramSTT.close()
        deepgramSTT = null
      }
      if (deepgramTTS) {
        deepgramTTS.close()
        deepgramTTS = null
      }
      log('🧹 [CLEANUP] All connections cleaned up')
    }

    // WebSocket event handlers
    socket.onopen = async () => {
      log('📡 [SOCKET] Client connected')
      isAgentActive = true
      
      try {
        await loadVoiceAgent()
        
        // Send session created event
        socket.send(JSON.stringify({
          type: 'session.created',
          session: {
            id: crypto.randomUUID(),
            agent: {
              id: voiceAgent.id || 'default',
              name: voiceAgent.name,
              voice_model: voiceAgent.voice_model
            }
          },
          timestamp: Date.now()
        }))
        
      } catch (error) {
        log('❌ [INIT] Error during initialization:', error)
        socket.close(1008, 'Agent initialization failed')
      }
    }

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        log('📨 [SOCKET] Received message:', { type: msg.type })
        
        switch (msg.type) {
          case 'session.update':
            log('🔧 [CONFIG] Session update received')
            
            // Initialize Deepgram connections
            initializeSTT()
            initializeTTS()
            startKeepAlive()
            
            // Send confirmation
            socket.send(JSON.stringify({
              type: 'session.updated',
              session: msg.session,
              timestamp: Date.now()
            }))
            break
            
          case 'input_audio_buffer.append':
            if (deepgramSTT?.readyState === WebSocket.OPEN && msg.audio) {
              try {
                const binaryAudio = Uint8Array.from(atob(msg.audio), c => c.charCodeAt(0))
                deepgramSTT.send(binaryAudio)
              } catch (error) {
                log('❌ [AUDIO] Error processing audio:', error)
              }
            }
            break
            
          case 'conversation.item.create':
            if (msg.item?.content?.[0]?.text) {
              await processConversation(msg.item.content[0].text)
            }
            break
            
          case 'response.create':
            log('📝 [RESPONSE] Response creation requested')
            break
            
          default:
            log(`❓ [SOCKET] Unknown message type: ${msg.type}`)
        }
      } catch (err) {
        log('❌ [SOCKET] Error processing message:', err)
      }
    }

    socket.onclose = (ev) => {
      log('🔌 [SOCKET] Client disconnected:', { code: ev.code, reason: ev.reason })
      cleanup()
    }

    socket.onerror = (err) => {
      log('❌ [SOCKET] WebSocket error:', err)
      cleanup()
    }

    return response
  } catch (error) {
    console.error('❌ [CRITICAL] Fatal error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
