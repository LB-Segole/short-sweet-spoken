
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
  console.log('🚀 make-outbound-call function invoked', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request')
    return new Response(null, { headers: corsHeaders })
  }

  let requestBody: CallRequest
  try {
    requestBody = await req.json()
    console.log('📋 Request body parsed:', requestBody)
  } catch (error) {
    console.error('❌ Failed to parse request body:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request body - must be valid JSON'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { phoneNumber, assistantId, campaignId, contactId, squadId } = requestBody

    console.log('📞 Making outbound call to:', phoneNumber)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ No authorization header provided')
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('🔐 Attempting to verify user token')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      throw new Error('Invalid authentication')
    }

    console.log('✅ User authenticated:', user.id)

    // Get assistant details if provided
    let assistant = null
    if (assistantId) {
      console.log('🔍 Fetching assistant details for:', assistantId)
      const { data: assistantData, error: assistantError } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single()

      if (assistantError) {
        console.error('⚠️ Assistant fetch error:', assistantError)
      } else {
        assistant = assistantData
        console.log('✅ Assistant loaded for call:', assistant.name)
      }
    }

    // Create call record in database first
    console.log('📝 Creating call record in database')
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
      console.error('❌ Failed to create call record:', callError)
      throw new Error(`Failed to create call record: ${callError.message}`)
    }

    console.log('✅ Call record created:', callData.id)

    // Get SignalWire credentials
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')
    const webhookBaseUrl = Deno.env.get('SUPABASE_URL')

    console.log('🔧 SignalWire configuration check:', {
      projectIdExists: !!signalwireProjectId,
      tokenExists: !!signalwireApiToken,
      spaceUrlExists: !!signalwireSpaceUrl,
      phoneNumberExists: !!signalwirePhoneNumber,
      webhookBaseUrlExists: !!webhookBaseUrl
    })

    if (!signalwireProjectId || !signalwireApiToken || !signalwireSpaceUrl) {
      console.error('❌ SignalWire credentials missing')
      throw new Error('SignalWire credentials not configured')
    }

    // Use default phone number if not set
    const fromNumber = signalwirePhoneNumber || '+12345678901'
    console.log('📱 Using phone number:', fromNumber)

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

    // Construct correct SignalWire API URL
    const signalwireUrl = `https://${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`
    
    console.log('🔗 SignalWire API URL:', signalwireUrl)

    // FIXED: Use individual parameters instead of combined string
    const callParams = new URLSearchParams({
      To: phoneNumber,
      From: fromNumber,
      Twiml: twiml,
      StatusCallback: statusCallbackUrl,
      StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(','),
      StatusCallbackMethod: 'POST',
      Timeout: '120',
      Record: 'true',
      RecordingStatusCallback: statusCallbackUrl,
      RecordingChannels: 'dual',
      RecordingStatusCallbackEvent: 'completed',
      MachineDetection: 'Enable',
      MachineDetectionTimeout: '5'
    })

    console.log('📞 Making SignalWire API call with params:', Object.fromEntries(callParams.entries()))

    const signalwireResponse = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireApiToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callParams
    })

    console.log('📡 SignalWire response status:', signalwireResponse.status)
    console.log('📡 SignalWire response headers:', Object.fromEntries(signalwireResponse.headers.entries()))

    if (!signalwireResponse.ok) {
      const errorText = await signalwireResponse.text()
      console.error('❌ SignalWire API error:', {
        status: signalwireResponse.status,
        statusText: signalwireResponse.statusText,
        body: errorText
      })
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
      console.error('⚠️ Failed to update call with SignalWire SID:', updateError)
    } else {
      console.log('✅ Call record updated with SignalWire SID')
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

    console.log('✅ Call initiated successfully, returning response')

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
    console.error('❌ Critical error in make-outbound-call:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Check function logs for more information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
