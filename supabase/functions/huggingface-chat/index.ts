
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface HuggingFaceRequest {
  agentId: string;
  message: string;
  conversationHistory?: ChatMessage[];
}

console.log('🤖 Hugging Face Chat Service v3.0 - ChatGPT-4 Integration');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('⚠️ No authorization header, using service role');
    }

    const { agentId, message, conversationHistory = [] }: HuggingFaceRequest = await req.json()

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabaseClient
      .from('voice_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found or access denied')
    }

    console.log('🤖 Processing request for agent:', agent.name);
    console.log('📝 User message:', message.substring(0, 100));

    // Prepare conversation context with better formatting
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt || 'You are a helpful AI assistant. Be conversational, natural, and keep responses concise but engaging. Respond as if you are having a voice conversation.'
      },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      {
        role: 'user',
        content: message
      }
    ]

    // Format conversation for ChatGPT-4 model
    const conversationText = messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`
      if (msg.role === 'user') return `Human: ${msg.content}`
      return `Assistant: ${msg.content}`
    }).join('\n\n')

    const prompt = `${conversationText}\n\nAssistant:`

    console.log('🔄 Calling Hugging Face ChatGPT-4 model...');

    // Get Hugging Face API key
    const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API');
    if (!huggingFaceApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Try ChatGPT-4 model first
    let huggingFaceResponse = await fetch(
      'https://api-inference.huggingface.co/models/OpenAI-ChatGPT/ChatGPT-4-Micro',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: agent.settings?.max_tokens || 200,
            temperature: agent.settings?.temperature || 0.8,
            top_p: 0.9,
            do_sample: true,
            return_full_text: false,
          },
          options: {
            wait_for_model: true,
            use_cache: false,
          }
        }),
      }
    )

    let result;
    let responseText = '';

    if (!huggingFaceResponse.ok) {
      console.log('❌ ChatGPT-4 model failed, trying alternative...');
      
      // Fallback to a more reliable conversational model
      huggingFaceResponse = await fetch(
        'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: message,
            parameters: {
              max_length: agent.settings?.max_tokens || 200,
              temperature: agent.settings?.temperature || 0.8,
              pad_token_id: 50256,
              do_sample: true,
            },
            options: {
              wait_for_model: true,
            }
          }),
        }
      );

      if (huggingFaceResponse.ok) {
        result = await huggingFaceResponse.json();
        if (Array.isArray(result) && result[0]?.generated_text) {
          responseText = result[0].generated_text;
          // Clean up DialoGPT response
          responseText = responseText.replace(message, '').trim();
        }
      }
    } else {
      result = await huggingFaceResponse.json();
      console.log('📨 Raw ChatGPT-4 response:', result);

      if (Array.isArray(result) && result.length > 0) {
        responseText = result[0].generated_text || result[0].text || '';
      } else if (result.generated_text) {
        responseText = result.generated_text;
      }
    }

    // Final fallback to ensure we always have a response
    if (!responseText || responseText.length < 3) {
      console.log('🔄 Using fallback to Zephyr model...');
      
      const fallbackResponse = await fetch(
        'https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: `<|system|>\n${agent.system_prompt || 'You are a helpful AI assistant.'}\n<|user|>\n${message}\n<|assistant|>\n`,
            parameters: {
              max_new_tokens: agent.settings?.max_tokens || 150,
              temperature: agent.settings?.temperature || 0.7,
              do_sample: true,
              top_p: 0.9,
              return_full_text: false,
            },
            options: {
              wait_for_model: true,
            }
          }),
        }
      );

      if (fallbackResponse.ok) {
        const fallbackResult = await fallbackResponse.json();
        if (Array.isArray(fallbackResult) && fallbackResult[0]?.generated_text) {
          responseText = fallbackResult[0].generated_text;
        }
      }
    }

    // Clean up the response
    responseText = responseText
      .replace(prompt, '') // Remove the input prompt
      .replace(/^(Assistant:|Human:|System:)\s*/i, '') // Remove role prefixes
      .replace(/<\|.*?\|>/g, '') // Remove special tokens
      .trim()

    // Ensure we have a meaningful response
    if (!responseText || responseText.length < 3) {
      responseText = "I understand what you're saying. Could you tell me more about that so I can help you better?";
    }

    // Make response more conversational for voice
    if (responseText.length > 250) {
      const sentences = responseText.split(/[.!?]+/);
      responseText = sentences.slice(0, 2).join('. ') + '.';
    }

    console.log('✅ Final AI response:', responseText);

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        agent: {
          id: agent.id,
          name: agent.name,
          voice_model: agent.voice_model
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Hugging Face chat error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
