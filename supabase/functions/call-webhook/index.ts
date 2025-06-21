
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  console.log(`🔄 Webhook received: ${req.method} ${req.url}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // SignalWire webhook endpoints must NOT require authentication
  // The webhook comes from SignalWire's servers, not from authenticated users
  console.log('📞 Processing SignalWire webhook - no auth required')

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse form data from SignalWire webhook
    let webhookData: { [key: string]: string } = {}
    
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      for (const [key, value] of formData.entries()) {
        webhookData[key] = value.toString()
      }
    } else if (contentType.includes('application/json')) {
      webhookData = await req.json()
    } else {
      console.log('⚠️ Unexpected content type:', contentType)
      const text = await req.text()
      console.log('📝 Raw webhook data:', text)
    }

    console.log('📋 Webhook data received:', JSON.stringify(webhookData, null, 2))

    const callSid = webhookData.CallSid
    const callStatus = webhookData.CallStatus
    const duration = webhookData.CallDuration
    const recordingUrl = webhookData.RecordingUrl
    const from = webhookData.From
    const to = webhookData.To

    if (!callSid) {
      console.log('❌ No CallSid in webhook data')
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        status: 200,
      })
    }

    // Log webhook event for debugging
    await supabaseClient
      .from('webhook_logs')
      .insert({
        call_id: callSid,
        event_type: callStatus || 'unknown',
        event_data: webhookData
      })
      .then(({ error }) => {
        if (error) console.error('Failed to log webhook:', error)
        else console.log('✅ Webhook logged successfully')
      })

    // Update call status in database
    if (callStatus) {
      const updateData: any = {
        status: callStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      }

      // Add additional data based on call status
      if (duration) {
        updateData.duration = parseInt(duration)
      }

      if (recordingUrl) {
        updateData.recording_url = recordingUrl
      }

      if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy' || callStatus === 'no-answer') {
        updateData.completed_at = new Date().toISOString()
        updateData.ended_at = new Date().toISOString()
        
        // Calculate call cost for completed calls
        if (callStatus === 'completed' && duration) {
          const callDuration = parseInt(duration)
          updateData.call_cost = Math.max(0.01, (callDuration / 60) * 0.01)
        }
      }

      console.log(`📊 Updating call ${callSid} with status: ${callStatus}`)

      const { error: updateError } = await supabaseClient
        .from('calls')
        .update(updateData)
        .eq('signalwire_call_id', callSid)

      if (updateError) {
        console.error('❌ Failed to update call status:', updateError)
      } else {
        console.log('✅ Call status updated successfully')
      }
    }

    // Return appropriate TwiML response based on call status
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    switch (callStatus) {
      case 'ringing':
        console.log('📞 Call is ringing')
        twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        break
        
      case 'answered':
        console.log('✅ Call was answered')
        twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! This is your AI assistant. How can I help you today?</Say>
  <Pause length="1"/>
</Response>`
        break
        
      case 'completed':
        console.log('🏁 Call completed')
        break
        
      case 'failed':
      case 'busy':
      case 'no-answer':
        console.log(`❌ Call ${callStatus}`)
        break
        
      default:
        console.log(`ℹ️ Call status: ${callStatus}`)
    }

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
      status: 200,
    })

  } catch (error) {
    console.error('💥 Webhook error:', error)
    console.error('Stack trace:', error.stack)
    
    // Always return a valid TwiML response, even on error
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        status: 200, // Always return 200 for webhook endpoints
      }
    )
  }
})
