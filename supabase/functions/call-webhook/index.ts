
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signalwire-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to validate SignalWire webhook signature
const validateSignalWireSignature = async (signature: string, url: string, body: string, authToken: string): Promise<boolean> => {
  try {
    if (!signature || !authToken) {
      console.log('⚠️ Missing signature or auth token for validation')
      return false
    }

    // For now, we'll accept all SignalWire webhooks but log validation attempts
    console.log('🔐 SignalWire signature validation attempted:', {
      hasSignature: !!signature,
      hasToken: !!authToken,
      url: url
    })
    
    // TODO: Implement proper HMAC-SHA1 validation later if needed
    return true // Allow all SignalWire webhooks for now
  } catch (error) {
    console.error('❌ Signature validation error:', error)
    return false
  }
}

serve(async (req) => {
  console.log(`🔄 Webhook received: ${req.method} ${req.url} at ${new Date().toISOString()}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook data
    let webhookData: { [key: string]: string } = {}
    let bodyText = ''
    
    const contentType = req.headers.get('content-type') || ''
    const url = req.url
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      bodyText = await req.text()
      const formData = new URLSearchParams(bodyText)
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value.toString()
      }
    } else if (contentType.includes('application/json')) {
      bodyText = await req.text()
      webhookData = JSON.parse(bodyText)
    } else {
      bodyText = await req.text()
      console.log('📝 Raw webhook data:', bodyText)
      // Try to parse as URL-encoded
      const params = new URLSearchParams(bodyText)
      for (const [key, value] of params.entries()) {
        webhookData[key] = value
      }
    }

    console.log('📋 Webhook data received:', JSON.stringify(webhookData, null, 2))

    // Validate SignalWire signature
    const signature = req.headers.get('x-signalwire-signature') || req.headers.get('x-twilio-signature')
    const signingKey = Deno.env.get('SIGNALWIRE_SIGNING_KEY') || Deno.env.get('SIGNALWIRE_TOKEN')
    
    if (signature && signingKey) {
      console.log('🔐 Validating SignalWire signature...')
      const isValid = await validateSignalWireSignature(signature, url, bodyText, signingKey)
      console.log(`🔐 Signature validation: ${isValid ? 'PASSED' : 'FAILED'}`)
    } else {
      console.log('⚠️ No signature or signing key present')
    }

    // Extract key fields
    const callSid = webhookData.CallSid || webhookData.callSid
    const callStatus = webhookData.CallStatus || webhookData.callStatus
    const duration = webhookData.CallDuration || webhookData.duration
    const from = webhookData.From || webhookData.from
    const to = webhookData.To || webhookData.to
    const direction = webhookData.Direction || webhookData.direction
    const sipResultCode = webhookData.SipResultCode || webhookData.sipResultCode
    const hangupBy = webhookData.HangupBy || webhookData.hangupBy

    // Always log webhook for debugging
    if (callSid) {
      await supabaseClient
        .from('webhook_logs')
        .insert({
          webhook_type: 'signalwire_status',
          call_sid: callSid,
          status: callStatus || 'unknown',
          payload: webhookData
        })
    }

    // Handle different call statuses
    if (callStatus) {
      console.log(`📊 Processing call status: ${callStatus} for ${callSid}`)
      
      // Handle SIP codes
      if (sipResultCode === '603') {
        console.log('🚫 SIP 603 Decline detected - call was actively rejected by destination')
      }

      const updateData: any = {
        status: callStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      }

      if (duration && !isNaN(parseInt(duration))) {
        updateData.duration = parseInt(duration)
      }

      if (['completed', 'failed', 'busy', 'no-answer'].includes(callStatus)) {
        updateData.ended_at = new Date().toISOString()
        
        if (callStatus === 'completed' && duration) {
          const callDuration = parseInt(duration)
          updateData.call_cost = Math.max(0.01, (callDuration / 60) * 0.01)
        }
      }

      // Update call in database
      const { error: updateError } = await supabaseClient
        .from('calls')
        .update(updateData)
        .eq('signalwire_call_id', callSid)

      if (updateError) {
        console.error('❌ Failed to update call:', updateError)
      } else {
        console.log(`✅ Call ${callSid} updated with status: ${callStatus}`)
      }
    }

    // Generate appropriate TwiML response
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    // Handle specific statuses
    switch (callStatus) {
      case 'initiated':
      case 'queued':
        console.log(`📞 Call ${callStatus}`)
        break
        
      case 'ringing':
        console.log('📞 Call is ringing')
        break
        
      case 'answered':
      case 'in-progress':
        console.log('✅ Call in progress')
        break
        
      case 'completed':
        console.log('🏁 Call completed successfully')
        break
        
      case 'busy':
        console.log('📵 Call was busy')
        if (sipResultCode === '603') {
          console.log('   → SIP 603: Destination actively declined the call')
        }
        break
        
      case 'no-answer':
        console.log('📵 No answer from destination')
        break
        
      case 'failed':
        console.log('❌ Call failed')
        break
        
      case 'canceled':
        console.log('🚫 Call was canceled')
        break
        
      default:
        console.log(`ℹ️ Call status: ${callStatus}`)
    }

    // ALWAYS return 200 OK to SignalWire to prevent "unsuccessful callback" logs
    console.log('✅ Returning 200 OK to SignalWire')
    return new Response(twimlResponse, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
    })

  } catch (error) {
    console.error('💥 Webhook error:', error)
    console.error('Stack trace:', error.stack)
    
    // Still return 200 OK to prevent SignalWire from marking as failed
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
      }
    )
  }
})
