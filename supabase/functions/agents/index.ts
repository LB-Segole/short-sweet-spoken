
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🤖 Agent Management Function initialized v4.0 - Enhanced Authentication & Logging');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log('📍 Request details:', {
    method: req.method,
    pathname: new URL(req.url).pathname,
    pathParts: new URL(req.url).pathname.split('/').filter(Boolean),
    headers: Object.fromEntries(req.headers.entries())
  });

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
      console.log('❌ No authorization header provided')
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Attempting to authenticate user with token length:', token.length)
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      throw new Error('Invalid authentication')
    }

    console.log('✅ User authenticated:', user.id)

    switch (req.method) {
      case 'GET':
        console.log('📋 Fetching agents for user:', user.id)
        const { data: agents, error: fetchError } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.log('❌ Fetch error:', fetchError)
          throw fetchError
        }

        console.log('✅ Found agents:', agents?.length || 0)
        return new Response(
          JSON.stringify({ success: true, agents: agents || [] }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'POST':
        console.log('➕ Creating new agent for user:', user.id)
        const createData = await req.json()
        console.log('📝 Agent data:', createData)
        
        const { data: newAgent, error: createError } = await supabaseClient
          .from('assistants')
          .insert({
            ...createData,
            user_id: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.log('❌ Create error:', createError)
          throw createError
        }

        console.log('✅ Agent created successfully:', newAgent.id)
        return new Response(
          JSON.stringify({ success: true, agent: newAgent }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          }
        )

      case 'PUT':
        console.log('✏️ Updating agent for user:', user.id)
        const updateData = await req.json()
        console.log('📝 Update data:', updateData)
        
        // Extract agent ID from request body instead of URL params
        const agentId = updateData.id || updateData.agent_id
        if (!agentId) {
          throw new Error('Agent ID is required for update')
        }

        console.log('🎯 Updating agent:', agentId)
        
        const { data: updatedAgent, error: updateError } = await supabaseClient
          .from('assistants')
          .update({
            name: updateData.name,
            system_prompt: updateData.system_prompt,
            first_message: updateData.first_message,
            voice_provider: updateData.voice_provider || 'deepgram',
            voice_id: updateData.voice_id,
            model: updateData.model,
            temperature: updateData.temperature,
            max_tokens: updateData.max_tokens,
            updated_at: new Date().toISOString()
          })
          .eq('id', agentId)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          console.log('❌ Update error:', updateError)
          throw updateError
        }

        if (!updatedAgent) {
          throw new Error('Agent not found or not authorized')
        }

        console.log('✅ Agent updated successfully:', updatedAgent.id)
        return new Response(
          JSON.stringify({ success: true, agent: updatedAgent }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'DELETE':
        console.log('🗑️ Deleting agent for user:', user.id)
        const deleteData = await req.json()
        const deleteAgentId = deleteData.id || deleteData.agent_id
        
        if (!deleteAgentId) {
          throw new Error('Agent ID is required for deletion')
        }

        console.log('🗑️ Attempting to delete agent:', deleteAgentId, 'for user:', user.id)

        // Check if agent has active calls first
        const { count: activeCallsCount } = await supabaseClient
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('assistant_id', deleteAgentId)
          .in('status', ['active', 'ringing', 'in-progress'])

        if (activeCallsCount && activeCallsCount > 0) {
          console.log('❌ Cannot delete agent with', activeCallsCount, 'active calls')
          throw new Error(`Cannot delete agent with ${activeCallsCount} active calls`)
        }

        const { error: deleteError } = await supabaseClient
          .from('assistants')
          .delete()
          .eq('id', deleteAgentId)
          .eq('user_id', user.id)

        if (deleteError) {
          console.log('❌ Delete error:', deleteError)
          throw deleteError
        }

        console.log('✅ Agent deleted successfully:', deleteAgentId)
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      default:
        return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

  } catch (error) {
    console.error('❌ Agent API error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
