// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('Deepgram Voice Agent - Starting with AI processing...');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
};

// Health check endpoint
const handleHealthCheck = () => {
  console.log('Health check requested')
  return new Response(
    JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'deepgram-voice-agent',
      version: '2.0.0',
      features: ['deepgram-stt', 'deepgram-tts', 'huggingface-ai']
    }),
    { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  )
};

// Deepgram STT Service
class DeepgramSTTService {
  private apiKey: string
  private wsUrl: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
    this.wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true'
  }

  async createConnection(): Promise<WebSocket> {
    const ws = new WebSocket(this.wsUrl, ['token', this.apiKey])
    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        console.log('Deepgram STT connected')
        resolve(ws)
      }
      ws.onerror = (error) => {
        console.error('Deepgram STT error:', error)
        reject(error)
      }
      setTimeout(() => reject(new Error('STT connection timeout')), 10000)
    })
  }
}

// Deepgram TTS Service
class DeepgramTTSService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async synthesizeSpeech(text: string): Promise<ArrayBuffer> {
    try {
      console.log('Synthesizing speech:', text.substring(0, 50) + '...')
      
      const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('TTS error:', error)
      throw error
    }
  }
}

// HuggingFace AI Service
class HuggingFaceAIService {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateResponse(userInput: string, conversationHistory: Array<{role: string, content: string}>): Promise<string> {
    try {
      console.log('Generating AI response for:', userInput.substring(0, 50) + '...')
      
      const messages = [
        { 
          role: 'system', 
          content: 'You are a helpful voice assistant. Keep responses conversational, concise, and under 2 sentences for voice interaction. Be friendly and natural.' 
        },
        ...conversationHistory.slice(-8), // Keep last 8 messages for context
        { role: 'user', content: userInput }
      ]

      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-large', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: {
            past_user_inputs: messages.filter(m => m.role === 'user').map(m => m.content),
            generated_responses: messages.filter(m => m.role === 'assistant').map(m => m.content),
            text: userInput
          },
          parameters: {
            max_length: 100,
            temperature: 0.7,
            do_sample: true
          }
        })
      })

      if (!response.ok) {
        // Fallback to simple responses if HuggingFace is unavailable
        console.warn('HuggingFace unavailable, using fallback responses')
        return this.getFallbackResponse(userInput)
      }

      const data = await response.json()
      return data.generated_text || this.getFallbackResponse(userInput)
    } catch (error) {
      console.error('AI generation error:', error)
      return this.getFallbackResponse(userInput)
    }
  }

  private getFallbackResponse(userInput: string): string {
    const lowerInput = userInput.toLowerCase()
    
    if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return "Hello! How can I help you today?"
    }
    if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
      return "Goodbye! Have a great day!"
    }
    if (lowerInput.includes('help')) {
      return "I'm here to assist you. What would you like to know?"
    }
    if (lowerInput.includes('how are you')) {
      return "I'm doing great, thank you for asking! How can I help you?"
    }
    
    return "That's interesting! Can you tell me more about that?"
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8)
  const startTime = Date.now()
  
  console.log(`[${requestId}] === NEW REQUEST START ===`)
  console.log(`[${requestId}] Method: ${req.method}, URL: ${req.url}`)
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`[${requestId}] CORS preflight handled`)
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Handle health check
    const url = new URL(req.url)
    if (url.pathname === '/health' || req.method === 'GET') {
      return handleHealthCheck()
    }

    // Validate WebSocket upgrade
    const upgradeHeader = req.headers.get('upgrade')
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      console.log(`[${requestId}] Invalid upgrade header: ${upgradeHeader}`)
      return new Response(
        JSON.stringify({ 
          error: 'WebSocket upgrade required',
          received: upgradeHeader,
          expected: 'websocket',
          requestId 
        }),
        {
          status: 426,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
          },
        }
      )
    }

    // Check environment variables
    const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY')
    const huggingFaceKey = Deno.env.get('HUGGING_FACE_API')
    
    console.log(`[${requestId}] Environment check:`, {
      hasDeepgram: !!deepgramKey,
      hasHuggingFace: !!huggingFaceKey
    })

    if (!deepgramKey) {
      console.error(`[${requestId}] Missing DEEPGRAM_API_KEY`)
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'DEEPGRAM_API_KEY not configured',
          requestId 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    if (!huggingFaceKey) {
      console.error(`[${requestId}] Missing HUGGING_FACE_API`)
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'HUGGING_FACE_API not configured',
          requestId 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }}
      )
    }

    // Upgrade to WebSocket
    console.log(`[${requestId}] Attempting WebSocket upgrade...`)
    const { socket, response } = Deno.upgradeWebSocket(req)
    console.log(`[${requestId}] WebSocket upgrade successful`)

    // Initialize services
    const sttService = new DeepgramSTTService(deepgramKey)
    const ttsService = new DeepgramTTSService(deepgramKey)
    const aiService = new HuggingFaceAIService(huggingFaceKey)

    // Connection state management
    let isActive = true
    let keepAliveInterval: number | null = null
    let deepgramSTT: WebSocket | null = null
    let conversationHistory: Array<{role: string, content: string}> = []

    // Parse connection parameters
    const userId = url.searchParams.get('userId') || 'anonymous'
    const callId = url.searchParams.get('callId') || 'browser-session'
    const assistantId = url.searchParams.get('assistantId') || 'default'

    console.log(`[${requestId}] Connection params:`, { userId, callId, assistantId })

    // WebSocket event handlers
    socket.onopen = async () => {
      try {
        console.log(`[${requestId}] CLIENT WEBSOCKET OPENED SUCCESSFULLY`)
        isActive = true
        
        // Initialize Deepgram STT connection
        try {
          deepgramSTT = await sttService.createConnection()
          
          deepgramSTT.onmessage = async (event) => {
            try {
              const data = JSON.parse(event.data)
              
              if (data.channel?.alternatives?.[0]) {
                const transcript = data.channel.alternatives[0].transcript
                const isFinal = data.is_final || false
                
                if (transcript && transcript.trim()) {
                  console.log(`[${requestId}] Transcript (final: ${isFinal}):`, transcript)
                  
                  // Send transcript to client
                  socket.send(JSON.stringify({
                    type: 'transcript',
                    text: transcript,
                    isFinal,
                    confidence: data.channel.alternatives[0].confidence || 1.0,
                    timestamp: Date.now()
                  }))
                  
                  // Process final transcripts with AI
                  if (isFinal) {
                    await handleTranscriptWithAI(transcript, requestId)
                  }
                }
              }
            } catch (error) {
              console.error(`[${requestId}] STT message error:`, error)
            }
          }
          
          deepgramSTT.onerror = (error) => {
            console.error(`[${requestId}] Deepgram STT error:`, error)
          }
          
          console.log(`[${requestId}] Deepgram STT initialized`)
        } catch (error) {
          console.error(`[${requestId}] Failed to initialize Deepgram STT:`, error)
        }
        
        // Send connection confirmation
        const welcomeMessage = {
          type: 'connection_established',
          connectionId: requestId,
          message: 'Voice assistant connected with AI processing',
          userId,
          callId,
          assistantId,
          timestamp: Date.now(),
          capabilities: ['deepgram-stt', 'deepgram-tts', 'huggingface-ai', 'real-time-voice']
        }
        
        socket.send(JSON.stringify(welcomeMessage))
        console.log(`[${requestId}] Welcome message sent`)
        
        // Start keepalive
        keepAliveInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN && isActive) {
            try {
              socket.send(JSON.stringify({ 
                type: 'ping', 
                connectionId: requestId,
                timestamp: Date.now() 
              }))
              console.log(`[${requestId}] Keepalive ping sent`)
            } catch (error) {
              console.error(`[${requestId}] Keepalive ping failed:`, error)
            }
          }
        }, 20000) as unknown as number
        
        console.log(`[${requestId}] Keepalive system started`)
        
      } catch (error) {
        console.error(`[${requestId}] Error in onopen handler:`, error)
        try {
          socket.close(1011, 'Internal server error during initialization')
        } catch (closeError) {
          console.error(`[${requestId}] Error closing socket:`, closeError)
        }
      }
    }

    // Handle transcript processing with AI
    const handleTranscriptWithAI = async (transcript: string, requestId: string) => {
      try {
        console.log(`[${requestId}] Processing transcript with AI: "${transcript}"`)
        
        // Add user message to conversation history
        conversationHistory.push({ role: 'user', content: transcript })
        
        // Generate AI response
        const aiResponse = await aiService.generateResponse(transcript, conversationHistory)
        
        // Add AI response to conversation history
        conversationHistory.push({ role: 'assistant', content: aiResponse })
        
        // Keep conversation history manageable
        if (conversationHistory.length > 20) {
          conversationHistory = conversationHistory.slice(-20)
        }
        
        console.log(`[${requestId}] AI response generated: "${aiResponse}"`)
        
        // Send text response to client
        socket.send(JSON.stringify({
          type: 'ai_response',
          text: aiResponse,
          timestamp: Date.now()
        }))
        
        // Generate and send speech
        try {
          const audioBuffer = await ttsService.synthesizeSpeech(aiResponse)
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
          
          socket.send(JSON.stringify({
            type: 'audio_response',
            audio: base64Audio,
            format: 'wav',
            timestamp: Date.now()
          }))
          
          console.log(`[${requestId}] Audio response sent (${base64Audio.length} chars)`)
        } catch (ttsError) {
          console.error(`[${requestId}] TTS error:`, ttsError)
          // Send text-only response if TTS fails
          socket.send(JSON.stringify({
            type: 'tts_error',
            message: 'Audio generation failed, text response only',
            timestamp: Date.now()
          }))
        }
        
      } catch (error) {
        console.error(`[${requestId}] Error processing transcript:`, error)
        socket.send(JSON.stringify({
          type: 'error',
          error: 'Failed to process voice input',
          details: error.message,
          timestamp: Date.now()
        }))
      }
    }

    socket.onmessage = async (event) => {
      try {
        console.log(`[${requestId}] Message received, parsing...`)
        const data = JSON.parse(event.data)
        console.log(`[${requestId}] Message type: ${data.type || data.event}`)

        switch (data.type || data.event) {
          case 'pong':
            console.log(`[${requestId}] Pong received - connection healthy`)
            break

          case 'ping':
            console.log(`[${requestId}] Ping received, sending pong`)
            socket.send(JSON.stringify({
              type: 'pong',
              connectionId: requestId,
              timestamp: Date.now()
            }))
            break

          case 'audio_data':
            // Forward audio data to Deepgram STT
            if (data.audio && deepgramSTT && deepgramSTT.readyState === WebSocket.OPEN) {
              try {
                // Convert base64 to binary and send to Deepgram
                const binaryAudio = atob(data.audio)
                const audioBytes = new Uint8Array(binaryAudio.length)
                for (let i = 0; i < binaryAudio.length; i++) {
                  audioBytes[i] = binaryAudio.charCodeAt(i)
                }
                deepgramSTT.send(audioBytes)
                console.log(`[${requestId}] Audio forwarded to Deepgram STT`)
              } catch (error) {
                console.error(`[${requestId}] Error forwarding audio:`, error)
              }
            }
            break

          case 'text_input':
            // Handle direct text input (for testing)
            if (data.text?.trim()) {
              console.log(`[${requestId}] Processing text input: "${data.text.substring(0, 50)}..."`)
              await handleTranscriptWithAI(data.text, requestId)
            }
            break

          case 'start_conversation':
            console.log(`[${requestId}] Starting conversation session`)
            socket.send(JSON.stringify({
              type: 'conversation_started',
              message: 'Voice processing ready! Speak naturally.',
              timestamp: Date.now()
            }))
            break

          default:
            console.log(`[${requestId}] Unknown message type: ${data.type || data.event}`)
            break
        }
      } catch (error) {
        console.error(`[${requestId}] Error processing message:`, error)
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Message processing failed',
              details: error.message,
              timestamp: Date.now()
            }))
          } catch (sendError) {
            console.error(`[${requestId}] Failed to send error message:`, sendError)
          }
        }
      }
    }

    socket.onclose = (event) => {
      console.log(`[${requestId}] CLIENT WEBSOCKET CLOSED:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      })
      
      isActive = false
      
      // Cleanup resources
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
        console.log(`[${requestId}] Keepalive stopped`)
      }
      
      if (deepgramSTT) {
        deepgramSTT.close()
        deepgramSTT = null
        console.log(`[${requestId}] Deepgram STT closed`)
      }
      
      console.log(`[${requestId}] Cleanup completed`)
    }

    socket.onerror = (error) => {
      console.error(`[${requestId}] CLIENT WEBSOCKET ERROR:`, error)
      isActive = false
    }

    const endTime = Date.now()
    console.log(`[${requestId}] WebSocket setup completed in ${endTime - startTime}ms`)
    
    return response

  } catch (error) {
    console.error(`[${requestId}] Fatal error:`, error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

console.log('Deepgram Voice Agent with AI processing ready to serve requests')
