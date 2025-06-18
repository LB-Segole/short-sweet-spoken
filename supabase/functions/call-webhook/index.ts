import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const formData = await req.formData()
    const webhookData: { [key: string]: string } = {}
    
    for (const [key, value] of formData.entries()) {
      webhookData[key] = value.toString()
    }

    console.log('Webhook received:', webhookData)

    const callSid = webhookData.CallSid
    const callStatus = webhookData.CallStatus
    const duration = webhookData.CallDuration
    const recordingUrl = webhookData.RecordingUrl

    if (!callSid) {
      throw new Error('No CallSid in webhook data')
    }

    // Log webhook event
    await supabaseClient
      .from('webhook_logs')
      .insert({
        call_id: callSid,
        event_type: callStatus || 'unknown',
        event_data: webhookData
      })

    // Update call status in database
    if (callStatus) {
      const updateData: any = {
        status: callStatus,
        updated_at: new Date().toISOString()
      }

      if (duration) {
        updateData.duration = parseInt(duration)
      }

      if (recordingUrl) {
        updateData.recording_url = recordingUrl
      }

      if (callStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
        // Calculate call cost (example: $0.01 per minute)
        const callDuration = parseInt(duration || '0')
        updateData.call_cost = Math.max(0.01, (callDuration / 60) * 0.01)
      }

      const { error: updateError } = await supabaseClient
        .from('calls')
        .update(updateData)
        .eq('signalwire_call_id', callSid)

      if (updateError) {
        console.error('Failed to update call status:', updateError)
      }
    }

    // Return TwiML response for ongoing call control
    let twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    if (callStatus === 'ringing') {
      // Call is ringing, no action needed
      twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    } else if (callStatus === 'answered') {
      // Call was answered, continue with existing stream
      twimlResponse = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
    }

    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
        status: 200,
      }
    )
  }
})
