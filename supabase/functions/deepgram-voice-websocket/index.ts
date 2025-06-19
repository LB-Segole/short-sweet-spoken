
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice WebSocket initialized');

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
  const callId = url.searchParams.get('callId') || 'browser-test'
  const assistantId = url.searchParams.get('assistantId') || 'demo'
  const userId = url.searchParams.get('userId')

  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket connection', {
      status: 426,
      headers: { ...corsHeaders, Upgrade: 'websocket', Connection: 'Upgrade' },
    })
  }

  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')
  if (!deepgramApiKey) {
    return new Response('DeepGram API key not configured', { status: 500, headers: corsHeaders })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let assistant: any = null
    let isCallActive = false
    let deepgramSTT: WebSocket | null = null
    let deepgramTTS: WebSocket | null = null
    let signalWireStreamSid: string | null = null

    const log = (msg: string, data?: any) => 
      console.log(`[${new Date().toISOString()}] [Call: ${callId}] ${msg}`, data || '')

    // Load assistant configuration
    if (assistantId !== 'demo' && userId) {
      try {
        const { data: assistantData } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('id', assistantId)
          .eq('user_id', userId)
          .single()
        if (assistantData) {
          assistant = assistantData
          log('✅ Assistant loaded', { name: assistant.name })
        }
      } catch (err) {
        log('⚠️ Error fetching assistant, using default', err)
      }
    }

    if (!assistant) {
      assistant = {
        name: 'DeepGram Assistant',
        first_message: 'Hello! This is your AI assistant powered by DeepGram. How can I help you today?',
        system_prompt: 'You are a helpful AI assistant. Be friendly, professional, and concise.'
      }
    }

    // Initialize DeepGram STT
    const initializeSTT = () => {
      const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300'
      deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

      deepgramSTT.onopen = () => {
        log('✅ DeepGram STT connected')
      }

      deepgramSTT.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
            const transcript = data.channel.alternatives[0].transcript
            const isFinal = data.is_final || false
            
            if (transcript.trim()) {
              log('📝 STT transcript:', { transcript, isFinal })
              
              socket.send(JSON.stringify({
                type: 'transcript',
                text: transcript,
                confidence: data.channel.alternatives[0].confidence || 1.0,
                isFinal,
                timestamp: Date.now()
              }))

              if (isFinal) {
                processConversation(transcript)
              }
            }
          }
        } catch (error) {
          log('❌ Error processing STT message:', error)
        }
      }

      deepgramSTT.onerror = (error) => {
        log('❌ DeepGram STT error:', error)
      }

      deepgramSTT.onclose = () => {
        log('🔌 DeepGram STT closed')
      }
    }

    // Initialize DeepGram TTS
    const initializeTTS = () => {
      const ttsUrl = 'wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=8000'
      deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

      deepgramTTS.onopen = () => {
        log('✅ DeepGram TTS connected')
        // Send initial greeting
        if (assistant.first_message) {
          sendTTSMessage(assistant.first_message)
        }
      }

      deepgramTTS.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Convert audio to base64 and send to SignalWire
          const audioArray = new Uint8Array(event.data)
          const base64Audio = btoa(String.fromCharCode(...audioArray))
          
          if (signalWireStreamSid && socket.readyState === WebSocket.OPEN) {
            const mediaMessage = {
              event: 'media',
              streamSid: signalWireStreamSid,
              media: {
                payload: base64Audio
              }
            }
            socket.send(JSON.stringify(mediaMessage))
            log('🔊 Audio sent to SignalWire')
          }
        }
      }

      deepgramTTS.onerror = (error) => {
        log('❌ DeepGram TTS error:', error)
      }

      deepgramTTS.onclose = () => {
        log('🔌 DeepGram TTS closed')
      }
    }

    const sendTTSMessage = (text: string) => {
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN && text.trim()) {
        const message = {
          type: 'Speak',
          text: text.trim()
        }
        deepgramTTS.send(JSON.stringify(message))
        log('📤 TTS message sent:', text)
      }
    }

    const processConversation = (transcript: string) => {
      // Simple echo response - replace with your conversation logic
      const response = `I heard you say: "${transcript}". That's interesting! What else would you like to discuss?`
      
      log('🧠 Processing conversation:', { input: transcript, response })
      
      socket.send(JSON.stringify({
        type: 'ai_response',
        text: response,
        timestamp: Date.now()
      }))

      sendTTSMessage(response)
    }

    const cleanup = () => {
      isCallActive = false
      if (deepgramSTT) {
        deepgramSTT.close()
        deepgramSTT = null
      }
      if (deepgramTTS) {
        deepgramTTS.close()
        deepgramTTS = null
      }
    }

    // WebSocket event handlers
    socket.onopen = () => {
      log('🔌 SignalWire WebSocket connected')
      isCallActive = true
      
      // Initialize DeepGram connections
      initializeSTT()
      initializeTTS()
      
      socket.send(JSON.stringify({
        type: 'connection_established',
        callId,
        assistantId,
        assistant: { name: assistant.name },
        timestamp: Date.now(),
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        switch (msg.event || msg.type) {
          case 'connected':
            log('📡 SignalWire stream connected')
            break
            
          case 'start':
            signalWireStreamSid = msg.streamSid
            log('🎙️ SignalWire stream started:', msg.streamSid)
            break
            
          case 'media':
            if (isCallActive && msg.media?.payload && deepgramSTT?.readyState === WebSocket.OPEN) {
              // Convert base64 audio to binary and send to DeepGram STT
              const binaryAudio = Uint8Array.from(atob(msg.media.payload), c => c.charCodeAt(0))
              deepgramSTT.send(binaryAudio)
            }
            break
            
          case 'stop':
            log('🛑 SignalWire stream stopped')
            isCallActive = false
            signalWireStreamSid = null
            break
            
          case 'text_input':
            if (msg.text?.trim()) {
              processConversation(msg.text)
            }
            break
            
          default:
            log('❓ Unknown SignalWire event:', msg)
        }
      } catch (err) {
        log('❌ Error processing SignalWire message:', err)
      }
    }

    socket.onclose = (ev) => {
      log('🔌 SignalWire WebSocket closed:', ev)
      cleanup()
    }

    socket.onerror = (err) => {
      log('❌ SignalWire WebSocket error:', err)
      cleanup()
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
