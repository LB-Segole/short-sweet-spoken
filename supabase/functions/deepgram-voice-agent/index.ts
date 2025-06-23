
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const url = new URL(req.url)
  
  // Handle WebSocket upgrade for voice agent
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    let currentAssistant: any = null
    let conversationHistory: Array<{role: string, content: string}> = []
    
    console.log('🎙️ Voice Agent WebSocket connection established')
    
    socket.onopen = () => {
      console.log('✅ WebSocket connection opened')
      socket.send(JSON.stringify({
        type: 'connection_established',
        message: 'Connected to voice agent'
      }))
    }
    
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('📨 Received message:', message.type)
        
        switch (message.type) {
          case 'auth':
            // Load assistant data
            const supabase = createClient(
              Deno.env.get('SUPABASE_URL')!,
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            )
            
            const { data: assistant, error } = await supabase
              .from('assistants')
              .select('*')
              .eq('id', message.assistantId || message.agentId)
              .single()
            
            if (error || !assistant) {
              console.error('❌ Failed to load assistant:', error)
              socket.send(JSON.stringify({
                type: 'error',
                data: { error: 'Assistant not found' }
              }))
              return
            }
            
            currentAssistant = assistant
            console.log('🤖 Assistant loaded:', assistant.name)
            
            socket.send(JSON.stringify({
              type: 'assistant_loaded',
              data: { assistant: currentAssistant }
            }))
            break
            
          case 'start_conversation':
            if (currentAssistant && currentAssistant.first_message) {
              console.log('🎬 Starting conversation with first message')
              
              // Add first message to conversation history
              conversationHistory.push({
                role: 'assistant',
                content: currentAssistant.first_message
              })
              
              // Send first message as AI response
              socket.send(JSON.stringify({
                type: 'ai_response',
                data: { text: currentAssistant.first_message }
              }))
              
              // Generate TTS for first message
              try {
                const ttsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                  },
                  body: JSON.stringify({
                    text: currentAssistant.first_message,
                    voice: currentAssistant.voice_id || 'aura-luna-en',
                    voice_provider: 'deepgram'
                  })
                })
                
                if (ttsResponse.ok) {
                  const ttsData = await ttsResponse.json()
                  socket.send(JSON.stringify({
                    type: 'audio_response',
                    data: { audio_base64: ttsData.audioContent }
                  }))
                }
              } catch (error) {
                console.error('❌ TTS Error:', error)
              }
            }
            
            socket.send(JSON.stringify({
              type: 'conversation_started',
              message: 'Conversation started successfully'
            }))
            break
            
          case 'audio_data':
            if (!currentAssistant) {
              socket.send(JSON.stringify({
                type: 'error',
                data: { error: 'No assistant loaded' }
              }))
              return
            }
            
            console.log('🎵 Processing audio data...')
            
            // Transcribe audio using Deepgram/Whisper
            try {
              const transcribeResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-audio`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  audio: message.audio
                })
              })
              
              if (!transcribeResponse.ok) {
                throw new Error(`Transcription failed: ${transcribeResponse.status}`)
              }
              
              const transcribeData = await transcribeResponse.json()
              const userText = transcribeData.text?.trim()
              
              if (!userText) {
                console.log('⚠️ No transcription received')
                return
              }
              
              console.log('📝 Transcribed:', userText)
              
              // Send transcript to client
              socket.send(JSON.stringify({
                type: 'transcript',
                data: { text: userText }
              }))
              
              // Add user message to conversation history
              conversationHistory.push({
                role: 'user',
                content: userText
              })
              
              // Get AI response using Hugging Face
              const chatResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/huggingface-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  assistantId: currentAssistant.id,
                  message: userText,
                  conversationHistory: conversationHistory
                })
              })
              
              if (!chatResponse.ok) {
                throw new Error(`Chat response failed: ${chatResponse.status}`)
              }
              
              const chatData = await chatResponse.json()
              const aiResponse = chatData.response
              
              if (!aiResponse) {
                throw new Error('No AI response received')
              }
              
              console.log('🤖 AI Response:', aiResponse)
              
              // Add AI response to conversation history
              conversationHistory.push({
                role: 'assistant',
                content: aiResponse
              })
              
              // Send AI response to client
              socket.send(JSON.stringify({
                type: 'ai_response',
                data: { text: aiResponse }
              }))
              
              // Generate TTS for AI response
              const ttsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  text: aiResponse,
                  voice: currentAssistant.voice_id || 'aura-luna-en',
                  voice_provider: 'deepgram'
                })
              })
              
              if (ttsResponse.ok) {
                const ttsData = await ttsResponse.json()
                socket.send(JSON.stringify({
                  type: 'audio_response',
                  data: { audio_base64: ttsData.audioContent }
                }))
              }
              
            } catch (error) {
              console.error('❌ Audio processing error:', error)
              socket.send(JSON.stringify({
                type: 'error',
                data: { error: `Processing failed: ${error.message}` }
              }))
            }
            break
            
          case 'text_input':
            // Handle direct text input (fallback)
            if (!currentAssistant) {
              socket.send(JSON.stringify({
                type: 'error',
                data: { error: 'No assistant loaded' }
              }))
              return
            }
            
            console.log('💬 Processing text input:', message.text)
            
            try {
              // Add user message to conversation history
              conversationHistory.push({
                role: 'user',
                content: message.text
              })
              
              // Get AI response using Hugging Face
              const chatResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/huggingface-chat`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  assistantId: currentAssistant.id,
                  message: message.text,
                  conversationHistory: conversationHistory
                })
              })
              
              if (chatResponse.ok) {
                const chatData = await chatResponse.json()
                const aiResponse = chatData.response
                
                if (aiResponse) {
                  // Add AI response to conversation history
                  conversationHistory.push({
                    role: 'assistant',
                    content: aiResponse
                  })
                  
                  socket.send(JSON.stringify({
                    type: 'ai_response',
                    data: { text: aiResponse }
                  }))
                }
              }
            } catch (error) {
              console.error('❌ Text processing error:', error)
              socket.send(JSON.stringify({
                type: 'error',
                data: { error: `Text processing failed: ${error.message}` }
              }))
            }
            break
            
          default:
            console.log('❓ Unknown message type:', message.type)
        }
        
      } catch (error) {
        console.error('❌ Message processing error:', error)
        socket.send(JSON.stringify({
          type: 'error',
          data: { error: 'Message processing failed' }
        }))
      }
    }
    
    socket.onclose = () => {
      console.log('🔌 WebSocket connection closed')
    }
    
    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }
    
    return response
  }
  
  // Handle regular HTTP requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  return new Response(
    JSON.stringify({ message: 'Voice Agent WebSocket endpoint' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
