
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json', // FIXED: Always include JSON content type
}

console.log('🤖 Agent Management Function initialized v4.0 - Enhanced Authentication & Logging')

serve(async (req) => {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const pathParts = path.split('/').filter(Boolean)

  console.log('📍 Request details:', {
    method,
    pathname: path,
    pathParts,
    headers: Object.fromEntries(req.headers.entries()),
  })

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error' 
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate user
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization required' 
        }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Attempting to authenticate user with token length:', token.length)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid authentication' 
        }),
        { status: 401, headers: corsHeaders }
      )
    }

    console.log('✅ User authenticated:', user.id)

    // Route handling
    if (pathParts[0] === 'agents' || pathParts.length === 0) {
      if (method === 'GET') {
        // Fetch all agents for the user
        console.log('📋 Fetching agents for user:', user.id)
        
        const { data: agents, error } = await supabase
          .from('voice_agents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('❌ Database error fetching agents:', error)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to fetch agents' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

        console.log('✅ Found agents:', agents?.length || 0)
        return new Response(
          JSON.stringify({ 
            success: true, 
            agents: agents || [] 
          }),
          { headers: corsHeaders }
        )

      } else if (method === 'POST') {
        // Create new agent
        const body = await req.json()
        console.log('📝 Creating new agent:', body.name)

        const agentData = {
          user_id: user.id,
          name: body.name,
          system_prompt: body.system_prompt,
          first_message: body.first_message,
          voice_provider: body.voice_provider || 'deepgram',
          voice_id: body.voice_id,
          model: body.model || 'nova-2',
          temperature: body.temperature || 0.8,
          max_tokens: body.max_tokens || 500,
        }

        const { data: agent, error } = await supabase
          .from('voice_agents')
          .insert([agentData])
          .select()
          .single()

        if (error) {
          console.error('❌ Database error creating agent:', error)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to create agent' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

        console.log('✅ Agent created successfully:', agent.id)
        return new Response(
          JSON.stringify({ 
            success: true, 
            agent 
          }),
          { headers: corsHeaders }
        )

      } else if (method === 'DELETE' && pathParts[1]) {
        // Delete specific agent
        const agentId = pathParts[1]
        console.log('🗑️ Attempting to delete agent:', agentId)

        // First, delete any associated calls to avoid foreign key constraint
        const { error: callsError } = await supabase
          .from('calls')
          .delete()
          .eq('assistant_id', agentId)

        if (callsError) {
          console.log('⚠️ Error deleting associated calls:', callsError.message)
        }

        // Now delete the agent
        const { error } = await supabase
          .from('voice_agents')
          .delete()
          .eq('id', agentId)
          .eq('user_id', user.id)

        if (error) {
          console.error('❌ Database error deleting agent:', error)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to delete agent' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

        console.log('✅ Agent deleted successfully')
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agent deleted successfully' 
          }),
          { headers: corsHeaders }
        )
      }
    }

    // Default 404 response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Endpoint not found' 
      }),
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
