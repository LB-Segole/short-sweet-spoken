import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, callId, campaignId, scriptId } = await req.json()

    // Initialize SignalWire client
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwireSpace = Deno.env.get('SIGNALWIRE_SPACE')

    if (!signalwireProjectId || !signalwireToken || !signalwireSpace) {
      throw new Error('SignalWire credentials not configured')
    }

    // Create TwiML for AI agent
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="wss://${req.headers.get('host')}/ws/call/${callId}">
          <Parameter name="callId" value="${callId}" />
          <Parameter name="campaignId" value="${campaignId}" />
          <Parameter name="scriptId" value="${scriptId}" />
        </Stream>
      </Connect>
    </Response>`

    // Make SignalWire API call
    const response = await fetch(`https://${signalwireSpace}.signalwire.com/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: Deno.env.get('SIGNALWIRE_PHONE_NUMBER') || '',
        Twiml: twiml,
        StatusCallback: `https://${req.headers.get('host')}/functions/v1/call-status`,
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
        StatusCallbackMethod: 'POST'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SignalWire API error: ${error}`)
    }

    const callData = await response.json()

    // Update Supabase with call SID
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabase
      .from('calls')
      .update({ 
        signalwire_call_id: callData.sid,
        status: 'connecting'
      })
      .eq('id', callId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        call_sid: callData.sid 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Make call error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})