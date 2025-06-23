
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
}

console.log('🤖 Agent Management Function initialized v5.0 - Enhanced Error Handling')

serve(async (req) => {
  const url = new URL(req.url)
  const path = url.pathname
  const method = req.method
  const pathParts = path.split('/').filter(Boolean)

  console.log('📍 Request details:', {
    method,
    pathname: path,
    pathParts,
    userAgent: req.headers.get('user-agent'),
  })

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase configuration:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseKey 
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error - missing Supabase credentials' 
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Authenticate user with better error handling
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      console.log('❌ Missing authorization header')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authorization required - please log in' 
        }),
        { status: 401, headers: corsHeaders }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Attempting to authenticate user with token length:', token.length)
    
    let user
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError) {
        console.log('❌ Authentication error:', authError.message)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Authentication failed: ${authError.message}` 
          }),
          { status: 401, headers: corsHeaders }
        )
      }

      if (!authUser) {
        console.log('❌ No user found from token')
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid authentication token' 
          }),
          { status: 401, headers: corsHeaders }
        )
      }

      user = authUser
      console.log('✅ User authenticated:', user.id)
    } catch (authErr) {
      console.error('❌ Authentication exception:', authErr)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication service error' 
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Route handling with comprehensive error handling
    if (pathParts[0] === 'agents' || pathParts.length === 0) {
      if (method === 'GET') {
        // Fetch all agents for the user
        console.log('📋 Fetching agents for user:', user.id)
        
        try {
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
                error: `Failed to fetch agents: ${error.message}` 
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
        } catch (dbErr) {
          console.error('❌ Database exception:', dbErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database service error' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

      } else if (method === 'POST') {
        // Create new agent
        let body
        try {
          body = await req.json()
          console.log('📝 Creating new agent:', body.name)
        } catch (parseErr) {
          console.error('❌ JSON parse error:', parseErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid JSON in request body' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        // Validate required fields
        if (!body.name || !body.system_prompt) {
          console.error('❌ Missing required fields:', { name: !!body.name, system_prompt: !!body.system_prompt })
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Missing required fields: name and system_prompt are required' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        const agentData = {
          user_id: user.id,
          name: body.name,
          system_prompt: body.system_prompt,
          first_message: body.first_message || '',
          voice_provider: body.voice_provider || 'deepgram',
          voice_id: body.voice_id || '',
          model: body.model || 'nova-2',
          temperature: Number(body.temperature) || 0.8,
          max_tokens: Number(body.max_tokens) || 500,
        }

        try {
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
                error: `Failed to create agent: ${error.message}` 
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
        } catch (dbErr) {
          console.error('❌ Database exception:', dbErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database service error' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

      } else if (method === 'PUT') {
        // Update agent
        let body
        try {
          body = await req.json()
          console.log('📝 Updating agent:', body.id)
        } catch (parseErr) {
          console.error('❌ JSON parse error:', parseErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid JSON in request body' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        if (!body.id) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Agent ID is required for updates' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        const updateData = {
          name: body.name,
          system_prompt: body.system_prompt,
          first_message: body.first_message || '',
          voice_provider: body.voice_provider || 'deepgram',
          voice_id: body.voice_id || '',
          model: body.model || 'nova-2',
          temperature: Number(body.temperature) || 0.8,
          max_tokens: Number(body.max_tokens) || 500,
          updated_at: new Date().toISOString(),
        }

        try {
          const { data: agent, error } = await supabase
            .from('voice_agents')
            .update(updateData)
            .eq('id', body.id)
            .eq('user_id', user.id)
            .select()
            .single()

          if (error) {
            console.error('❌ Database error updating agent:', error)
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to update agent: ${error.message}` 
              }),
              { status: 500, headers: corsHeaders }
            )
          }

          console.log('✅ Agent updated successfully:', agent.id)
          return new Response(
            JSON.stringify({ 
              success: true, 
              agent 
            }),
            { headers: corsHeaders }
          )
        } catch (dbErr) {
          console.error('❌ Database exception:', dbErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database service error' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }

      } else if (method === 'DELETE' && pathParts[1]) {
        // Delete specific agent
        const agentId = pathParts[1]
        console.log('🗑️ Attempting to delete agent:', agentId)

        try {
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
                error: `Failed to delete agent: ${error.message}` 
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
        } catch (dbErr) {
          console.error('❌ Database exception:', dbErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database service error' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }
      } else if (method === 'DELETE') {
        // Handle DELETE with body instead of URL param
        let body
        try {
          body = await req.json()
          console.log('🗑️ Attempting to delete agent from body:', body.id)
        } catch (parseErr) {
          console.error('❌ JSON parse error:', parseErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Invalid JSON in request body' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        if (!body.id) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Agent ID is required for deletion' 
            }),
            { status: 400, headers: corsHeaders }
          )
        }

        try {
          // First, delete any associated calls to avoid foreign key constraint
          const { error: callsError } = await supabase
            .from('calls')
            .delete()
            .eq('assistant_id', body.id)

          if (callsError) {
            console.log('⚠️ Error deleting associated calls:', callsError.message)
          }

          // Now delete the agent
          const { error } = await supabase
            .from('voice_agents')
            .delete()
            .eq('id', body.id)
            .eq('user_id', user.id)

          if (error) {
            console.error('❌ Database error deleting agent:', error)
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: `Failed to delete agent: ${error.message}` 
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
        } catch (dbErr) {
          console.error('❌ Database exception:', dbErr)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Database service error' 
            }),
            { status: 500, headers: corsHeaders }
          )
        }
      }
    }

    // Default 404 response
    console.log('❌ Endpoint not found:', { method, path })
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Endpoint not found: ${method} ${path}` 
      }),
      { status: 404, headers: corsHeaders }
    )

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Internal server error: ${error.message}` 
      }),
      { status: 500, headers: corsHeaders }
    )
  }
})
