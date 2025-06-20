import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🤖 Agent Management Function initialized v3.0 - Fixed DELETE with proper foreign key handling');

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
  // No ID needed here as it comes from URL
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
    const pathParts = url.pathname.split('/').filter(part => part.length > 0)
    
    console.log('📍 Request details:', {
      method: req.method,
      pathname: url.pathname,
      pathParts,
      user: user.id
    })

    switch (req.method) {
      case 'GET':
        // Get all agents for user
        const { data: agents, error } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Error fetching agents:', error)
          return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        return new Response(
          JSON.stringify({ success: true, agents }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

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
          console.error('❌ Error creating agent:', createError)
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
        const requestBody = await req.text()
        let updateData: AgentUpdateRequest & { id?: string }
        
        try {
          updateData = JSON.parse(requestBody)
        } catch (error) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        if (!updateData.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Agent ID required for update' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const agentId = updateData.id
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
          console.error('❌ Error updating agent:', updateError)
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
        const deleteBody = await req.text()
        let deleteData: { id: string }
        
        try {
          deleteData = JSON.parse(deleteBody)
        } catch (error) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        if (!deleteData.id) {
          return new Response(
            JSON.stringify({ success: false, error: 'Agent ID required for deletion' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        console.log('🗑️ Attempting to delete agent:', deleteData.id, 'for user:', user.id)

        // First, check if the agent has any associated calls
        const { data: associatedCalls, error: callsCheckError } = await supabaseClient
          .from('calls')
          .select('id, status, created_at')
          .eq('assistant_id', deleteData.id)
          .eq('user_id', user.id)

        if (callsCheckError) {
          console.error('❌ Error checking associated calls:', callsCheckError)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to check associated calls' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        // Check for active calls (calls that are not completed or failed)
        const activeCalls = associatedCalls?.filter(call => 
          !['completed', 'failed', 'busy', 'no-answer'].includes(call.status || '')
        ) || []

        if (activeCalls.length > 0) {
          console.log(`❌ Cannot delete agent with ${activeCalls.length} active calls`)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Cannot delete agent with active calls',
              details: {
                activeCallsCount: activeCalls.length,
                activeCallIds: activeCalls.map(call => call.id),
                message: 'Please wait for all calls to complete before deleting this agent'
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
          )
        }

        // If there are completed calls, we can either:
        // Option 1: Delete associated calls first (cascade delete)
        // Option 2: Set assistant_id to null for existing calls
        // We'll go with Option 2 to preserve call history

        if (associatedCalls && associatedCalls.length > 0) {
          console.log(`📝 Found ${associatedCalls.length} completed calls, updating assistant_id to null`)
          
          const { error: updateCallsError } = await supabaseClient
            .from('calls')
            .update({ assistant_id: null })
            .eq('assistant_id', deleteData.id)
            .eq('user_id', user.id)

          if (updateCallsError) {
            console.error('❌ Error updating associated calls:', updateCallsError)
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to update associated calls' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
          }

          console.log('✅ Updated associated calls to remove assistant reference')
        }

        // Now delete the agent
        const { error: deleteError } = await supabaseClient
          .from('assistants')
          .delete()
          .eq('id', deleteData.id)
          .eq('user_id', user.id)

        if (deleteError) {
          console.error('❌ Error deleting agent:', deleteError)
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        console.log('✅ Agent deleted successfully:', deleteData.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agent deleted successfully',
            details: {
              agentId: deleteData.id,
              associatedCallsUpdated: associatedCalls?.length || 0
            }
          }),
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
