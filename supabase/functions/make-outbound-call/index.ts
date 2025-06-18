
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 Edge Function initialized - make-outbound-call');

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

  // Log environment variables (safely)
  const envVars = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ Set' : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ Set' : '❌ Missing',
    SIGNALWIRE_PROJECT_ID: Deno.env.get('SIGNALWIRE_PROJECT_ID') ? '✅ Set' : '❌ Missing',
    SIGNALWIRE_TOKEN: Deno.env.get('SIGNALWIRE_TOKEN') ? '✅ Set' : '❌ Missing',
    SIGNALWIRE_SPACE_URL: Deno.env.get('SIGNALWIRE_SPACE_URL') ? '✅ Set' : '❌ Missing',
    SIGNALWIRE_PHONE_NUMBER: Deno.env.get('SIGNALWIRE_PHONE_NUMBER') ? '✅ Set' : '❌ Missing'
  };
  console.log('🔧 Environment variables:', envVars);

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'voice-ai-outbound-calls'
        }
      }
    }
  )

  const { phoneNumber, assistantId, campaignId, contactId, squadId } = requestBody

  // Improved phone number validation for E.164 format
  const phoneRegex = /^\+[1-9]\d{10,14}$/
  if (!phoneRegex.test(phoneNumber)) {
    console.error('❌ Invalid phone number format:', phoneNumber, 'Expected E.164 format like +12345678901')
    return new Response(
      JSON.stringify({
        success: false,
        error: `Invalid phone number format: ${phoneNumber}. Must be in E.164 format (e.g., +12037936539)`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  try {
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

    // Check for active calls limit
    const { count: activeCalls } = await supabaseClient
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'calling', 'answered'])

    const MAX_CONCURRENT_CALLS = 5
    if (activeCalls >= MAX_CONCURRENT_CALLS) {
      console.error('❌ User has too many active calls:', activeCalls)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Maximum concurrent calls limit reached (${MAX_CONCURRENT_CALLS})`,
          activeCalls
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      )
    }

    let assistant = null
    if (assistantId) {
      const { data: assistantData, error: assistantError } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single()

      if (!assistantError) assistant = assistantData
      console.log('👤 Assistant loaded:', assistant?.name || 'Default')
    }

    console.log('📝 Creating call record...')
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

    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')

    const webhookBaseUrl = Deno.env.get('SUPABASE_URL')
    if (!webhookBaseUrl || !webhookBaseUrl.startsWith('https://')) {
      throw new Error('Invalid or missing SUPABASE_URL environment variable')
    }

    const baseHost = webhookBaseUrl
      .replace('https://', '')
      .replace('http://', '')
      .replace('supabase.co', '.supabase.co')

    const wsUrl = `wss://${baseHost}/functions/v1/voice-websocket?callId=${callData.id}&assistantId=${assistantId || 'demo'}&userId=${user.id}`

    // Create SWML for SignalWire AI Voice
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Connect>
        <Stream url="${wsUrl}">
          <Parameter name="callId" value="${callData.id}" />
          <Parameter name="assistantId" value="${assistantId || 'demo'}" />
          <Parameter name="userId" value="${user.id}" />
          <Parameter name="authToken" value="${token.substring(0, 32)}" />
        </Stream>
      </Connect>
      <Say voice="alice">${assistant?.first_message || 'Hello! This is your AI assistant. How can I help you today?'}</Say>
    </Response>`

    const statusCallbackUrl = `${webhookBaseUrl}/functions/v1/call-webhook`
    const fromNumber = signalwirePhoneNumber || '+12345678901'

    console.log('📞 Preparing SignalWire call...')
    const callParams = new URLSearchParams({
      To: phoneNumber,
      From: fromNumber,
      Twiml: twiml,
      StatusCallback: statusCallbackUrl,
      'StatusCallbackEvent[]': 'initiated',
      'StatusCallbackEvent[]': 'ringing',
      'StatusCallbackEvent[]': 'answered',
      'StatusCallbackEvent[]': 'completed',
      StatusCallbackMethod: 'POST',
      Timeout: '30',
      Record: 'record-from-answer',
      RecordingStatusCallback: statusCallbackUrl,
      RecordingChannels: 'dual',
      'RecordingStatusCallbackEvent[]': 'completed',
      MachineDetection: 'Enable',
      MachineDetectionTimeout: '5',
      MachineDetectionSpeechThreshold: '2400',
      MachineDetectionSpeechEndThreshold: '1200'
    })

    const signalwireUrl = `https://${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`

    console.log('🔗 Making SignalWire API call to:', signalwireUrl)
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
      console.error('❌ SignalWire API error:', signalwireResponse.status, errorText)
      throw new Error(`SignalWire API error: ${signalwireResponse.status} - ${errorText}`)
    }

    const signalwireData = await signalwireResponse.json()
    console.log('✅ SignalWire call created:', signalwireData.sid)

    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        signalwire_call_id: signalwireData.sid,
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', callData.id)

    if (!updateError) {
      await supabaseClient.from('webhook_logs').insert({
        call_id: callData.id,
        event_type: 'call_initiated',
        event_data: {
          signalwire_sid: signalwireData.sid,
          phone_number: phoneNumber,
          assistant_id: assistantId,
          websocket_url: wsUrl
        }
      })
    }

    console.log('🎉 Call successfully initiated!')
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
        errorCode: error.name,
        context: {
          phoneNumber: phoneNumber?.substring(0, 5) + '***',
          assistantId,
          timestamp: new Date().toISOString(),
          callId: typeof callData !== 'undefined' ? callData.id : null
        },
        details: Deno.env.get('NODE_ENV') === 'development' ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
