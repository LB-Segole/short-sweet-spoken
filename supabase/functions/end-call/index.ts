import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EndCallRequest {
  callId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { callId }: EndCallRequest = await req.json()

    if (!callId) {
      throw new Error('Call ID is required')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get SignalWire credentials
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_API_TOKEN')

    if (!signalwireProjectId || !signalwireApiToken) {
      throw new Error('SignalWire credentials not configured')
    }

    // End the call via SignalWire API
    const signalwireUrl = `https://${signalwireProjectId}.signalwire.com/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls/${callId}.json`
    
    const signalwireResponse = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireApiToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Status: 'completed'
      })
    })

    if (!signalwireResponse.ok) {
      const errorText = await signalwireResponse.text()
      console.error('SignalWire end call error:', errorText)
      // Don't throw error, continue with database update
    }

    // Update call status in database
    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('signalwire_call_id', callId)

    if (updateError) {
      console.error('Failed to update call status:', updateError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Call ended successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error ending call:', error)
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
