
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

console.log('🤖 Hugging Face Chat Service v2.0 - Real AI Integration');

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
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.log('⚠️ Using service role for internal function call');
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

    // Prepare conversation context
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt || 'You are a helpful AI assistant. Be conversational, natural, and keep responses concise but engaging.'
      },
      ...conversationHistory.slice(-8), // Keep last 8 messages for context
      {
        role: 'user',
        content: message
      }
    ]

    // Format messages for Hugging Face Chat API
    const conversationText = messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`
      if (msg.role === 'user') return `User: ${msg.content}`
      return `Assistant: ${msg.content}`
    }).join('\n')

    const prompt = `${conversationText}\nAssistant:`

    console.log('🔄 Calling Hugging Face API...');

    // Get Hugging Face API key
    const huggingFaceApiKey = Deno.env.get('HUGGING_FACE_API');
    if (!huggingFaceApiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Use a more reliable chat model - Microsoft DialoGPT or similar
    // Note: The model "OpenAI-ChatGPT/ChatGPT-4-Micro" may not exist on Hugging Face
    // Using a working conversational model instead
    const huggingFaceResponse = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: agent.settings?.max_tokens || 150,
            temperature: agent.settings?.temperature || 0.8,
            return_full_text: false,
            do_sample: true,
            top_p: 0.9,
          },
          options: {
            wait_for_model: true,
            use_cache: false,
          }
        }),
      }
    )

    if (!huggingFaceResponse.ok) {
      const errorText = await huggingFaceResponse.text()
      console.error('❌ Hugging Face API error:', errorText)
      
      // Try alternative model if primary fails
      console.log('🔄 Trying alternative model...');
      
      const alternativeResponse = await fetch(
        'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${huggingFaceApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: message,
            parameters: {
              max_length: agent.settings?.max_tokens || 150,
              temperature: agent.settings?.temperature || 0.8,
            },
            options: {
              wait_for_model: true,
            }
          }),
        }
      );

      if (alternativeResponse.ok) {
        const altResult = await alternativeResponse.json();
        const responseText = altResult[0]?.generated_text || altResult.generated_text || '';
        
        if (responseText) {
          console.log('✅ Alternative model response:', responseText.substring(0, 50));
          
          return new Response(
            JSON.stringify({
              success: true,
              response: responseText.trim(),
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
          );
        }
      }
      
      throw new Error(`Hugging Face API error: ${huggingFaceResponse.status}`)
    }

    const result = await huggingFaceResponse.json()
    console.log('📨 Raw Hugging Face response:', result)

    let responseText = ''
    
    if (Array.isArray(result) && result.length > 0) {
      responseText = result[0].generated_text || result[0].text || ''
    } else if (result.generated_text) {
      responseText = result.generated_text
    } else if (typeof result === 'string') {
      responseText = result
    }

    // Clean up the response - remove the input prompt if it's included
    responseText = responseText
      .replace(prompt, '') // Remove the input prompt
      .replace(/^Assistant:\s*/i, '') // Remove "Assistant:" prefix
      .replace(/^User:\s*/i, '') // Remove "User:" prefix
      .replace(/^System:\s*/i, '') // Remove "System:" prefix
      .trim()

    // Fallback response if empty or too short
    if (!responseText || responseText.length < 3) {
      responseText = "I understand what you're saying. Could you tell me more about that so I can help you better?"
    }

    // Ensure response is conversational and natural
    if (responseText.length > 200) {
      responseText = responseText.substring(0, 200).split('.')[0] + '.';
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
