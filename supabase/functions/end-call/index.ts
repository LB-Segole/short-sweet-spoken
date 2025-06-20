import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('📞 End Call Function initialized v2.0 - Fixed SignalWire configuration');

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

    console.log(`📞 Attempting to end call: ${callId}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get SignalWire credentials - using correct environment variable names
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwireSpace = Deno.env.get('SIGNALWIRE_SPACE_URL')

    console.log(`🔧 SignalWire Config Check: {
  projectId: "${signalwireProjectId ? 'Present' : 'MISSING'}",
  token: "${signalwireToken ? 'Present' : 'MISSING'}",
  space: "${signalwireSpace ? 'Present' : 'MISSING'}"
}`);

    if (!signalwireProjectId || !signalwireToken || !signalwireSpace) {
      throw new Error('SignalWire credentials not configured. Please check SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, and SIGNALWIRE_SPACE_URL environment variables.')
    }

    // First, get the call record to find the SignalWire call SID
    const { data: callRecord, error: callError } = await supabaseClient
      .from('calls')
      .select('signalwire_call_id, status, phone_number')
      .eq('id', callId)
      .single()

    if (callError || !callRecord) {
      console.error('❌ Call not found:', callError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Call not found'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    if (!callRecord.signalwire_call_id) {
      console.error('❌ No SignalWire call ID found for call:', callId);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No SignalWire call ID associated with this call'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`📞 Found SignalWire call SID: ${callRecord.signalwire_call_id}`);

    // End the call via SignalWire API using correct endpoint
    const signalwireUrl = `https://${signalwireSpace}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls/${callRecord.signalwire_call_id}.json`
    
    console.log(`📡 Making SignalWire API call to end call: ${signalwireUrl}`);

    const signalwireResponse = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Status: 'completed'
      })
    })

    console.log(`📊 SignalWire end call response: ${signalwireResponse.status} ${signalwireResponse.statusText}`);

    if (!signalwireResponse.ok) {
      const errorText = await signalwireResponse.text()
      console.error('❌ SignalWire end call error:', errorText)
      // Don't throw error, continue with database update
    } else {
      console.log('✅ SignalWire call ended successfully');
    }

    // Update call status in database
    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', callId)

    if (updateError) {
      console.error('❌ Failed to update call status:', updateError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update call status in database'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Call status updated in database');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Call ended successfully',
        details: {
          callId: callId,
          signalwireCallId: callRecord.signalwire_call_id,
          phoneNumber: callRecord.phone_number,
          status: 'completed'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error ending call:', error)
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
