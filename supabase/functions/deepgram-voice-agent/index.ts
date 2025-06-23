import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🎙️ Deepgram Voice Agent WebSocket v9.0 - Production Stable')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  console.log('🚀 deepgram-voice-agent function invoked', {
    method: req.method,
    url: req.url,
    upgradeHeader: req.headers.get('upgrade'),
    connectionHeader: req.headers.get('connection'),
    userAgent: req.headers.get('user-agent'),
    origin: req.headers.get('origin'),
  })

  // Handle CORS preflight requests ONLY
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  // Check for WebSocket upgrade - CRITICAL: No CORS headers on WebSocket responses
  const upgradeHeader = req.headers.get('upgrade')
  const connectionHeader = req.headers.get('connection')
  
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request', { upgradeHeader, connectionHeader })
    // Return 426 with proper upgrade headers but NO CORS headers
    return new Response('Expected WebSocket connection - use wss:// protocol', {
      status: 426,
      headers: { 
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
        'Sec-WebSocket-Version': '13'
      },
    })
  }

  // Check required environment variables
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  console.log('🔑 Environment check:', {
    deepgramKeyPresent: !!deepgramApiKey,
    openaiKeyPresent: !!openaiApiKey,
  })
  
  if (!deepgramApiKey) {
    console.error('❌ Missing DEEPGRAM_API_KEY')
    return new Response('DEEPGRAM_API_KEY not configured', { status: 500, headers: corsHeaders })
  }
  
  if (!openaiApiKey) {
    console.error('❌ Missing OPENAI_API_KEY')
    return new Response('OPENAI_API_KEY not configured', { status: 500, headers: corsHeaders })
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...')
    
    // Perform WebSocket upgrade
    const { socket, response } = Deno.upgradeWebSocket(req, {
      protocol: req.headers.get('sec-websocket-protocol') || undefined,
    })
    
    console.log('✅ WebSocket upgrade successful - connection established')

    // Connection state management
    let isConnectionAlive = true
    let deepgramSTT: WebSocket | null = null
    let deepgramTTS: WebSocket | null = null
    let assistant: any = null
    let conversationHistory: Array<{ role: string; content: string }> = []
    let assistantId = 'demo'
    let userId = 'demo-user'
    let firstMessageSent = false
    let keepAliveInterval: number | null = null
    let connectionEstablished = false

    // Enhanced logging function
    const log = (msg: string, data?: any) => {
      const timestamp = new Date().toISOString()
      const logMsg = `[${timestamp}] [${assistantId}] ${msg}`
      console.log(logMsg, data ? JSON.stringify(data) : '')
    }

    // Safe message sending with connection checks
    const sendToClient = (message: any) => {
      if (!isConnectionAlive) {
        log('⚠️ Skipping message send - connection not alive')
        return false
      }
      
      if (socket.readyState === WebSocket.OPEN) {
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
      } else {
        log('⚠️ Cannot send - socket not open', { readyState: socket.readyState })
        return false
      }
    }

    // Initialize Deepgram STT connection with enhanced error handling
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
                  await processTranscript(transcript)
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
            model: assistant?.model || 'gpt-4.1-2025-04-14',
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

    // Send text to TTS with enhanced error handling
    const sendTTSMessage = async (text: string) => {
      if (!isConnectionAlive || !deepgramTTS) return
      
      try {
        if (deepgramTTS.readyState === WebSocket.OPEN) {
          log('🔊 Converting text to speech:', text.substring(0, 100))
          
          // Clear any pending audio
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
            model: 'gpt-4.1-2025-04-14',
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

    // Start keepalive ping system
    const startKeepAlive = () => {
      if (keepAliveInterval) return
      
      keepAliveInterval = setInterval(() => {
        if (isConnectionAlive && socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ 
              type: 'ping', 
              timestamp: Date.now(),
              status: 'keepalive'
            }))
            log('💓 Sent keepalive ping')
          } catch (error) {
            log('❌ Keepalive ping failed:', error)
            isConnectionAlive = false
          }
        } else {
          log('💔 Keepalive stopped - connection not alive')
          clearInterval(keepAliveInterval!)
          keepAliveInterval = null
        }
      }, 15000) // Ping every 15 seconds
    }

    // Cleanup function
    const cleanup = () => {
      log('🧹 Starting cleanup process...')
      isConnectionAlive = false
      
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
        log('✅ Keepalive interval cleared')
      }
      
      if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN) {
        deepgramSTT.close()
        log('✅ Deepgram STT connection closed')
      }
      
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
        deepgramTTS.close()
        log('✅ Deepgram TTS connection closed')
      }
      
      log('✅ Cleanup completed')
    }

    // Client WebSocket event handlers
    socket.onopen = async () => {
      log('🔌 Client WebSocket connection opened successfully')
      isConnectionAlive = true
      connectionEstablished = true
      
      sendToClient({
        type: 'connection_ready',
        status: 'WebSocket connection established - ready for commands',
        timestamp: Date.now()
      })
      
      // Start keepalive system
      startKeepAlive()
      log('💓 Keepalive system started')
    }

    socket.onmessage = async (event) => {
      if (!isConnectionAlive) return
      
      try {
        const message = JSON.parse(event.data)
        log('📨 Received from client:', { event: message.event || message.type, size: event.data.length })

        // Handle pong responses
        if (message.type === 'pong') {
          log('💓 Received pong from client')
          return
        }

        switch (message.event || message.type) {
          case 'connected':
            assistantId = message.assistantId || 'demo'
            userId = message.userId || 'demo-user'
            
            log('🔐 Client connected with assistant:', assistantId)
            
            await loadAssistant(assistantId)
            await connectSTT()
            await connectTTS()
            
            setTimeout(() => {
              if (isConnectionAlive) {
                sendToClient({
                  type: 'ready',
                  status: 'Ready to chat',
                  assistant: assistant?.name,
                  timestamp: Date.now()
                })
              }
            }, 1000)
            break

          case 'media':
            if (deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN && message.media?.payload) {
              try {
                const audioBuffer = Uint8Array.from(atob(message.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(audioBuffer)
                log('🎵 Audio forwarded to STT', { size: audioBuffer.length })
              } catch (error) {
                log('❌ Error forwarding audio to STT:', error)
              }
            } else {
              log('⚠️ Cannot forward audio - STT not ready')
            }
            break

          case 'text_input':
            if (message.text) {
              log('📝 Processing text input:', message.text.substring(0, 50))
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
            log('❓ Unknown message event:', message.event || message.type)
        }

      } catch (error) {
        log('❌ Error processing client message:', error)
      }
    }

    socket.onclose = (event) => {
      log('🔌 Client WebSocket closed:', { 
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean,
        connectionEstablished 
      })
      
      cleanup()
    }

    socket.onerror = (error) => {
      log('❌ Client WebSocket error:', error)
      cleanup()
    }

    // Return the WebSocket response immediately to complete the upgrade
    return response

  } catch (error) {
    console.error('❌ Critical WebSocket upgrade error:', error)
    return new Response('WebSocket upgrade failed: ' + error.message, { 
      status: 500,
      headers: corsHeaders 
    })
  }
})
