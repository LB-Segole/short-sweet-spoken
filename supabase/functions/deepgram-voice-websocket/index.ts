// deno-lint-ignore-file
// This file is intended for Deno Deploy Edge Functions. Deno.env.get and remote imports are valid in this context.
// If your editor or linter flags errors for Deno or remote imports, you can safely ignore them for Supabase Edge Functions.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice WebSocket initialized v5.0 - Enhanced Real-Time Conversation');

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
    let conversationBuffer: Array<{ role: string; content: string }> = []
    let ttsInitialized = false
    let firstMessageSent = false
    let processingTranscript = false // Prevent duplicate processing

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
          log('✅ Assistant loaded', { name: assistant.name, system_prompt: assistant.system_prompt })
        }
      } catch (err) {
        log('⚠️ Error fetching assistant, using default', err)
      }
    }

    if (!assistant) {
      assistant = {
        name: 'AI Assistant',
        first_message: 'Hello! Thank you for taking my call. This is your AI assistant. How can I help you today?',
        system_prompt: 'You are a helpful AI assistant in a phone conversation. Be natural, conversational, and keep responses concise. Respond as if speaking directly to the person.'
      }
    }

    // Enhanced STT with better real-time processing
    const initializeSTT = () => {
      try {
        // Enhanced STT URL with better endpointing and real-time parameters
        const sttUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=200&utterance_end_ms=800&vad_events=true&punctuate=true&diarize=false'
        deepgramSTT = new WebSocket(sttUrl, ['token', deepgramApiKey])

        deepgramSTT.onopen = () => {
          log('✅ DeepGram STT connected with enhanced real-time processing')
        }

        deepgramSTT.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data)
            
            // Handle transcription results
            if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
              const transcript = data.channel.alternatives[0].transcript.trim()
              const isFinal = data.is_final || false
              const confidence = data.channel.alternatives[0].confidence || 1.0
              
              if (transcript && transcript.length > 2) { // Filter out very short utterances
                log('📝 STT transcript:', { transcript, isFinal, confidence: confidence.toFixed(2) })
                
                socket.send(JSON.stringify({
                  type: 'transcript',
                  text: transcript,
                  confidence,
                  isFinal,
                  timestamp: Date.now()
                }))

                // Process final transcripts for AI response
                if (isFinal && !processingTranscript && transcript.length > 5) {
                  processingTranscript = true
                  log('🎯 Processing final transcript for AI response:', transcript)
                  setTimeout(async () => {
                    await processConversation(transcript)
                    processingTranscript = false
                  }, 100) // Small delay to ensure clean processing
                }
              }
            }
            
            // Handle utterance end events for better turn detection
            if (data.type === 'UtteranceEnd') {
              log('🔚 Utterance ended - user finished speaking')
            }

            // Handle VAD events
            if (data.type === 'SpeechStarted') {
              log('🎤 User started speaking')
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

    // Enhanced TTS with better audio quality
    const initializeTTS = () => {
      try {
        // Using linear16 with WAV container for better audio quality
        const ttsUrl = 'wss://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=linear16&sample_rate=8000&container=wav'
        deepgramTTS = new WebSocket(ttsUrl, ['token', deepgramApiKey])

        deepgramTTS.onopen = () => {
          log('✅ DeepGram TTS connected with enhanced audio quality')
          ttsInitialized = true
          
          // Clear any existing buffers and send first message
          if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN) {
            deepgramTTS.send(JSON.stringify({ type: 'Flush' }))
            log('🧹 TTS buffer flushed for clean start')
            
            // Send first message after brief delay
            setTimeout(() => {
              if (assistant.first_message && !firstMessageSent) {
                sendTTSMessage(assistant.first_message)
                firstMessageSent = true
              }
            }, 200)
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
                if (Math.random() < 0.1) { // Log occasionally
                  log('🔊 Audio sent to SignalWire (quality: WAV/linear16)')
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

    // Enhanced TTS message sending with better buffering
    const sendTTSMessage = (text: string) => {
      if (!text || !text.trim()) return
      
      if (deepgramTTS && deepgramTTS.readyState === WebSocket.OPEN && ttsInitialized) {
        try {
          // Clear previous buffers for clean audio
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

    // Enhanced conversation processing with better real-time handling
    const processConversation = async (transcript: string) => {
      try {
        log('🧠 Processing real-time conversation:', transcript)
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (!openaiApiKey) throw new Error('OPENAI_API_KEY not configured');

        // Add user message to conversation buffer
        conversationBuffer.push({ role: 'user', content: transcript })

        // Generate AI response with real-time optimization
        const response = await generateConversationResponse(transcript, {
          callId,
          agentPrompt: assistant.system_prompt,
          agentPersonality: 'conversational',
          previousMessages: conversationBuffer
        }, openaiApiKey, assistant.instructions || assistant.system_prompt)

        log('🤖 Real-time AI response generated:', response.text.substring(0, 80) + '...')

        // Add AI response to conversation buffer
        conversationBuffer.push({ role: 'assistant', content: response.text })

        // Keep conversation buffer manageable
        if (conversationBuffer.length > 20) {
          conversationBuffer = conversationBuffer.slice(-16)
        }

        // Send response back to client
        socket.send(JSON.stringify({
          type: 'ai_response',
          text: response.text,
          intent: response.intent,
          confidence: response.confidence,
          shouldTransfer: response.shouldTransfer,
          shouldEndCall: response.shouldEndCall,
          sentiment: response.sentiment,
          emotion: response.emotion,
          timestamp: Date.now()
        }))

        // Convert AI response to speech immediately for real-time conversation
        sendTTSMessage(response.text)

        // Handle call actions
        if (response.shouldEndCall) {
          log('📴 Call should end based on AI decision')
          setTimeout(() => {
            socket.send(JSON.stringify({ type: 'end_call', reason: 'ai_decision' }))
          }, 3000)
        } else if (response.shouldTransfer) {
          log('📞 Call should transfer based on AI decision')
          socket.send(JSON.stringify({ type: 'transfer_call', reason: 'ai_decision' }))
        }

        // Log conversation for analytics (async)
        Promise.all([
          supabaseClient.from('conversation_logs').insert({
            call_id: callId,
            speaker: 'user',
            message: transcript,
            sentiment: response.sentiment,
            emotion: response.emotion,
            intent: response.intent,
            timestamp: new Date().toISOString(),
            metadata: { confidence: response.confidence }
          }),
          supabaseClient.from('conversation_logs').insert({
            call_id: callId,
            speaker: 'assistant',
            message: response.text,
            sentiment: 'neutral',
            emotion: 'neutral',
            intent: response.intent,
            timestamp: new Date().toISOString(),
            metadata: { confidence: response.confidence }
          })
        ]).catch(e => log('⚠️ Analytics logging failed:', e))

      } catch (error) {
        log('❌ Error processing conversation:', error)
        const fallbackResponse = "I'm having a moment of difficulty processing that. Could you repeat what you said?"
        sendTTSMessage(fallbackResponse)
      }
    }

    const cleanup = () => {
      isCallActive = false
      ttsInitialized = false
      firstMessageSent = false
      processingTranscript = false
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
        assistant: { 
          name: assistant.name,
          system_prompt: assistant.system_prompt,
          first_message: assistant.first_message
        },
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
              try {
                // Convert base64 audio to binary and send to DeepGram STT
                const binaryAudio = Uint8Array.from(atob(msg.media.payload), c => c.charCodeAt(0))
                deepgramSTT.send(binaryAudio)
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
              await processConversation(msg.text)
            }
            break
        }
      } catch (err) {
        log('❌ Error processing SignalWire message:', err)
      }
    }

    socket.onclose = (ev) => {
      log('🔌 SignalWire WebSocket closed:', ev.code)
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
