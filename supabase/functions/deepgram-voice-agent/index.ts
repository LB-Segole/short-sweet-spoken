// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice Agent - Enhanced Connection Handler v1.0');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  console.log(`📡 Request received: ${req.method} ${req.url}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket upgrade request');
    return new Response('Expected WebSocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  // Check API keys early
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  if (!deepgramApiKey) {
    console.error('❌ Missing DEEPGRAM_API_KEY');
    return new Response(JSON.stringify({ 
      error: 'Required API keys not configured',
      details: 'DEEPGRAM_API_KEY is missing'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  
  if (!openaiApiKey) {
    console.error('❌ Missing OPENAI_API_KEY');
    return new Response(JSON.stringify({ 
      error: 'Required API keys not configured',
      details: 'OPENAI_API_KEY is missing'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  console.log('✅ API keys verified, proceeding with WebSocket upgrade');

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log('🔌 WebSocket upgraded successfully');
    
    let isActive = true;
    let deepgramSTT: WebSocket | null = null;
    let deepgramTTS: WebSocket | null = null;
    let keepAliveInterval: number | null = null;

    // Initialize Deepgram STT
    const initSTT = () => {
      try {
        const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true'
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          console.log('✅ Deepgram STT connected');
        }

        deepgramSTT.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              if (transcript && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'transcript',
                  text: transcript,
                  confidence: data.channel.alternatives[0].confidence || 1.0,
                  isFinal: data.is_final || false,
                  timestamp: Date.now()
                }))
              }
            }
          } catch (error) {
            console.error('❌ STT message error:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          console.error('❌ STT error:', error)
        }

        deepgramSTT.onclose = () => {
          console.log('🔌 STT closed')
          if (isActive) setTimeout(initSTT, 2000)
        }
      } catch (error) {
        console.error('❌ STT init error:', error)
      }
    }

    // Initialize Deepgram TTS
    const initTTS = () => {
      try {
        const ttsUrl = 'wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=24000'
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          console.log('✅ Deepgram TTS connected');
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer && socket.readyState === WebSocket.OPEN) {
            const audioArray = new Uint8Array(event.data)
            const base64Audio = btoa(String.fromCharCode(...audioArray))
            socket.send(JSON.stringify({
              type: 'audio_response',
              audio: base64Audio,
              timestamp: Date.now()
            }))
          }
        }

        deepgramTTS.onerror = (error) => {
          console.error('❌ TTS error:', error)
        }

        deepgramTTS.onclose = () => {
          console.log('🔌 TTS closed')
          if (isActive) setTimeout(initTTS, 2000)
        }
      } catch (error) {
        console.error('❌ TTS init error:', error)
      }
    }

    // Generate AI response
    const generateResponse = async (text: string): Promise<string> => {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful AI assistant. Keep responses conversational and concise.' },
              { role: 'user', content: text }
            ],
            max_tokens: 150,
            temperature: 0.7,
          })
        })

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        return data.choices?.[0]?.message?.content || 'I understand. How can I help you?'
      } catch (error) {
        console.error('❌ AI response error:', error)
        return 'I apologize, but I encountered an issue. Could you please try again?'
      }
    }

    // Send TTS message
    const sendTTS = (text: string) => {
      if (deepgramTTS?.readyState === WebSocket.OPEN && text.trim()) {
        deepgramTTS.send(JSON.stringify({
          type: 'Speak',
          text: text.trim()
        }))
        console.log('📤 TTS message sent:', text.substring(0, 50))
      }
    }

    // Start keepalive
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
      }, 30000) as unknown as number
    }

    // WebSocket handlers
    socket.onopen = () => {
      console.log('🔌 Client WebSocket opened');
      initSTT();
      initTTS();
      startKeepAlive();
      
      socket.send(JSON.stringify({
        type: 'connection_ready',
        message: 'Voice assistant ready',
        timestamp: Date.now()
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 Received:', data.type || data.event)

        switch (data.type || data.event) {
          case 'start':
            socket.send(JSON.stringify({
              type: 'ack',
              message: 'Session started successfully',
              timestamp: Date.now()
            }))
            break

          case 'media':
            if (data.media?.payload && deepgramSTT?.readyState === WebSocket.OPEN) {
              const audioData = Uint8Array.from(atob(data.media.payload), c => c.charCodeAt(0))
              deepgramSTT.send(audioData)
            }
            break

          case 'text_input':
            if (data.text?.trim()) {
              const aiResponse = await generateResponse(data.text)
              socket.send(JSON.stringify({
                type: 'ai_response',
                text: aiResponse,
                timestamp: Date.now()
              }))
              sendTTS(aiResponse)
            }
            break

          case 'ping':
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }))
            break

          default:
            console.log(`❓ Unknown message: ${data.type || data.event}`)
        }
      } catch (error) {
        console.error('❌ Message processing error:', error)
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Message processing failed',
          timestamp: Date.now()
        }))
      }
    }

    socket.onclose = () => {
      console.log('🔌 Client WebSocket closed');
      isActive = false
      
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
      }
      if (deepgramSTT) {
        deepgramSTT.close()
      }
      if (deepgramTTS) {
        deepgramTTS.close()
      }
    }

    socket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error)
    }

    return response

  } catch (error) {
    console.error('❌ WebSocket upgrade failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'WebSocket upgrade failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
