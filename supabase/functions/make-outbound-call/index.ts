import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log('🚀 Edge Function initialized - make-outbound-call v32.0 (Fixed SignalWire space env var)')

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
    // Environment validation - FIXED: Use SIGNALWIRE_SPACE_URL instead of SIGNALWIRE_SPACE
    const requiredEnvVars = {
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      signalwireProjectId: Deno.env.get('SIGNALWIRE_PROJECT_ID'),
      signalwireToken: Deno.env.get('SIGNALWIRE_TOKEN'),
      signalwireSpace: Deno.env.get('SIGNALWIRE_SPACE_URL'), // FIXED: Use correct env var name
      signalwirePhone: Deno.env.get('SIGNALWIRE_PHONE_NUMBER')
    }

    console.log('🔧 Environment Check: {')
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`  ${key}: "${value ? 'Present' : 'Missing'}"`)
    }
    console.log('}')

    // Validate all required environment variables are present
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars)
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables',
        missingVars: missingVars,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Format SignalWire phone number
    const formatPhoneNumber = (phone: string) => phone.replace(/[^\d+]/g, '')
    const signalwireFromNumber = formatPhoneNumber(requiredEnvVars.signalwirePhone || '')
    console.log(`📞 Formatted SignalWire phone number: ${requiredEnvVars.signalwirePhone} → ${signalwireFromNumber}`)

    // Extract SignalWire space name from URL (e.g., "myspace.signalwire.com" → "myspace")
    let signalwireSpaceName = requiredEnvVars.signalwireSpace || ''
    if (signalwireSpaceName.includes('.signalwire.com')) {
      signalwireSpaceName = signalwireSpaceName.split('.signalwire.com')[0]
      if (signalwireSpaceName.startsWith('https://')) {
        signalwireSpaceName = signalwireSpaceName.replace('https://', '')
      }
    }
    console.log(`🌐 SignalWire space name extracted: ${signalwireSpaceName}`)

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
    const formatPhoneNumber = (phone: string) => phone.replace(/[^\d+]/g, '')
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber)
    console.log(`📞 Formatted destination phone number: ${phoneNumber} → ${formattedPhoneNumber}`)

    if (!formattedPhoneNumber || !assistantId) {
      console.error('❌ Missing required fields')
      return new Response('Missing phoneNumber or assistantId', { status: 400, headers: corsHeaders })
    }

    // Load assistant configuration
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
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

    // Configure URLs
    const signalwireSpaceName = (requiredEnvVars.signalwireSpace || '').replace('https://', '').split('.signalwire.com')[0]
    const baseUrl = `https://${signalwireSpaceName}.signalwire.com`
    const statusCallbackUrl = `https://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/call-webhook`
    const voiceWebSocketUrl = `wss://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/voice-websocket`
    
    console.log(`🌐 URLs configured: {
  baseUrl: "${baseUrl}",
  statusCallback: "${statusCallbackUrl}",
  voiceWebSocketUrl: "${voiceWebSocketUrl}"
}`)

    // Generate proper TwiML
    const twimlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${assistant.first_message || 'Hello! How can I help you today?'}</Say>
  <Pause length="1"/>
  <Connect>
    <Stream url="${voiceWebSocketUrl}" name="voice_stream">
      <Parameter name="callId" value="${callId}"/>
      <Parameter name="assistantId" value="${assistantId}"/>
      <Parameter name="userId" value="${user.id}"/>
    </Stream>
  </Connect>
  <Say voice="alice">I'm having trouble connecting to my conversation system. Please try calling back in a moment.</Say>
  <Hangup/>
</Response>`

    console.log('📄 TwiML generated successfully')

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
      Twiml: twimlContent,
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST',
      StatusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'].join(','),
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

    // Store call in database
    const { error: insertError } = await supabase
      .from('calls')
      .insert({
        call_id: callId,
        user_id: user.id,
        assistant_id: assistantId,
        phone_number: formattedPhoneNumber,
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
      timestamp: new Date().toISOString()
    }

    console.log(`✅ Returning success response`)

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
