
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log('🚀 Edge Function initialized - make-outbound-call v30.0 (Fixed Stream URL)')

serve(async (req) => {
  const timestamp = new Date().toISOString()
  
  console.log(`📞 make-outbound-call invoked: {
  method: "${req.method}",
  url: "${req.url}",
  timestamp: "${timestamp}",
  headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}
}`)

  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request - returning 200')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Environment validation
    const requiredEnvVars = {
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      signalwireProjectId: Deno.env.get('SIGNALWIRE_PROJECT_ID'),
      signalwireToken: Deno.env.get('SIGNALWIRE_TOKEN'),
      signalwireSpace: Deno.env.get('SIGNALWIRE_SPACE'),
      signalwirePhone: Deno.env.get('SIGNALWIRE_PHONE_NUMBER')
    }

    console.log('🔧 Environment Check: {')
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`  ${key}: "${value ? 'Present' : 'Missing'}"`)
    }
    console.log('}')

    // Format SignalWire phone number
    const formatPhoneNumber = (phone: string) => phone.replace(/[^\d+]/g, '')
    const signalwireFromNumber = formatPhoneNumber(requiredEnvVars.signalwirePhone || '')
    console.log(`📞 Formatted SignalWire phone number: ${requiredEnvVars.signalwirePhone} → ${signalwireFromNumber}`)

    // Initialize Supabase client
    const supabase = createClient(
      requiredEnvVars.supabaseUrl!,
      requiredEnvVars.serviceKey!
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')
    console.log(`🔐 Auth header: ${authHeader ? 'Present' : 'Missing'}`)

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    )

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    console.log(`✅ User authenticated: ${user.id} (${user.email})`)

    // Parse request body
    const bodyText = await req.text()
    console.log(`📋 Request body text: ${bodyText}`)

    const { phoneNumber, assistantId, campaignId, contactId } = JSON.parse(bodyText)
    
    console.log(`📋 Request parsed: {
  phoneNumber: "${phoneNumber?.replace(/\d(?=\d{4})/g, '*') || 'Missing'}",
  assistantId: "${assistantId || 'null'}",
  campaignId: "${campaignId || 'null'}",
  contactId: "${contactId || 'null'}"
}`)

    // Format destination phone number
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber)
    console.log(`📞 Formatted destination phone number: ${phoneNumber} → ${formattedPhoneNumber}`)

    if (!formattedPhoneNumber || !assistantId) {
      console.error('❌ Missing required fields')
      return new Response('Missing phoneNumber or assistantId', { status: 400, headers: corsHeaders })
    }

    // Load assistant configuration
    const { data: assistant, error: assistantError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single()

    if (assistantError || !assistant) {
      console.error('❌ Assistant not found:', assistantError)
      return new Response('Assistant not found', { status: 404, headers: corsHeaders })
    }

    console.log(`✅ Assistant loaded: ${assistant.name} (ID: ${assistant.id})`)

    // Generate unique call ID
    const callId = crypto.randomUUID()
    console.log(`🆔 Generated call ID: ${callId}`)

    // Configure URLs - Use FULL wss:// URL for stream
    const baseUrl = `https://${requiredEnvVars.signalwireSpace}.signalwire.com`
    const statusCallbackUrl = `https://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/call-webhook`
    const voiceWebSocketUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/voice-websocket`
    
    console.log(`🌐 URLs configured: {
  statusCallback: "${statusCallbackUrl}",
  voiceWebSocketUrl: "${voiceWebSocketUrl}"
}`)

    // Generate enhanced LaML with proper Stream URL
    const lamlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Initial greeting -->
  <Say voice="alice">${assistant.first_message || 'Hello! How can I help you today?'}</Say>
  <Pause length="1"/>
  
  <!-- Connect to real-time voice websocket for conversation -->
  <Connect>
    <Stream url="${voiceWebSocketUrl}" name="voice_stream">
      <Parameter name="callId" value="${callId}"/>
      <Parameter name="assistantId" value="${assistantId}"/>
      <Parameter name="userId" value="${user.id}"/>
    </Stream>
  </Connect>
  
  <!-- Fallback if connection fails -->
  <Say voice="alice">I'm having trouble connecting to my conversation system. Please try calling back in a moment.</Say>
  <Hangup/>
</Response>`

    console.log('📄 Enhanced LaML generated successfully')
    console.log(`📄 LaML content: ${lamlContent}`)

    // Prepare SignalWire API call
    const signalwireUrl = `${baseUrl}/api/laml/2010-04-01/Accounts/${requiredEnvVars.signalwireProjectId}/Calls.json`
    const credentials = btoa(`${requiredEnvVars.signalwireProjectId}:${requiredEnvVars.signalwireToken}`)

    console.log(`📡 Making SignalWire API call: {
  url: "${signalwireUrl}",
  to: "${formattedPhoneNumber}",
  from: "${signalwireFromNumber}",
  timeout: "30"
}`)

    const callPayload = new URLSearchParams({
      To: formattedPhoneNumber,
      From: signalwireFromNumber,
      Twiml: lamlContent,
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST',
      Timeout: '30',
      MachineDetection: 'Enable',
      MachineDetectionTimeout: '15'
    })

    // Make the call
    const response = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callPayload
    })

    console.log(`📊 SignalWire Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ SignalWire API Error:', errorText)
      return new Response(`SignalWire API Error: ${response.status}`, { status: 500, headers: corsHeaders })
    }

    const callData = await response.json()
    console.log(`✅ Call initiated successfully: ${callData.sid}`)
    console.log(`📞 Call details: ${JSON.stringify(callData, null, 2)}`)

    // Store call in database
    const { error: insertError } = await supabase
      .from('calls')
      .insert({
        call_id: callId,
        user_id: user.id,
        agent_id: assistantId,
        to_number: formattedPhoneNumber,
        from_number: signalwireFromNumber,
        status: 'initiated',
        signalwire_call_id: callData.sid,
        campaign_id: campaignId,
        contact_id: contactId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('❌ Database insert error:', insertError)
    } else {
      console.log('✅ Call record stored in database')
    }

    const successResponse = {
      success: true,
      callSid: callData.sid,
      callId: callId,
      message: 'Call initiated successfully - please check your phone',
      timestamp: new Date().toISOString(),
      callDetails: {
        to: formattedPhoneNumber,
        from: signalwireFromNumber,
        status: callData.status,
        realtimeAudio: true,
        websocketUrl: voiceWebSocketUrl
      }
    }

    console.log(`✅ Returning success response: ${JSON.stringify(successResponse)}`)

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('💥 Critical error:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
