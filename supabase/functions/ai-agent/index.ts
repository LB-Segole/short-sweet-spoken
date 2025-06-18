import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIAgentRequest {
  callId: string;
  userMessage: string;
  audioData?: string;
  scriptId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { callId, userMessage, audioData, scriptId }: AIAgentRequest = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get call script if provided
    let script = null;
    if (scriptId) {
      const { data: scriptData } = await supabase
        .from('scripts')
        .select('content, instructions')
        .eq('id', scriptId)
        .single();
      script = scriptData;
    }

    // Get conversation history
    const { data: conversationHistory } = await supabase
      .from('call_logs')
      .select('message, speaker, created_at')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Build conversation context
    const conversationContext = conversationHistory?.map(log => 
      `${log.speaker}: ${log.message}`
    ).join('\n') || '';

    // Process user input with OpenAI
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an AI sales agent for First Choice LLC. ${script?.instructions || 'Be helpful and professional.'}
            
            Script context: ${script?.content || 'No specific script provided.'}
            
            Instructions:
            - Keep responses conversational and natural
            - Ask engaging questions to qualify leads
            - Be enthusiastic about First Choice LLC services
            - If user seems interested, guide them toward scheduling a consultation
            - Keep responses under 50 words for phone conversations
            - Use the conversation history to maintain context
            
            Conversation History:
            ${conversationContext}
            `
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const aiResponse = await openaiResponse.json();
    const responseText = aiResponse.choices[0]?.message?.content || 'I apologize, I didn\'t catch that. Could you repeat?';

    // Convert text to speech using ElevenLabs
    const audioResponse = await generateSpeech(responseText);

    // Log the conversation
    await Promise.all([
      // Log user message
      supabase.from('call_logs').insert({
        call_id: callId,
        message: userMessage,
        speaker: 'user',
        log_type: 'transcription'
      }),
      // Log AI response
      supabase.from('call_logs').insert({
        call_id: callId,
        message: responseText,
        speaker: 'ai',
        log_type: 'ai_response'
      })
    ]);

    // Update call status
    await supabase
      .from('calls')
      .update({ 
        status: 'in-progress',
        last_activity: new Date().toISOString()
      })
      .eq('id', callId);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        audioData: audioResponse,
        callId: callId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AI Agent error:', error);
    
    // Return fallback response
    const fallbackResponse = "I'm having some technical difficulties. Let me transfer you to a human agent.";
    const fallbackAudio = await generateSpeech(fallbackResponse);

    return new Response(
      JSON.stringify({
        success: false,
        response: fallbackResponse,
        audioData: fallbackAudio,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateSpeech(text: string): Promise<string> {
  try {
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const voiceId = Deno.env.get('ELEVENLABS_VOICE_ID') || 'pNInz6obpgDQGcFmaJgB'; // Default voice

    if (!elevenLabsApiKey) {
      console.warn('ElevenLabs API key not configured, returning empty audio');
      return '';
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsApiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    return audioBase64;

  } catch (error) {
    console.error('Speech generation error:', error);
    return '';
  }
}