// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice Agent - WebSocket Handler v2.0');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  console.log(`📡 Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Check for WebSocket upgrade
  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    console.log('❌ Not a WebSocket request');
    return new Response('WebSocket upgrade required', {
      status: 426,
      headers: { ...corsHeaders, 'Upgrade': 'websocket', 'Connection': 'Upgrade' },
    })
  }

  // Verify authentication
  const authHeader = req.headers.get('authorization') || new URL(req.url).searchParams.get('authorization');
  if (!authHeader) {
    console.error('❌ No authorization header');
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  try {
    // Create Supabase client for auth verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract token from header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    console.log('✅ User authenticated:', user.id);

  } catch (authError) {
    console.error('❌ Authentication error:', authError);
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  // Verify environment variables early
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  
  console.log('🔍 Environment check:', {
    hasDeepgram: !!deepgramApiKey,
    hasOpenAI: !!openaiApiKey
  });

  if (!deepgramApiKey || !openaiApiKey) {
    console.error('❌ Missing required API keys');
    return new Response(JSON.stringify({ 
      error: 'Server configuration error',
      details: 'Required API keys not configured'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    console.log('🔄 Attempting WebSocket upgrade...');
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    let isActive = true;
    let deepgramSTT: WebSocket | null = null;
    let deepgramTTS: WebSocket | null = null;
    let keepAliveInterval: number | null = null;

    // Initialize Deepgram STT connection
    const initSTT = () => {
      try {
        console.log('🎤 Initializing Deepgram STT...');
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
          console.error('❌ STT connection error:', error)
        }

        deepgramSTT.onclose = () => {
          console.log('🔌 STT connection closed')
          if (isActive) {
            setTimeout(initSTT, 2000)
          }
        }
      } catch (error) {
        console.error('❌ STT initialization error:', error)
      }
    }

    // Initialize Deepgram TTS connection
    const initTTS = () => {
      try {
        console.log('🔊 Initializing Deepgram TTS...');
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
          console.error('❌ TTS connection error:', error)
        }

        deepgramTTS.onclose = () => {
          console.log('🔌 TTS connection closed')
          if (isActive) {
            setTimeout(initTTS, 2000)
          }
        }
      } catch (error) {
        console.error('❌ TTS initialization error:', error)
      }
    }

    // Generate AI response
    const generateResponse = async (text: string): Promise<string> => {
      try {
        console.log('🧠 Generating AI response for:', text.substring(0, 50));
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
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
        const aiResponse = data.choices?.[0]?.message?.content || 'I understand. How can I help you?'
        console.log('✅ AI response generated:', aiResponse.substring(0, 50));
        return aiResponse
      } catch (error) {
        console.error('❌ AI response error:', error)
        return 'I apologize, but I encountered an issue. Could you please try again?'
      }
    }

    // Send text to TTS
    const sendTTS = (text: string) => {
      if (deepgramTTS?.readyState === WebSocket.OPEN && text.trim()) {
        console.log('📤 Sending to TTS:', text.substring(0, 50));
        deepgramTTS.send(JSON.stringify({
          type: 'Speak',
          text: text.trim()
        }))
      }
    }

    // Start keepalive ping
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        }
      }, 30000) as unknown as number
    }

    // WebSocket event handlers
    socket.onopen = () => {
      console.log('🔌 Client WebSocket connected');
      isActive = true
      
      // Initialize Deepgram connections
      initSTT()
      initTTS()
      
      // Start keepalive
      startKeepAlive()
      
      // Send ready message
      socket.send(JSON.stringify({
        type: 'connection_ready',
        message: 'Voice assistant ready',
        timestamp: Date.now()
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📨 Received message type:', data.type || data.event)

        switch (data.type || data.event) {
          case 'start':
            console.log('🚀 Session start requested');
            socket.send(JSON.stringify({
              type: 'ack',
              message: 'Session started successfully',
              timestamp: Date.now()
            }))
            break

          case 'media':
            if (data.media?.payload && deepgramSTT?.readyState === WebSocket.OPEN) {
              try {
                const audioData = Uint8Array.from(atob(data.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(audioData)
              } catch (error) {
                console.error('❌ Audio processing error:', error)
              }
            }
            break

          case 'text_input':
            if (data.text?.trim()) {
              console.log('💬 Processing text input:', data.text);
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
            console.log(`❓ Unknown message type: ${data.type || data.event}`)
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

    socket.onclose = (event) => {
      console.log('🔌 Client WebSocket closed:', event.code, event.reason);
      isActive = false
      
      // Clean up
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

    console.log('✅ WebSocket upgrade successful');
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
