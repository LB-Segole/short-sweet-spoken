
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CallRequest {
  phoneNumber: string
  assistantId?: string
  campaignId?: string
  contactId?: string
  squadId?: string
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

    const { phoneNumber, assistantId, campaignId, contactId, squadId }: CallRequest = await req.json()

    console.log('📞 Making outbound call to:', phoneNumber)

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

    // Get assistant details if provided
    let assistant = null
    if (assistantId) {
      const { data: assistantData, error: assistantError } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single()

      if (assistantError) {
        console.error('Assistant fetch error:', assistantError)
      } else {
        assistant = assistantData
        console.log('✅ Assistant loaded for call:', assistant.name)
      }
    }

    // Create call record in database first
    const { data: callData, error: callError } = await supabaseClient
      .from('calls')
      .insert({
        phone_number: phoneNumber,
        status: 'pending',
        user_id: user.id,
        assistant_id: assistantId,
        campaign_id: campaignId,
        contact_id: contactId,
        squad_id: squadId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (callError) {
      throw new Error(`Failed to create call record: ${callError.message}`)
    }

    console.log('📝 Call record created:', callData.id)

    // Get SignalWire credentials
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')
    const webhookBaseUrl = Deno.env.get('SUPABASE_URL')

    if (!signalwireProjectId || !signalwireApiToken || !signalwireSpaceUrl) {
      console.error('❌ SignalWire credentials missing:', {
        projectId: !!signalwireProjectId,
        token: !!signalwireApiToken,
        spaceUrl: !!signalwireSpaceUrl
      })
      throw new Error('SignalWire credentials not configured. Please check SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, and SIGNALWIRE_SPACE_URL.')
    }

    // Use default phone number if not set
    const fromNumber = signalwirePhoneNumber || '+12345678901'

    // Create webhook URLs
    const statusCallbackUrl = `${webhookBaseUrl}/functions/v1/call-webhook`
    
    // Prepare TwiML for the call with proper WebSocket streaming
    const wsUrl = `wss://${webhookBaseUrl.replace('https://', '').replace('http://', '')}/functions/v1/voice-websocket?callId=${callData.id}&assistantId=${assistantId || 'demo'}`
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="callId" value="${callData.id}" />
      <Parameter name="assistantId" value="${assistantId || 'demo'}" />
    </Stream>
  </Connect>
</Response>`

    console.log('📋 TwiML prepared:', twiml)
    console.log('🌐 WebSocket URL:', wsUrl)

    // Make call via SignalWire API using the space URL
    const signalwireUrl = `https://${signalwireProjectId}.${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`
    
    const callParams = new URLSearchParams({
      To: phoneNumber,
      From: fromNumber,
      Twiml: twiml,
      StatusCallback: statusCallbackUrl,
      StatusCallbackEvent: 'initiated,ringing,answered,completed',
      StatusCallbackMethod: 'POST',
      Timeout: '120', // 2 minute ring timeout
      Record: 'true',
      RecordingStatusCallback: statusCallbackUrl,
      RecordingChannels: 'dual',
      RecordingStatusCallbackEvent: 'completed',
      MachineDetection: 'Enable',
      MachineDetectionTimeout: '5'
    })

    console.log('🔗 SignalWire URL:', signalwireUrl)
    console.log('📞 Making SignalWire API call...')

    const signalwireResponse = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireApiToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callParams
    })

    if (!signalwireResponse.ok) {
      const errorText = await signalwireResponse.text()
      console.error('❌ SignalWire API error:', errorText)
      throw new Error(`SignalWire API error: ${signalwireResponse.status} - ${errorText}`)
    }

    const signalwireData = await signalwireResponse.json()
    console.log('✅ SignalWire call created:', signalwireData)

    // Update call record with SignalWire call SID
    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        signalwire_call_id: signalwireData.sid,
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', callData.id)

    if (updateError) {
      console.error('Failed to update call with SignalWire SID:', updateError)
    }

    // Log the call initiation
    await supabaseClient
      .from('webhook_logs')
      .insert({
        call_id: callData.id,
        event_type: 'call_initiated',
        event_data: {
          signalwire_sid: signalwireData.sid,
          phone_number: phoneNumber,
          assistant_id: assistantId,
          websocket_url: wsUrl
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        callId: signalwireData.sid,
        dbCallId: callData.id,
        status: 'calling',
        message: 'Call initiated successfully',
        websocketUrl: wsUrl
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error making outbound call:', error)
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
