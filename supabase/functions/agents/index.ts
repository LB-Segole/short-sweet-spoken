
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🤖 Agent Management Function initialized v1.0 - DeepGram Voice Agents');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

interface AgentCreateRequest {
  name: string
  system_prompt: string
  first_message?: string
  voice_id?: string
  model?: string
  temperature?: number
  max_tokens?: number
}

interface AgentUpdateRequest extends Partial<AgentCreateRequest> {
  id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const url = new URL(req.url)
    const agentId = url.pathname.split('/').pop()

    switch (req.method) {
      case 'GET':
        if (agentId && agentId !== 'agents') {
          // Get single agent
          const { data: agent, error } = await supabaseClient
            .from('assistants')
            .select('*')
            .eq('id', agentId)
            .eq('user_id', user.id)
            .single()

          if (error) {
            return new Response(
              JSON.stringify({ success: false, error: 'Agent not found' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
          }

          return new Response(
            JSON.stringify({ success: true, agent }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          // Get all agents for user
          const { data: agents, error } = await supabaseClient
            .from('assistants')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

          if (error) {
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
          }

          return new Response(
            JSON.stringify({ success: true, agents }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

      case 'POST':
        const createData: AgentCreateRequest = await req.json()
        
        // Validate required fields
        if (!createData.name || !createData.system_prompt) {
          return new Response(
            JSON.stringify({ success: false, error: 'Name and system_prompt are required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const { data: newAgent, error: createError } = await supabaseClient
          .from('assistants')
          .insert({
            user_id: user.id,
            name: createData.name,
            system_prompt: createData.system_prompt,
            first_message: createData.first_message || 'Hello! How can I help you today?',
            voice_provider: 'deepgram',
            voice_id: createData.voice_id || 'aura-asteria-en',
            model: createData.model || 'nova-2',
            temperature: createData.temperature || 0.8,
            max_tokens: createData.max_tokens || 500
          })
          .select()
          .single()

        if (createError) {
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        console.log('✅ Agent created:', newAgent.name, 'for user:', user.id)

        return new Response(
          JSON.stringify({ success: true, agent: newAgent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 }
        )

      case 'PUT':
        if (!agentId || agentId === 'agents') {
          return new Response(
            JSON.stringify({ success: false, error: 'Agent ID required for update' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const updateData: AgentUpdateRequest = await req.json()
        delete updateData.id // Don't allow ID updates

        const { data: updatedAgent, error: updateError } = await supabaseClient
          .from('assistants')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          return new Response(
            JSON.stringify({ success: false, error: updateError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        console.log('✅ Agent updated:', updatedAgent.name)

        return new Response(
          JSON.stringify({ success: true, agent: updatedAgent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'DELETE':
        if (!agentId || agentId === 'agents') {
          return new Response(
            JSON.stringify({ success: false, error: 'Agent ID required for deletion' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const { error: deleteError } = await supabaseClient
          .from('assistants')
          .delete()
          .eq('id', agentId)
          .eq('user_id', user.id)

        if (deleteError) {
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        console.log('✅ Agent deleted:', agentId)

        return new Response(
          JSON.stringify({ success: true, message: 'Agent deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Method not allowed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
        )
    }

  } catch (error) {
    console.error('❌ Agent management error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal server error: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
