import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 DeepGram Voice Agent v9.0 - Real AI Assistant Integration');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

interface VoiceAgentWebSocketMessage {
  type: string;
  [key: string]: any;
}

interface HuggingFaceResponse {
  success: boolean;
  response?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const upgrade = req.headers.get("upgrade") || "";
  
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let currentAgent: any = null;
  let conversationHistory: Array<{role: string, content: string}> = [];
  let isConnected = false;
  let sessionId = '';

  const log = (msg: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🎙️ ${msg}`, data || '');
  };

  log('WebSocket connection established');

  socket.onopen = () => {
    log('✅ Client WebSocket connected');
    isConnected = true;
    sessionId = `session-${Date.now()}`;
    
    socket.send(JSON.stringify({
      type: 'connection_established',
      data: { status: 'connected', sessionId, timestamp: Date.now() }
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message: VoiceAgentWebSocketMessage = JSON.parse(event.data);
      log('📨 Received message:', message.type);

      switch (message.type) {
        case 'auth':
          await handleAuth(message);
          break;
          
        case 'start_conversation':
          await handleStartConversation();
          break;
          
        case 'audio_data':
          await handleAudioData(message);
          break;
          
        case 'text_input':
          await handleTextInput(message);
          break;
          
        case 'end_conversation':
          await handleEndConversation();
          break;
          
        default:
          log(`❓ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      log('❌ Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { error: error.message }
      }));
    }
  };

  socket.onclose = () => {
    log('🔌 WebSocket connection closed');
    isConnected = false;
  };

  socket.onerror = (error) => {
    log('❌ WebSocket error:', error);
  };

  async function handleAuth(message: VoiceAgentWebSocketMessage) {
    try {
      const { userId, agentId } = message;
      log('🔐 Authenticating user and loading agent:', { userId, agentId });
      
      // Fetch agent configuration
      const { data: agent, error } = await supabaseClient
        .from('voice_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error || !agent) {
        throw new Error('Agent not found or access denied');
      }

      currentAgent = agent;
      conversationHistory = [{
        role: 'system',
        content: agent.system_prompt || 'You are a helpful AI assistant. Be conversational and natural.'
      }];

      log('🤖 Agent loaded successfully:', {
        name: agent.name,
        voice_model: agent.voice_model
      });
      
      socket.send(JSON.stringify({
        type: 'agent_loaded',
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            voice_model: agent.voice_model,
            system_prompt: agent.system_prompt
          }
        }
      }));
      
    } catch (error) {
      log('❌ Auth error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { error: error.message }
      }));
    }
  }

  async function handleStartConversation() {
    if (!currentAgent) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { error: 'No agent loaded' }
      }));
      return;
    }

    log('🎬 Starting conversation with agent:', currentAgent.name);
    
    socket.send(JSON.stringify({
      type: 'conversation_started',
      data: { 
        agent: currentAgent.name,
        timestamp: Date.now()
      }
    }));

    // Send initial greeting if configured
    if (currentAgent.first_message) {
      await generateAIResponse('Hello');
    }
  }

  async function handleAudioData(message: VoiceAgentWebSocketMessage) {
    try {
      const { audio } = message;
      
      if (!audio) {
        log('⚠️ No audio data received');
        return;
      }

      log('🎤 Processing audio data for transcription');

      // Call Deepgram STT via our transcribe function
      const transcriptionResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: audio,
            format: 'webm'
          }),
        }
      );

      const transcriptionData = await transcriptionResponse.json();

      if (transcriptionData.success && transcriptionData.transcript) {
        const transcript = transcriptionData.transcript.trim();
        
        if (transcript.length > 2) {
          log('📝 Transcription successful:', transcript);
          
          // Send transcript to client
          socket.send(JSON.stringify({
            type: 'transcript',
            data: {
              text: transcript,
              confidence: 0.9,
              timestamp: Date.now()
            }
          }));

          // Process with AI
          await generateAIResponse(transcript);
        }
      } else {
        log('⚠️ Transcription failed or empty');
      }
    } catch (error) {
      log('❌ Audio processing error:', error);
    }
  }

  async function handleTextInput(message: VoiceAgentWebSocketMessage) {
    const { text } = message;
    
    if (!currentAgent || !text) {
      return;
    }

    log('💬 Processing text input:', text);
    
    // Send transcript event for UI
    socket.send(JSON.stringify({
      type: 'transcript',
      data: {
        text: text,
        confidence: 1.0,
        timestamp: Date.now()
      }
    }));

    // Generate AI response
    await generateAIResponse(text);
  }

  async function generateAIResponse(userInput: string) {
    if (!currentAgent) return;

    try {
      log('🧠 Generating AI response for:', userInput.substring(0, 50));

      // Add user message to conversation history
      conversationHistory.push({
        role: 'user',
        content: userInput
      });

      // Call Hugging Face via our edge function
      const aiResponse = await callHuggingFaceAPI(userInput);

      if (aiResponse.success && aiResponse.response) {
        const responseText = aiResponse.response;
        
        // Add AI response to conversation history
        conversationHistory.push({
          role: 'assistant',
          content: responseText
        });

        // Keep conversation history manageable
        if (conversationHistory.length > 20) {
          conversationHistory = [
            conversationHistory[0], // Keep system prompt
            ...conversationHistory.slice(-15) // Keep last 15 messages
          ];
        }

        log('✅ AI Response generated:', responseText.substring(0, 100));

        // Send AI response to client
        socket.send(JSON.stringify({
          type: 'ai_response',
          data: {
            text: responseText,
            timestamp: Date.now(),
            agent: currentAgent.name
          }
        }));

        // Generate TTS audio
        await generateTTSAudio(responseText);
        
      } else {
        throw new Error(aiResponse.error || 'Failed to generate AI response');
      }
    } catch (error) {
      log('❌ AI Response error:', error);
      
      // Send fallback response
      const fallbackResponse = "I apologize, but I'm having trouble processing that. Could you please try again?";
      
      socket.send(JSON.stringify({
        type: 'ai_response',
        data: {
          text: fallbackResponse,
          timestamp: Date.now(),
          agent: currentAgent.name
        }
      }));

      await generateTTSAudio(fallbackResponse);
    }
  }

  async function callHuggingFaceAPI(userInput: string): Promise<HuggingFaceResponse> {
    try {
      // Call our Hugging Face chat function
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/huggingface-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agentId: currentAgent.id,
            message: userInput,
            conversationHistory: conversationHistory.slice(-10) // Send last 10 messages for context
          }),
        }
      );

      const data = await response.json();
      return data;
    } catch (error) {
      log('❌ Hugging Face API error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function generateTTSAudio(text: string) {
    if (!currentAgent) return;

    try {
      log('🔊 Generating TTS for:', text.substring(0, 50));

      // Call Deepgram TTS
      const response = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            voice: currentAgent.voice_model || 'aura-asteria-en',
            voice_provider: 'deepgram'
          }),
        }
      );

      const audioData = await response.json();

      if (audioData.success && audioData.audioContent) {
        log('✅ TTS Audio generated successfully');
        
        socket.send(JSON.stringify({
          type: 'audio_response',
          data: {
            audio_base64: audioData.audioContent,
            voice_model: currentAgent.voice_model,
            text: text
          }
        }));
      } else {
        log('❌ TTS generation failed:', audioData.error);
      }
    } catch (error) {
      log('❌ TTS Error:', error);
    }
  }

  async function handleEndConversation() {
    log('🏁 Ending conversation');
    
    socket.send(JSON.stringify({
      type: 'conversation_ended',
      data: { 
        timestamp: Date.now(),
        message_count: conversationHistory.length
      }
    }));
  }

  return response;
});
