
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🎙️ Voice WebSocket Function initialized')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  const url = new URL(req.url)
  console.log(`🔄 Voice WebSocket request: ${req.method} ${url.pathname}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get('upgrade') || ''
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { 
      status: 400,
      headers: corsHeaders
    })
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req)
    
    // Parse query parameters
    const callId = url.searchParams.get('callId')
    const assistantId = url.searchParams.get('assistantId')
    const userId = url.searchParams.get('userId')
    
    console.log(`🎯 WebSocket connection params:`, { callId, assistantId, userId })

    if (!callId || !assistantId) {
      console.log('❌ Missing required parameters')
      socket.close(1008, 'Missing callId or assistantId')
      return response
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // WebSocket event handlers
    socket.onopen = () => {
      console.log(`✅ Voice WebSocket connected for call: ${callId}`)
      
      // Send connection confirmation
      socket.send(JSON.stringify({
        type: 'connection_established',
        callId,
        assistantId,
        timestamp: new Date().toISOString()
      }))
    }

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log(`📨 Received message type: ${data.event || data.type}`)

        switch (data.event || data.type) {
          case 'connected':
            console.log('🔗 Client connected')
            break

          case 'media':
            // Handle audio data from SignalWire
            if (data.media?.payload) {
              console.log('🎵 Received audio data')
              // Process audio data here
              // This would typically go to speech-to-text service
            }
            break

          case 'text_input':
            // Handle text input for processing
            if (data.text) {
              console.log(`💬 Text input: ${data.text}`)
              
              // Generate AI response (simplified)
              const response = await generateSimpleResponse(data.text)
              
              // Send response back
              socket.send(JSON.stringify({
                type: 'text_response',
                text: response.text,
                shouldEndCall: response.shouldEndCall,
                timestamp: new Date().toISOString()
              }))

              // Log conversation
              await supabase.from('call_logs').insert({
                call_id: callId,
                speaker: 'user',
                message: data.text,
                timestamp: new Date().toISOString()
              })

              await supabase.from('call_logs').insert({
                call_id: callId,
                speaker: 'assistant',
                message: response.text,
                timestamp: new Date().toISOString()
              })
            }
            break

          case 'request_greeting':
            console.log('👋 Greeting requested')
            socket.send(JSON.stringify({
              type: 'greeting_sent',
              text: 'Hello! How can I help you today?',
              timestamp: new Date().toISOString()
            }))
            break

          case 'ping':
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }))
            break

          default:
            console.log(`❓ Unknown message type: ${data.event || data.type}`)
        }
      } catch (error) {
        console.error('❌ Error processing message:', error)
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: new Date().toISOString()
        }))
      }
    }

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }

    socket.onclose = (event) => {
      console.log(`🔌 WebSocket closed: ${event.code} ${event.reason}`)
    }

    return response

  } catch (error) {
    console.error('💥 Voice WebSocket error:', error)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: corsHeaders
    })
  }
})

// Simple AI response generator
async function generateSimpleResponse(text: string) {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('goodbye') || lowerText.includes('bye')) {
    return {
      text: "Thank you for calling. Have a great day!",
      shouldEndCall: true
    }
  }
  
  if (lowerText.includes('hello') || lowerText.includes('hi')) {
    return {
      text: "Hello! Thank you for calling. How can I assist you today?",
      shouldEndCall: false
    }
  }
  
  if (lowerText.includes('transfer') || lowerText.includes('human')) {
    return {
      text: "I'll connect you with a human representative right away.",
      shouldEndCall: false,
      transfer: true
    }
  }
  
  return {
    text: "I understand. Can you tell me more about how I can help you?",
    shouldEndCall: false
  }
}
