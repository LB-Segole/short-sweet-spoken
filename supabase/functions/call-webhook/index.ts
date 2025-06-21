
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signalwire-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log('🚀 Call Webhook Function initialized - v4.0 (Fixed JWT and DB issues)')

serve(async (req) => {
  const timestamp = new Date().toISOString()
  
  console.log(`📞 call-webhook invoked: {
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
    // Initialize Supabase client with service role key (no user auth needed for webhooks)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse webhook data from SignalWire
    let webhookData: { [key: string]: string } = {}
    let bodyText = ''
    
    const contentType = req.headers.get('content-type') || ''
    console.log(`📋 Content-Type: ${contentType}`)
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      bodyText = await req.text()
      const formData = new URLSearchParams(bodyText)
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value.toString()
      }
    } else {
      bodyText = await req.text()
      console.log('📝 Raw webhook data:', bodyText)
      // Try to parse as URL-encoded
      const params = new URLSearchParams(bodyText)
      for (const [key, value] of params.entries()) {
        webhookData[key] = value
      }
    }

    console.log('📋 Parsed webhook data:', JSON.stringify(webhookData, null, 2))

    // Extract key fields from SignalWire webhook
    const callSid = webhookData.CallSid || webhookData.SipCallId
    const callStatus = webhookData.CallStatus
    const duration = webhookData.CallDuration
    const from = webhookData.From
    const to = webhookData.To
    const direction = webhookData.Direction
    const hangupBy = webhookData.HangupBy
    const hangupDirection = webhookData.HangupDirection

    console.log(`📊 Key webhook fields: {
  callSid: "${callSid}",
  callStatus: "${callStatus}",
  duration: "${duration}",
  from: "${from?.replace(/\d(?=\d{4})/g, '*') || 'null'}",
  to: "${to?.replace(/\d(?=\d{4})/g, '*') || 'null'}",
  hangupBy: "${hangupBy?.replace(/\d(?=\d{4})/g, '*') || 'null'}"
}`)

    // Always log webhook for debugging
    if (callSid) {
      const { error: logError } = await supabaseClient
        .from('webhook_logs')
        .insert({
          webhook_type: 'signalwire_status',
          call_id: callSid,
          status: callStatus || 'unknown',
          payload: webhookData,
          created_at: new Date().toISOString()
        })

      if (logError) {
        console.error('❌ Failed to log webhook:', logError)
      } else {
        console.log('✅ Webhook logged successfully')
      }
    }

    // Handle different call statuses
    if (callStatus && callSid) {
      console.log(`📊 Processing call status: ${callStatus} for ${callSid}`)
      
      const updateData: any = {
        status: callStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      }

      // Add duration if call completed
      if (duration && !isNaN(parseInt(duration))) {
        updateData.duration = parseInt(duration)
        console.log(`⏱️ Call duration: ${duration} seconds`)
      }

      // Mark call as ended for final statuses
      if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(callStatus.toLowerCase())) {
        updateData.ended_at = new Date().toISOString()
        
        // Calculate cost for completed calls
        if (callStatus.toLowerCase() === 'completed' && duration) {
          const callDuration = parseInt(duration)
          updateData.call_cost = Math.max(0.01, (callDuration / 60) * 0.01)
          console.log(`💰 Calculated call cost: $${updateData.call_cost}`)
        }
      }

      // Update call in database using SignalWire call ID
      const { data: updatedCall, error: updateError } = await supabaseClient
        .from('calls')
        .update(updateData)
        .eq('signalwire_call_id', callSid)
        .select()

      if (updateError) {
        console.error('❌ Failed to update call:', updateError)
      } else if (updatedCall && updatedCall.length > 0) {
        console.log(`✅ Call ${callSid} updated with status: ${callStatus}`)
        console.log(`📞 Updated call record:`, updatedCall[0])
      } else {
        console.log(`⚠️ No call found with SignalWire ID: ${callSid}`)
      }
    }

    // Log call status analysis
    console.log('=== CALL STATUS ANALYSIS ===')
    switch (callStatus?.toLowerCase()) {
      case 'initiated':
      case 'queued':
        console.log(`📞 Call ${callStatus} - call is being processed`)
        break
        
      case 'ringing':
        console.log('📞 Call is ringing - successfully reached the recipient')
        break
        
      case 'answered':
      case 'in-progress':
        console.log('✅ Call answered and in progress')
        break
        
      case 'completed':
        console.log('🏁 Call completed successfully')
        if (duration) {
          console.log(`📊 Total call duration: ${duration} seconds`)
        }
        break
        
      case 'busy':
        console.log('📵 Call was busy - recipient phone is busy')
        break
        
      case 'no-answer':
        console.log('📵 No answer from recipient')
        break
        
      case 'failed':
        console.log('❌ Call failed')
        break
        
      case 'canceled':
        console.log('🚫 Call was canceled')
        break
        
      default:
        console.log(`ℹ️ Call status: ${callStatus || 'unknown'}`)
    }

    // ALWAYS return 200 OK to SignalWire to prevent "unsuccessful callback" logs
    console.log('✅ Returning 200 OK to SignalWire')
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed successfully',
      callSid: callSid,
      status: callStatus,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('💥 Webhook error:', error)
    console.error('Stack trace:', error.stack)
    
    // Still return 200 OK to prevent SignalWire from marking as failed
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
