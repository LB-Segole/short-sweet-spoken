// deno-lint-ignore-file
// This file is intended for Deno Deploy Edge Functions. Deno.env.get and remote imports are valid in this context.
// If your editor or linter flags errors for Deno or remote imports, you can safely ignore them for Supabase Edge Functions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice WebSocket initialized v6.0 - Enhanced Real-Time Conversation with Fixed Turn Detection');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

// Conversation service logic moved directly into the edge function
interface ConversationResponse {
  text: string;
  shouldTransfer: boolean;
  shouldEndCall: boolean;
  intent: string;
  confidence: number;
  sentiment: string;
  emotion: string;
}

interface ConversationContext {
  callId: string;
  agentPrompt?: string;
  agentPersonality?: string;
  previousMessages?: Array<{ role: string; content: string }>;
}

// --- Advanced Features: Sentiment Analysis, Summaries, Analytics, Custom Prompts ---

// Helper: Get sentiment for a message using OpenAI
async function getSentiment(userInput: string, openaiApiKey: string): Promise<string> {
  try {
    const prompt = `Classify the sentiment of this message as Positive, Negative, or Neutral. Only return the word: \n"${userInput}"`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a sentiment analysis engine.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1,
        temperature: 0.0,
      })
    });
    if (!response.ok) return 'Unknown';
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'unknown';
    if (text.includes('positive')) return 'positive';
    if (text.includes('negative')) return 'negative';
    if (text.includes('neutral')) return 'neutral';
    return 'unknown';
  } catch (e) {
    console.error('Sentiment analysis error:', e);
    return 'unknown';
  }
}

// Helper: Get emotion for a message using OpenAI
async function getEmotion(userInput: string, openaiApiKey: string): Promise<string> {
  try {
    const prompt = `Classify the emotion expressed in this message (e.g., joy, anger, sadness, fear, surprise, disgust, neutral). Only return the emotion word.\n"${userInput}"`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an emotion detection engine.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1,
        temperature: 0.0,
      })
    });
    if (!response.ok) return 'unknown';
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'unknown';
    // Return only the first word (emotion)
    return text.split(/\s|\.|,/)[0] || 'unknown';
  } catch (e) {
    console.error('Emotion detection error:', e);
    return 'unknown';
  }
}

// Helper: Summarize conversation using OpenAI
async function getSummary(conversationBuffer: Array<{ role: string; content: string }>, openaiApiKey: string): Promise<string> {
  try {
    const prompt = `Summarize the following conversation between an AI agent and a user in 2-3 sentences.\n\n${conversationBuffer.map(m => `${m.role}: ${m.content}`).join('\n')}`;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a conversation summarizer.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 120,
        temperature: 0.3,
      })
    });
    if (!response.ok) return '';
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch (e) {
    console.error('Summary generation error:', e);
    return '';
  }
}

