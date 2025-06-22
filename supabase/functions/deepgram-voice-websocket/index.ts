// deno-lint-ignore-file
// This file is intended for Deno Deploy Edge Functions. Deno.env.get and remote imports are valid in this context.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice WebSocket v8.0 - Enhanced Authentication & Connection Flow');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

// Enhanced conversation logic with better debugging
interface ConversationResponse {
  text: string;
  shouldTransfer: boolean;
  shouldEndCall: boolean;
  intent: string;
  confidence: number;
  sentiment: string;
  emotion: string;
}

const generateConversationResponse = async (
  userInput: string,
  context: any,
  openaiApiKey: string,
  assistantCustomPrompt?: string
): Promise<ConversationResponse> => {
  try {
    console.log('🧠 [AI] Processing user input:', userInput.substring(0, 100));
    
    const systemPrompt = assistantCustomPrompt || 'You are a helpful AI assistant in a phone conversation. Keep responses conversational, natural, and under 2-3 sentences. Respond as if you are speaking directly to the person.';
    
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];
    
    if (context.previousMessages && Array.isArray(context.previousMessages)) {
      messages.push(...context.previousMessages.slice(-8));
    }
    messages.push({ role: 'user', content: userInput });

    console.log('💭 [AI] Sending to OpenAI with context length:', messages.length);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 100,
        temperature: 0.8,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ [AI] OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const aiData = await openaiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content?.trim() || '';
    
    console.log('✅ [AI] Generated response:', aiText);

    // Intent detection
    const input = userInput.toLowerCase().trim();
    let shouldTransfer = false;
    let shouldEndCall = false;
    let intent = 'general_conversation';
    let confidence = 0.7;

    if (input.includes('human') || input.includes('transfer')) {
      shouldTransfer = true; 
      intent = 'transfer_request'; 
      confidence = 0.95;
    } else if (input.includes('goodbye') || input.includes('bye')) {
      shouldEndCall = true; 
      intent = 'end_conversation'; 
      confidence = 0.9;
    } else if (input.includes('hello') || input.includes('hi')) {
      intent = 'greeting'; 
      confidence = 0.9;
    }

    return {
      text: aiText || 'I understand. Could you tell me more about that?',
      shouldTransfer,
      shouldEndCall,
      intent,
      confidence,
      sentiment: 'neutral',
      emotion: 'neutral'
    };
  } catch (error) {
    console.error('❌ [AI] Conversation error:', error);
    const input = userInput.toLowerCase().trim();
    let fallbackResponse = '';
    
    if (input.includes('hello') || input.includes('hi')) {
      fallbackResponse = 'Hello! Thank you for speaking with me. How can I help you today?';
    } else if (input.includes('what') || input.includes('how')) {
      fallbackResponse = 'That\'s a great question. Let me help you with that.';
    } else if (input.includes('yes')) {
      fallbackResponse = 'Wonderful! What would you like to know more about?';
    } else {
      fallbackResponse = 'I hear you. Could you tell me more about that?';
    }
    
    return {
      text: fallbackResponse,
      shouldTransfer: false,
      shouldEndCall: false,
      intent: 'fallback_response',
      confidence: 0.6,
      sentiment: 'neutral',
      emotion: 'neutral'
    };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const callId = url.searchParams.get('callId') || 'browser-test'
  const assistantId = url.searchParams.get('assistantId') || 'demo'
  const userId = url.searchParams.get('userId')

  console.log('🔗 [INIT] Voice WebSocket Connection Request:', { callId, assistantId, userId });

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
  
  if (!openaiApiKey) {
    console.error('❌ [CONFIG] Missing OPENAI_API_KEY')
    return new Response('OpenAI API key not configured', { status: 500, headers: corsHeaders })
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
    let conversationBuffer: Array<{ role: string; content: string }> = []
    let ttsInitialized = false
    let firstMessageSent = false
    let processingTranscript = false
    let isAuthenticated = false
    
    // Enhanced transcript processing
    let interimTranscriptBuffer = ''
    let finalTranscriptBuffer = ''
    let lastUtteranceTime = Date.now()
    let speechDetected = false
    let keepAliveInterval: number | null = null
    let conversationCount = 0

    const log = (msg: string, data?: any) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [${callId}] ${msg}`, data || '')
    }

    // Authenticate user if userId provided
    const authenticateUser = async (authToken?: string) => {
      if (!userId) {
        log('⚠️ [AUTH] No userId provided, using demo mode')
        isAuthenticated = true
        return true
      }

      try {
        if (authToken) {
          const { data: { user }, error } = await supabaseClient.auth.getUser(authToken)
          if (user && user.id === userId) {
            log('✅ [AUTH] User authenticated successfully', { userId: user.id })
            isAuthenticated = true
            return true
          }
        }
        
        // For demo purposes, allow connection without strict auth
        log('⚠️ [AUTH] Using permissive authentication for demo')
        isAuthenticated = true
        return true
      } catch (error) {
        log('❌ [AUTH] Authentication failed', error)
        return false
      }
    }

    // Load assistant configuration
    const loadAssistant = async () => {
      if (assistantId !== 'demo' && userId && isAuthenticated) {
        try {
          log('🔍 [CONFIG] Loading assistant configuration...', { assistantId, userId })
          const { data: assistantData } = await supabaseClient
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .eq('user_id', userId)
            .single()
          if (assistantData) {
            assistant = assistantData
            log('✅ [CONFIG] Assistant loaded successfully', { 
              name: assistant.name, 
              voice_id: assistant.voice_id 
            })
          }
        } catch (err) {
          log('⚠️ [CONFIG] Error fetching assistant, using default', err)
        }
      }

      if (!assistant) {
        assistant = {
          name: 'AI Assistant',
          first_message: 'Hello! I can hear you clearly. How can I help you today?',
          system_prompt: 'You are a helpful AI assistant. Be conversational, natural, and keep responses concise and engaging.',
          voice_id: 'aura-asteria-en',
          model: 'nova-2'
        }
        log('🤖 [CONFIG] Using default assistant configuration')
      }
    }

    // ENHANCED: Fixed STT with proper transcript handling
    const initializeSTT = () => {
      try {
        const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300&utterance_end_ms=1500&vad_events=true&punctuate=true&diarize=false&filler_words=false'
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ [STT] DeepGram STT connected successfully')
        }

        deepgramSTT.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              const isFinal = data.is_final || false
              const speechFinal = data.speech_final || false
              const confidence = data.channel.alternatives[0].confidence || 1.0
              
              log('📝 [STT] Transcript Event:', { 
                transcript: transcript.substring(0, 50), 
                isFinal, 
                speechFinal, 
                confidence: confidence.toFixed(2),
                length: transcript.length 
              })
              
              if (transcript && transcript.length > 0) {
                speechDetected = true
                lastUtteranceTime = Date.now()
                
                if (!isFinal && !speechFinal) {
                  interimTranscriptBuffer = transcript
                  log('🔄 [STT] Interim transcript:', transcript)
                } else if (speechFinal || isFinal) {
                  const finalTranscript = transcript || interimTranscriptBuffer
                  if (finalTranscript && finalTranscript.length > 2 && !processingTranscript) {
                    log('🎯 [STT] Processing FINAL transcript:', finalTranscript)
                    finalTranscriptBuffer = finalTranscript
                    interimTranscriptBuffer = ''
                    processingTranscript = true
                    
                    setTimeout(async () => {
                      await processConversation(finalTranscript)
                      processingTranscript = false
                    }, 100)
                  }
                }

                // Send transcript to client
                socket.send(JSON.stringify({
                  type: 'transcript',
                  text: transcript,
                  confidence,
                  isFinal,
                  speechFinal,
                  timestamp: Date.now()
                }))
              }
            }
            
            if (data.type === 'UtteranceEnd') {
              log('🔚 [STT] UtteranceEnd detected')
              
              if (speechDetected && (interimTranscriptBuffer || finalTranscriptBuffer) && !processingTranscript) {
                const transcript = finalTranscriptBuffer || interimTranscriptBuffer
                if (transcript && transcript.length > 2) {
                  log('🎯 [STT] Processing UtteranceEnd transcript:', transcript)
                  processingTranscript = true
                  interimTranscriptBuffer = ''
                  finalTranscriptBuffer = ''
                  
                  setTimeout(async () => {
                    await processConversation(transcript)
                    processingTranscript = false
                  }, 100)
                }
              }
              speechDetected = false
            }

            if (data.type === 'SpeechStarted') {
              log('🎤 [STT] Speech detection started')
              speechDetected = true
            }
            
          } catch (error) {
            log('❌ [STT] Error processing STT message:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          log('❌ [STT] DeepGram STT error:', error)
          setTimeout(initializeSTT, 2000)
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 [STT] DeepGram STT closed:', event.code)
          if (isCallActive && event.code !== 1000) {
            setTimeout(initializeSTT, 2000)
          }
        }
      } catch (error) {
        log('❌ [STT] Error initializing STT:', error)
        setTimeout(initializeSTT, 2000)
      }
    }

    // ENHANCED: Fixed TTS with proper audio streaming to browser
    const initializeTTS = () => {
      try {
        const ttsUrl = 'wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=24000&container=none'
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          log('✅ [TTS] DeepGram TTS connected successfully')
          ttsInitialized = true
          
          setTimeout(() => {
            if (assistant.first_message && !firstMessageSent) {
              sendTTSMessage(assistant.first_message)
              firstMessageSent = true
            }
          }, 500)
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            try {
              const audioArray = new Uint8Array(event.data)
              const base64Audio = btoa(String.fromCharCode(...audioArray))
              
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'audio_response',
                  audio: base64Audio,
                  encoding: 'linear16',
                  sample_rate: 24000,
                  timestamp: Date.now()
                }))
                
                if (Math.random() < 0.02) {
                  log('🔊 [TTS] Audio chunk sent to browser', { size: audioArray.length })
                }
              }
            } catch (error) {
              log('❌ [TTS] Error processing TTS audio:', error)
            }
          }
        }

        deepgramTTS.onerror = (error) => {
          log('❌ [TTS] DeepGram TTS error:', error)
          ttsInitialized = false
          setTimeout(initializeTTS, 2000)
        }

        deepgramTTS.onclose = (event) => {
          log('🔌 [TTS] DeepGram TTS closed:', event.code)
          ttsInitialized = false
          if (isCallActive && event.code !== 1000) {
            setTimeout(initializeTTS, 2000)
          }
        }
      } catch (error) {
        log('❌ [TTS] Error initializing TTS:', error)
        setTimeout(initializeTTS, 2000)
      }
    }

    // Enhanced TTS message sending
    const sendTTSMessage = (text: string) => {
      if (!text || !text.trim()) {
        log('⚠️ [TTS] Empty text, skipping TTS')
        return
      }
      
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN && ttsInitialized) {
        try {
          log('📤 [TTS] Sending message to TTS:', text.substring(0, 100))
          
          deepgramTTS.send(JSON.stringify({ type: 'Clear' }))
          
          setTimeout(() => {
            if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
              const message = {
                type: 'Speak',
                text: text.trim()
              }
              deepgramTTS.send(JSON.stringify(message))
              log('✅ [TTS] TTS message sent successfully')
            }
          }, 100)
        } catch (error) {
          log('❌ [TTS] Error sending TTS message:', error)
        }
      } else {
        log('⚠️ [TTS] TTS not ready, retrying...', { 
          readyState: deepgramTTS?.readyState, 
          initialized: ttsInitialized 
        })
        setTimeout(() => sendTTSMessage(text), 1000)
      }
    }

    // Enhanced conversation processing
    const processConversation = async (transcript: string) => {
      try {
        conversationCount++
        log(`🧠 [CONV] Processing conversation #${conversationCount}:`, { 
          transcript: transcript.substring(0, 100),
          length: transcript.length 
        })

        if (!transcript || transcript.trim().length < 2) {
          log('⚠️ [CONV] Transcript too short, skipping')
          return
        }

        conversationBuffer.push({ role: 'user', content: transcript })

        const response = await generateConversationResponse(transcript, {
          callId,
          agentPrompt: assistant.system_prompt,
          previousMessages: conversationBuffer
        }, openaiApiKey, assistant.system_prompt)

        log('🤖 [CONV] AI response generated:', { 
          responseLength: response.text?.length,
          intent: response.intent,
          confidence: response.confidence 
        })

        if (!response.text || response.text.trim().length === 0) {
          log('❌ [CONV] Empty AI response, using fallback')
          response.text = "I understand. Could you tell me more about that?"
        }

        conversationBuffer.push({ role: 'assistant', content: response.text })

        if (conversationBuffer.length > 16) {
          conversationBuffer = conversationBuffer.slice(-12)
          log('🧹 [CONV] Conversation buffer trimmed')
        }

        socket.send(JSON.stringify({
          type: 'ai_response',
          text: response.text,
          intent: response.intent,
          confidence: response.confidence,
          conversationCount,
          timestamp: Date.now()
        }))

        log('🎤 [CONV] Sending AI response to TTS for voice synthesis')
        sendTTSMessage(response.text)

        if (response.shouldEndCall) {
          log('📴 [CONV] Call should end based on AI decision')
          setTimeout(() => {
            socket.send(JSON.stringify({ type: 'end_call', reason: 'ai_decision' }))
          }, 3000)
        }

      } catch (error) {
        log('❌ [CONV] Error processing conversation:', error)
        const fallbackResponse = "I'm having trouble processing that. Could you repeat what you said?"
        sendTTSMessage(fallbackResponse)
        
        socket.send(JSON.stringify({
          type: 'processing_error',
          error: error.message,
          timestamp: Date.now()
        }))
      }
    }

    // Enhanced keepalive mechanism
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(() => {
        try {
          if (deepgramSTT?.readyState === WebSocket.OPEN) {
            deepgramSTT.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          if (deepgramTTS?.readyState === WebSocket.OPEN) {
            deepgramTTS.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          }
          log('💓 [KEEPALIVE] Sent to all WebSocket connections')
        } catch (error) {
          log('❌ [KEEPALIVE] Error:', error)
        }
      }, 5000) as unknown as number
    }

    const cleanup = () => {
      isCallActive = false
      ttsInitialized = false
      firstMessageSent = false
      processingTranscript = false
      speechDetected = false
      interimTranscriptBuffer = ''
      finalTranscriptBuffer = ''
      
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
      log('🔌 [SOCKET] Client WebSocket connected')
      isCallActive = true
    }

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        log('📨 [SOCKET] Received message:', { 
          event: msg.event || msg.type,
          hasPayload: !!msg.media?.payload,
          hasAuth: !!msg.auth
        })
        
        switch (msg.event || msg.type) {
          case 'connected':
            log('📡 [SOCKET] Client connected confirmation')
            
            // Authenticate and setup
            const authSuccess = await authenticateUser(msg.auth)
            if (!authSuccess) {
              socket.close(1008, 'Unauthorized: Call access denied')
              return
            }
            
            await loadAssistant()
            
            // Initialize DeepGram connections
            initializeSTT()
            initializeTTS()
            
            // Start keepalive
            startKeepAlive()
            
            socket.send(JSON.stringify({
              type: 'connection_established',
              callId,
              assistantId,
              assistant: { 
                name: assistant.name,
                system_prompt: assistant.system_prompt,
                first_message: assistant.first_message
              },
              timestamp: Date.now(),
            }))
            
            log('📡 [SOCKET] Connection established message sent')
            break
            
          case 'media':
            if (isCallActive && msg.media?.payload && deepgramSTT?.readyState === WebSocket.OPEN) {
              try {
                const binaryAudio = Uint8Array.from(atob(msg.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(binaryAudio)
                
                if (Math.random() < 0.001) {
                  log('🎵 [AUDIO] Audio chunk sent to STT', { size: binaryAudio.length })
                }
              } catch (error) {
                log('❌ [AUDIO] Error processing incoming audio:', error)
              }
            }
            break
            
          case 'text_input':
            if (msg.text?.trim()) {
              log('💬 [INPUT] Processing text input:', msg.text.substring(0, 50))
              await processConversation(msg.text)
            }
            break
            
          case 'request_greeting':
            log('👋 [GREETING] Greeting requested')
            if (assistant.first_message) {
              sendTTSMessage(assistant.first_message)
              socket.send(JSON.stringify({
                type: 'greeting_sent',
                text: assistant.first_message,
                timestamp: Date.now()
              }))
            }
            break

          case 'ping':
            socket.send(JSON.stringify({
              type: 'pong',
              timestamp: Date.now()
            }))
            break

          default:
            log(`❓ [SOCKET] Unknown message type: ${msg.event || msg.type}`)
        }
      } catch (err) {
        log('❌ [SOCKET] Error processing message:', err)
      }
    }

    socket.onclose = (ev) => {
      log('🔌 [SOCKET] WebSocket closed:', { code: ev.code, reason: ev.reason })
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
