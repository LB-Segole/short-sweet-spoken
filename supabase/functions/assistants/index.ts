import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    switch (req.method) {
      case 'GET':
        const { data: assistants, error: fetchError } = await supabaseClient
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          throw fetchError
        }

        return new Response(
          JSON.stringify(assistants || []),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'POST':
        const createData = await req.json()
        
        const { data: newAssistant, error: createError } = await supabaseClient
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
          throw createError
        }

        return new Response(
          JSON.stringify(newAssistant),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 201,
          }
        )

      case 'PUT':
        const updateData = await req.json()
        const { id, ...updateFields } = updateData
        
        const { data: updatedAssistant, error: updateError } = await supabaseClient
          .from('assistants')
          .update({
            ...updateFields,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        return new Response(
          JSON.stringify(updatedAssistant),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      case 'DELETE':
        const deleteData = await req.json()
        
        const { error: deleteError } = await supabaseClient
          .from('assistants')
          .delete()
          .eq('id', deleteData.id)
          .eq('user_id', user.id)

        if (deleteError) {
          throw deleteError
        }

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )

      default:
        return new Response('Method not allowed', { status: 405 })
    }

  } catch (error) {
    console.error('Assistants API error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