// --- Enhanced generateConversationResponse with better real-time processing ---
const generateConversationResponse = async (
  userInput: string,
  context: any,
  openaiApiKey: string,
  assistantCustomPrompt?: string
): Promise<any> => {
  try {
    log('🧠 Generating real-time AI response for:', userInput.substring(0, 50) + '...');
    
    // Use custom prompt if available
    const systemPrompt = assistantCustomPrompt || context.agentPrompt || 'You are a helpful AI assistant in a phone conversation. Keep responses conversational, natural, and under 2-3 sentences. Respond as if you are speaking directly to the person.';
    
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];
    
    if (context.previousMessages && Array.isArray(context.previousMessages)) {
      // Only keep last 10 messages for context to avoid token limits
      messages.push(...context.previousMessages.slice(-10));
    }
    messages.push({ role: 'user', content: userInput });

    log('💭 Sending to OpenAI with context length:', messages.length);

    // Call OpenAI for response with optimized settings for real-time conversation
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 150, // Shorter for faster response
        temperature: 0.8, // Slightly more conversational
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      log('❌ OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status} ${errorText}`);
    }

    const aiData = await openaiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content?.trim() || '';
    
    log('✅ Generated AI response:', aiText.substring(0, 100) + '...');

    // Enhanced sentiment and emotion analysis
    const [sentiment, emotion] = await Promise.all([
      getSentiment(userInput, openaiApiKey),
      getEmotion(userInput, openaiApiKey)
    ]);

    // Enhanced intent detection for real-time conversation
    const input = userInput.toLowerCase().trim();
    let shouldTransfer = false;
    let shouldEndCall = false;
    let intent = 'general_conversation';
    let confidence = 0.7;

    // More comprehensive intent detection
    if (input.includes('human') || input.includes('person') || input.includes('representative') || input.includes('transfer')) {
      shouldTransfer = true; 
      intent = 'transfer_request'; 
      confidence = 0.95;
    } else if (input.includes('goodbye') || input.includes('bye') || input.includes('hang up') || input.includes('end call')) {
      shouldEndCall = true; 
      intent = 'end_conversation'; 
      confidence = 0.9;
    } else if (input.includes('not interested') || input.includes('no thank') || input.includes('busy') || input.includes('stop calling')) {
      shouldEndCall = true; 
      intent = 'not_interested'; 
      confidence = 0.85;
    } else if (input.includes('price') || input.includes('cost') || input.includes('expensive') || input.includes('money')) {
      intent = 'pricing_inquiry'; 
      confidence = 0.8;
    } else if (input.includes('hello') || input.includes('hi') || input.includes('hey') || input.includes('yes')) {
      intent = 'positive_engagement'; 
      confidence = 0.9;
    } else if (input.includes('business') || input.includes('service') || input.includes('help') || input.includes('information')) {
      intent = 'business_inquiry'; 
      confidence = 0.8;
    } else if (input.includes('what') || input.includes('how') || input.includes('why') || input.includes('tell me')) {
      intent = 'question'; 
      confidence = 0.75;
    }

    return {
      text: aiText || 'I understand. Could you tell me more about that?',
      shouldTransfer,
      shouldEndCall,
      intent,
      confidence,
      sentiment,
      emotion
    };
  } catch (error) {
    log('❌ AI conversation error:', error);
    // Enhanced fallback with more natural responses
    const input = userInput.toLowerCase().trim();
    let fallbackResponse = '';
    
    if (input.includes('hello') || input.includes('hi')) {
      fallbackResponse = 'Hello! Thank you for taking the time to speak with me. How are you doing today?';
    } else if (input.includes('what') || input.includes('who')) {
      fallbackResponse = 'That\'s a great question. Let me help you with that. Could you tell me a bit more about what you\'re looking for?';
    } else if (input.includes('yes')) {
      fallbackResponse = 'Wonderful! I\'m glad to hear that. What would you like to know more about?';
    } else if (input.includes('no')) {
      fallbackResponse = 'I understand. Is there anything else I can help you with today?';
    } else {
      fallbackResponse = 'I hear you. That sounds interesting. Could you tell me more about that so I can better assist you?';
    }
    
    return {
      text: fallbackResponse,
      shouldTransfer: false,
      shouldEndCall: false,
      intent: 'fallback_response',
      confidence: 0.6,
      sentiment: 'unknown',
      emotion: 'unknown'
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

  console.log('🔗 Voice WebSocket Connection Request:', { 
    callId, 
    assistantId, 
    userId, 
    userAgent: req.headers.get('user-agent')?.substring(0, 50) 
  });

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
    console.error('❌ Missing DEEPGRAM_API_KEY')
    return new Response('DeepGram API key not configured', { status: 500, headers: corsHeaders })
  }
  
  if (!openaiApiKey) {
    console.error('❌ Missing OPENAI_API_KEY')
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
    let signalWireStreamSid: string | null = null
    let conversationBuffer: Array<{ role: string; content: string }> = []
    let ttsInitialized = false
    let firstMessageSent = false
    let processingTranscript = false
    
    // Enhanced transcript buffering with detailed logging
    let interimTranscriptBuffer = ''
    let lastUtteranceTime = Date.now()
    let speechDetected = false
    let keepAliveInterval: number | null = null
    let conversationCount = 0

    const log = (msg: string, data?: any) => {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [Call: ${callId}] ${msg}`, data || '')
    }

    // Load assistant configuration with enhanced logging
    if (assistantId !== 'demo' && userId) {
      try {
        log('🔍 Loading assistant configuration...', { assistantId, userId })
        const { data: assistantData } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('id', assistantId)
          .eq('user_id', userId)
          .single()
        if (assistantData) {
          assistant = assistantData
          log('✅ Assistant loaded successfully', { 
            name: assistant.name, 
            voice_id: assistant.voice_id,
            model: assistant.model,
            system_prompt_length: assistant.system_prompt?.length 
          })
        } else {
          log('⚠️ No assistant found, using default')
        }
      } catch (err) {
        log('⚠️ Error fetching assistant, using default', err)
      }
    }

    if (!assistant) {
      assistant = {
        name: 'AI Assistant',
        first_message: 'Hello! Thank you for taking my call. This is your AI assistant. How can I help you today?',
        system_prompt: 'You are a helpful AI assistant in a phone conversation. Be natural, conversational, and keep responses concise. Respond as if speaking directly to the person.',
        voice_id: 'aura-asteria-en',
        model: 'nova-2'
      }
      log('🤖 Using default assistant configuration')
    }

    // FIXED: Enhanced STT with proper endpointing and interim results
    const initializeSTT = () => {
      try {
        // ENHANCED: Better STT parameters with proper endpointing
        const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300&utterance_end_ms=1000&vad_events=true&punctuate=true&diarize=false&filler_words=false'
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ DeepGram STT connected with enhanced endpointing')
        }

        deepgramSTT.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // ENHANCED: Detailed logging for all STT events
            if (data.type === 'Results' && data.channel?.alternatives?.[0]) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              const isFinal = data.is_final || false
              const speechFinal = data.speech_final || false
              const confidence = data.channel.alternatives[0].confidence || 1.0
              
              log('📝 STT Event Details:', { 
                type: data.type, 
                transcript, 
                isFinal, 
                speechFinal, 
                confidence: confidence.toFixed(2),
                hasTranscript: !!transcript 
              })
              
              if (transcript && transcript.length > 0) {
                speechDetected = true
                lastUtteranceTime = Date.now()
                
                // FIXED: Proper interim transcript buffering
                if (!isFinal && !speechFinal) {
                  interimTranscriptBuffer = transcript
                  log('🔄 Interim transcript buffered:', transcript)
                } else if (speechFinal || isFinal) {
                  // Use final transcript or buffered interim if no final available
                  const finalTranscript = transcript || interimTranscriptBuffer
                  if (finalTranscript && finalTranscript.length > 3 && !processingTranscript) {
                    log('🎯 Processing FINAL transcript:', finalTranscript)
                    processingTranscript = true
                    interimTranscriptBuffer = '' // Clear buffer
                    
                    setTimeout(async () => {
                      await processConversation(finalTranscript)
                      processingTranscript = false
                    }, 100)
                  }
                }

                // Forward to client
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
            
            // ENHANCED: Handle utterance end events
            if (data.type === 'UtteranceEnd') {
              log('🔚 UtteranceEnd detected')
              
              // FIXED: Process buffered transcript if no speech_final arrived
              if (speechDetected && interimTranscriptBuffer && !processingTranscript) {
                log('🎯 Processing UtteranceEnd transcript:', interimTranscriptBuffer)
                processingTranscript = true
                const transcript = interimTranscriptBuffer
                interimTranscriptBuffer = ''
                
                setTimeout(async () => {
                  await processConversation(transcript)
                  processingTranscript = false
                }, 100)
              }
              speechDetected = false
            }

            // Handle VAD events
            if (data.type === 'SpeechStarted') {
              log('🎤 Speech started')
              speechDetected = true
            }
            
          } catch (error) {
            log('❌ Error processing STT message:', error)
          }
        }

        deepgramSTT.onerror = (error) => {
          log('❌ DeepGram STT error:', error)
          setTimeout(initializeSTT, 2000)
        }

        deepgramSTT.onclose = (event) => {
          log('🔌 DeepGram STT closed:', event.code)
          if (isCallActive && event.code !== 1000) {
            setTimeout(initializeSTT, 2000)
          }
        }
      } catch (error) {
        log('❌ Error initializing STT:', error)
        setTimeout(initializeSTT, 2000)
      }
    }

    // FIXED: Enhanced TTS with proper container and flushing
    const initializeTTS = () => {
      try {
        // FIXED: Use container=none as recommended, with linear16 for quality
        const ttsUrl = 'wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=8000&container=none'
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          log('✅ DeepGram TTS connected with container=none')
          ttsInitialized = true
          
          // FIXED: Proper buffer flushing sequence
          if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
            // Send flush command first
            deepgramTTS.send(JSON.stringify({ type: 'Flush' }))
            log('🧹 TTS buffer flushed')
            
            // FIXED: Wait 300ms after flush before sending first message
            setTimeout(() => {
              if (assistant.first_message && !firstMessageSent) {
                sendTTSMessage(assistant.first_message)
                firstMessageSent = true
              }
            }, 300)
          }
        }

        deepgramTTS.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            try {
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
                if (Math.random() < 0.05) { // Log occasionally
                  log('🔊 Audio sent to SignalWire (container=none)')
                }
              }
            } catch (error) {
              log('❌ Error processing TTS audio:', error)
            }
          }
        }

        deepgramTTS.onerror = (error) => {
          log('❌ DeepGram TTS error:', error)
          ttsInitialized = false
          setTimeout(initializeTTS, 2000)
        }

        deepgramTTS.onclose = (event) => {
          log('🔌 DeepGram TTS closed:', event.code)
          ttsInitialized = false
          if (isCallActive && event.code !== 1000) {
            setTimeout(initializeTTS, 2000)
          }
        }
      } catch (error) {
        log('❌ Error initializing TTS:', error)
        setTimeout(initializeTTS, 2000)
      }
    }

    // ENHANCED: Better TTS message sending with proper sequencing
    const sendTTSMessage = (text: string) => {
      if (!text || !text.trim()) {
        log('⚠️ Empty text, skipping TTS')
        return
      }
      
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN && ttsInitialized) {
        try {
          // Clear any previous content
          deepgramTTS.send(JSON.stringify({ type: 'Clear' }))
          
          setTimeout(() => {
            if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
              const message = {
                type: 'Speak',
                text: text.trim()
              }
              deepgramTTS.send(JSON.stringify(message))
              log('📤 TTS message sent:', text.substring(0, 60) + (text.length > 60 ? '...' : ''))
            }
          }, 50)
        } catch (error) {
          log('❌ Error sending TTS message:', error)
        }
      } else {
        log('⚠️ TTS not ready, message queued:', text.substring(0, 50) + '...')
        setTimeout(() => sendTTSMessage(text), 1000)
      }
    }

    // Enhanced conversation processing with detailed validation
    const processConversation = async (transcript: string) => {
      try {
        conversationCount++
        log(`🧠 Processing conversation #${conversationCount}:`, { 
          transcript: transcript.substring(0, 100) + (transcript.length > 100 ? '...' : ''),
          transcriptLength: transcript.length,
          bufferLength: conversationBuffer.length 
        })

        if (!transcript || transcript.trim().length < 2) {
          log('⚠️ Transcript too short, skipping processing')
          return
        }

        // Add user message to conversation buffer
        conversationBuffer.push({ role: 'user', content: transcript })

        // Generate AI response with enhanced validation
        const response = await generateConversationResponse(transcript, {
          callId,
          agentPrompt: assistant.system_prompt,
          agentPersonality: 'conversational',
          previousMessages: conversationBuffer
        }, openaiApiKey, assistant.system_prompt)

        log('🤖 AI response generated:', { 
          responseLength: response.text?.length,
          intent: response.intent,
          confidence: response.confidence,
          shouldEndCall: response.shouldEndCall,
          shouldTransfer: response.shouldTransfer
        })

        // Enhanced response validation
        if (!response.text || response.text.trim().length === 0) {
          log('❌ Empty AI response detected, using fallback')
          response.text = "I understand. Could you tell me more about that?"
        }

        // Validate response quality
        if (response.text.length > 500) {
          log('⚠️ Response too long, truncating')
          response.text = response.text.substring(0, 400) + "..."
        }

        // Add AI response to conversation buffer
        conversationBuffer.push({ role: 'assistant', content: response.text })

        // Keep conversation buffer manageable
        if (conversationBuffer.length > 20) {
          conversationBuffer = conversationBuffer.slice(-16)
          log('🧹 Conversation buffer trimmed to 16 messages')
        }

        // Send response back to client with enhanced data
        socket.send(JSON.stringify({
          type: 'ai_response',
          text: response.text,
          intent: response.intent,
          confidence: response.confidence,
          shouldTransfer: response.shouldTransfer,
          shouldEndCall: response.shouldEndCall,
          sentiment: response.sentiment,
          emotion: response.emotion,
          conversationCount,
          timestamp: Date.now()
        }))

        // CRITICAL: Send to TTS for voice response with validation
        log('🎤 Sending response to TTS:', response.text.substring(0, 60) + '...')
        sendTTSMessage(response.text)

        // Handle call actions with logging
        if (response.shouldEndCall) {
          log('📴 Call should end based on AI decision')
          setTimeout(() => {
            socket.send(JSON.stringify({ type: 'end_call', reason: 'ai_decision' }))
          }, 3000)
        } else if (response.shouldTransfer) {
          log('📞 Call should transfer based on AI decision')
          socket.send(JSON.stringify({ type: 'transfer_call', reason: 'ai_decision' }))
        }

        // Log conversation for analytics (async) with enhanced metadata
        Promise.all([
          supabaseClient.from('conversation_logs').insert({
            call_id: callId,
            speaker: 'user',
            message: transcript,
            sentiment: response.sentiment,
            emotion: response.emotion,
            intent: response.intent,
            timestamp: new Date().toISOString(),
            metadata: { 
              confidence: response.confidence,
              conversation_count: conversationCount,
              transcript_length: transcript.length
            }
          }),
          supabaseClient.from('conversation_logs').insert({
            call_id: callId,
            speaker: 'assistant',
            message: response.text,
            sentiment: 'neutral',
            emotion: 'neutral',
            intent: response.intent,
            timestamp: new Date().toISOString(),
            metadata: { 
              confidence: response.confidence,
              conversation_count: conversationCount,
              response_length: response.text.length
            }
          })
        ]).catch(e => log('⚠️ Analytics logging failed:', e))

      } catch (error) {
        log('❌ Error processing conversation:', error)
        const fallbackResponse = "I'm having a moment of difficulty processing that. Could you repeat what you said?"
        sendTTSMessage(fallbackResponse)
        
        // Log the error for debugging
        socket.send(JSON.stringify({
          type: 'processing_error',
          error: error.message,
          timestamp: Date.now()
        }))
      }
    }

    // NEW: WebSocket keepalive mechanism
    const startKeepAlive = () => {
      keepAliveInterval = setInterval(() => {
        try {
          if (deepgramSTT?.readyState === WebSocket.OPEN) {
            deepgramSTT.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          if (deepgramTTS?.readyState === WebSocket.OPEN) {
            deepgramTTS.send(JSON.stringify({ type: 'KeepAlive' }))
          }
          log('💓 KeepAlive sent to Deepgram WebSockets')
        } catch (error) {
          log('❌ KeepAlive error:', error)
        }
      }, 3000) // Every 3 seconds
    }

    const cleanup = () => {
      isCallActive = false
      ttsInitialized = false
      firstMessageSent = false
      processingTranscript = false
      speechDetected = false
      interimTranscriptBuffer = ''
      
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
      log('🧹 Cleanup completed')
    }

    // WebSocket event handlers with enhanced logging
    socket.onopen = () => {
      log('🔌 SignalWire WebSocket connected')
      isCallActive = true
      
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
          first_message: assistant.first_message,
          voice_id: assistant.voice_id,
          model: assistant.model
        },
        timestamp: Date.now(),
      }))
      
      log('📡 Connection established message sent')
    }

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        // Enhanced message logging
        log('📨 Received SignalWire message:', { 
          event: msg.event || msg.type,
          hasPayload: !!msg.media?.payload,
          streamSid: msg.streamSid 
        })
        
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
              try {
                // Convert base64 audio to binary and send to DeepGram STT
                const binaryAudio = Uint8Array.from(atob(msg.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(binaryAudio)
                
                // Log audio processing occasionally
                if (Math.random() < 0.001) {
                  log('🎵 Audio chunk processed', { size: binaryAudio.length })
                }
              } catch (error) {
                log('❌ Error processing incoming audio:', error)
              }
            }
            break
            
          case 'stop':
            log('🛑 SignalWire stream stopped')
            isCallActive = false
            signalWireStreamSid = null
            cleanup()
            break
            
          case 'text_input':
            if (msg.text?.trim()) {
              log('💬 Processing text input:', msg.text.substring(0, 50) + '...')
              await processConversation(msg.text)
            }
            break
        }
      } catch (err) {
        log('❌ Error processing SignalWire message:', err)
      }
    }

    socket.onclose = (ev) => {
      log('🔌 SignalWire WebSocket closed:', { code: ev.code, reason: ev.reason })
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
