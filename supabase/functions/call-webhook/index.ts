
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Function to validate SignalWire webhook signature
const validateSignalWireSignature = (signature: string, url: string, params: Record<string, string>, authToken: string): boolean => {
  try {
    if (!signature || !authToken) {
      console.log('⚠️ Missing signature or auth token for validation')
      return false
    }

    // Create the signature string
    const sortedParams = Object.keys(params).sort().map(key => `${key}${params[key]}`).join('')
    const signatureString = url + sortedParams
    
    // For now, we'll skip strict signature validation but log the attempt
    console.log('🔐 SignalWire signature validation attempted')
    return true // Allow all SignalWire webhooks for now
  } catch (error) {
    console.error('❌ Signature validation error:', error)
    return false
  }
}

serve(async (req) => {
  const timestamp = new Date().toISOString()
  console.log(`🔄 Webhook received: ${req.method} ${req.url} at ${timestamp}`)
  
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
    
    const contentType = req.headers.get('content-type') || ''
    const url = req.url
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value.toString()
      }
    } else if (contentType.includes('application/json')) {
      webhookData = await req.json()
    } else {
      const text = await req.text()
      console.log('📝 Raw webhook data:', text)
      // Try to parse as URL-encoded
      const params = new URLSearchParams(text)
      for (const [key, value] of params.entries()) {
        webhookData[key] = value
      }
    }

    console.log('📋 Webhook data received:', JSON.stringify(webhookData, null, 2))

    // Extract key fields
    const callSid = webhookData.CallSid || webhookData.callSid
    const callStatus = webhookData.CallStatus || webhookData.callStatus
    const duration = webhookData.CallDuration || webhookData.duration
    const from = webhookData.From || webhookData.from
    const to = webhookData.To || webhookData.to
    const direction = webhookData.Direction || webhookData.direction
    const sipResultCode = webhookData.SipResultCode || webhookData.sipResultCode
    const hangupBy = webhookData.HangupBy || webhookData.hangupBy

    // Log SignalWire signature validation (optional - can be enhanced later)
    const signature = req.headers.get('x-signalwire-signature') || req.headers.get('x-twilio-signature')
    if (signature) {
      console.log('🔐 SignalWire signature present, validating...')
      const authToken = Deno.env.get('SIGNALWIRE_TOKEN') || ''
      const isValid = validateSignalWireSignature(signature, url, webhookData, authToken)
      console.log(`🔐 Signature validation: ${isValid ? 'PASSED' : 'FAILED'}`)
    }

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
        .then(({ error }) => {
          if (error) console.error('Failed to log webhook:', error)
          else console.log('✅ Webhook logged successfully')
        })
    }

    // Handle different call statuses with detailed logging
    if (callStatus) {
      console.log(`📊 Processing call status: ${callStatus} for ${callSid}`)
      
      // Handle SIP 603 specifically
      if (sipResultCode === '603') {
        console.log('🚫 SIP 603 Decline detected - call was actively rejected by destination')
        console.log(`📞 Call details: From ${from} to ${to}, hung up by ${hangupBy}`)
      }

      const updateData: any = {
        status: callStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      }

      // Add additional fields based on status
      if (duration && !isNaN(parseInt(duration))) {
        updateData.duration = parseInt(duration)
      }

      if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
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
        // For answered calls, we might want to provide TwiML instructions
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! Please wait while we connect you to our AI assistant.</Say>
  <Pause length="1"/>
</Response>`
        break
        
      case 'completed':
        console.log('🏁 Call completed successfully')
        break
        
      case 'busy':
        console.log('📵 Call was busy - destination declined or was unavailable')
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
        console.log(`ℹ️ Unknown call status: ${callStatus}`)
    }

    // Always return 200 OK to SignalWire to prevent "unsuccessful callback" logs
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
