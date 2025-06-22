
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
      throw new Error('Invalid authentication')
    }

    const { agentId, message, conversationHistory = [] }: HuggingFaceRequest = await req.json()

    // Fetch agent configuration
    const { data: agent, error: agentError } = await supabaseClient
      .from('voice_agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found or access denied')
    }

    // Prepare conversation context
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: agent.system_prompt
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: 'user',
        content: message
      }
    ]

    // Format messages for Hugging Face Chat API
    const conversationText = messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`
      if (msg.role === 'user') return `Human: ${msg.content}`
      return `Assistant: ${msg.content}`
    }).join('\n')

    const prompt = `${conversationText}\nAssistant:`

    console.log('🤖 Calling Hugging Face API with agent:', agent.name)
    console.log('📝 Prompt preview:', prompt.slice(0, 200) + '...')

    // Call Hugging Face Inference API
    // Using a reliable chat model - you can change this to your preferred model
    const huggingFaceResponse = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('HUGGING_FACE_API')}`,
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
      console.error('Hugging Face API error:', errorText)
      throw new Error(`Hugging Face API error: ${huggingFaceResponse.status}`)
    }

    const result = await huggingFaceResponse.json()
    console.log('✅ Hugging Face response:', result)

    let responseText = ''
    
    if (Array.isArray(result) && result.length > 0) {
      responseText = result[0].generated_text || result[0].text || ''
    } else if (result.generated_text) {
      responseText = result.generated_text
    } else if (typeof result === 'string') {
      responseText = result
    }

    // Clean up the response
    responseText = responseText
      .replace(/^Assistant:\s*/i, '')
      .replace(/^Human:\s*/i, '')
      .replace(/^System:\s*/i, '')
      .trim()

    // Fallback response if empty
    if (!responseText) {
      responseText = "I understand. Could you tell me more about that?"
    }

    console.log('🎯 Final response:', responseText)

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
    console.error('Hugging Face chat error:', error)
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
