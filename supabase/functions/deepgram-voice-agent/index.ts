
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceAgentWebSocketMessage {
  type: string;
  [key: string]: any;
}

serve(async (req) => {
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

  console.log('🎙️ Voice Agent WebSocket server started');

  socket.onopen = () => {
    console.log('✅ WebSocket connection opened');
    isConnected = true;
    
    socket.send(JSON.stringify({
      type: 'connection_established',
      data: { status: 'connected', timestamp: Date.now() }
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message: VoiceAgentWebSocketMessage = JSON.parse(event.data);
      console.log('📨 Received message:', message.type);

      switch (message.type) {
        case 'auth':
          await handleAuth(message);
          break;
          
        case 'start_conversation':
          await handleStartConversation(message);
          break;
          
        case 'audio_data':
          await handleAudioData(message);
          break;
          
        case 'text_input':
          await handleTextInput(message);
          break;
          
        case 'end_conversation':
          await handleEndConversation(message);
          break;
          
        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        data: { error: error.message }
      }));
    }
  };

  socket.onclose = () => {
    console.log('🔌 WebSocket connection closed');
    isConnected = false;
  };

  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
  };

  async function handleAuth(message: VoiceAgentWebSocketMessage) {
    try {
      const { userId, agentId } = message;
      
      // Fetch agent configuration
      const { data: agent, error } = await supabaseClient
        .from('voice_agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', userId)
        .single();

      if (error || !agent) {
        throw new Error('Agent not found or access denied');
      }

      currentAgent = agent;
      conversationHistory = [{
        role: 'system',
        content: agent.system_prompt
      }];

      console.log('🤖 Agent loaded:', agent.name);
      
      socket.send(JSON.stringify({
        type: 'agent_loaded',
        data: {
          agent: {
            id: agent.id,
            name: agent.name,
            voice_model: agent.voice_model
          }
        }
      }));

      // Send initial greeting
      await generateAIResponse("Hello");
      
    } catch (error) {
      console.error('❌ Auth error:', error);
      socket.send(JSON.stringify({
        type: 'auth_error',
        data: { error: error.message }
      }));
    }
  }

  async function handleStartConversation(message: VoiceAgentWebSocketMessage) {
    if (!currentAgent) {
      socket.send(JSON.stringify({
        type: 'error',
        data: { error: 'No agent loaded' }
      }));
      return;
    }

    console.log('🎬 Starting conversation with agent:', currentAgent.name);
    
    socket.send(JSON.stringify({
      type: 'conversation_started',
      data: { 
        agent: currentAgent.name,
        timestamp: Date.now()
      }
    }));
  }

  async function handleAudioData(message: VoiceAgentWebSocketMessage) {
    // Handle audio data for STT
    // This would integrate with Deepgram STT
    console.log('🎤 Received audio data');
    
    // For now, simulate transcription
    socket.send(JSON.stringify({
      type: 'transcript',
      data: {
        text: 'Simulated transcription from audio',
        isFinal: true,
        confidence: 0.9
      }
    }));
  }

  async function handleTextInput(message: VoiceAgentWebSocketMessage) {
    const { text } = message;
    
    if (!currentAgent || !text) {
      return;
    }

    console.log('💬 Processing text input:', text);
    
    // Send transcript event
    socket.send(JSON.stringify({
      type: 'transcript',
      data: {
        text: text,
        isFinal: true,
        confidence: 1.0
      }
    }));

    // Generate AI response
    await generateAIResponse(text);
  }

  async function generateAIResponse(userInput: string) {
    if (!currentAgent) return;

    try {
      console.log('🧠 Generating AI response for:', userInput);

      // Call Hugging Face API
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
            conversationHistory: conversationHistory.slice(-10)
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.response) {
        const aiResponse = data.response;
        
        // Add to conversation history
        conversationHistory.push(
          { role: 'user', content: userInput },
          { role: 'assistant', content: aiResponse }
        );

        console.log('✅ AI Response generated:', aiResponse);

        // Send AI response
        socket.send(JSON.stringify({
          type: 'ai_response',
          data: {
            text: aiResponse,
            timestamp: Date.now(),
            agent: currentAgent.name
          }
        }));

        // Generate TTS audio
        await generateTTSAudio(aiResponse);
        
      } else {
        throw new Error(data.error || 'Failed to generate AI response');
      }
    } catch (error) {
      console.error('❌ AI Response error:', error);
      
      socket.send(JSON.stringify({
        type: 'ai_response',
        data: {
          text: "I apologize, but I'm having trouble processing that. Could you please try again?",
          timestamp: Date.now(),
          agent: currentAgent.name
        }
      }));
    }
  }

  async function generateTTSAudio(text: string) {
    if (!currentAgent) return;

    try {
      console.log('🔊 Generating TTS audio for:', text.slice(0, 50) + '...');

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
            voice: currentAgent.voice_model,
            voice_provider: 'deepgram'
          }),
        }
      );

      const audioData = await response.json();

      if (audioData.success && audioData.audio_base64) {
        console.log('✅ TTS Audio generated');
        
        socket.send(JSON.stringify({
          type: 'audio_response',
          data: {
            audio_base64: audioData.audio_base64,
            voice_model: currentAgent.voice_model,
            text: text
          }
        }));
      } else {
        throw new Error('Failed to generate TTS audio');
      }
    } catch (error) {
      console.error('❌ TTS Error:', error);
    }
  }

  async function handleEndConversation(message: VoiceAgentWebSocketMessage) {
    console.log('🏁 Ending conversation');
    
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
