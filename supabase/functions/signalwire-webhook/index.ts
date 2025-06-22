
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const agentId = url.searchParams.get('agentId')
    
    // Parse SignalWire webhook data
    const formData = await req.formData()
    const callSid = formData.get('CallSid')
    const callStatus = formData.get('CallStatus')
    const from = formData.get('From')
    const to = formData.get('To')
    const callDuration = formData.get('CallDuration')

    console.log('SignalWire webhook received:', {
      agentId,
      callSid,
      callStatus,
      from,
      to,
      callDuration
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Update call session status
    if (callSid) {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: callStatus?.toLowerCase() || 'unknown',
          duration_seconds: callDuration ? parseInt(callDuration as string) : null,
          ended_at: ['completed', 'failed', 'busy', 'no-answer'].includes(callStatus?.toLowerCase() || '') 
            ? new Date().toISOString() 
            : null
        })
        .eq('metadata->signalwire_call_sid', callSid)
    }

    // Return appropriate SWML based on call status
    switch (callStatus) {
      case 'ringing':
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Call is ringing -->
</Response>`, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
        })

      case 'in-progress':
        // Get agent configuration for initial greeting
        let greeting = 'Hello! You are connected to your AI assistant.'
        
        if (agentId) {
          try {
            const { data: agent } = await supabase
              .from('voice_agents')
              .select('name, description')
              .eq('id', agentId)
              .single()
            
            if (agent) {
              greeting = `Hello! You are connected to ${agent.name}. ${agent.description || 'How can I help you today?'}`
            }
          } catch (error) {
            console.error('Error fetching agent:', error)
          }
        }

        const streamUrl = `wss://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/deepgram-voice-agent?agentId=${agentId}`
        
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${greeting}</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
        })

      case 'completed':
      case 'failed':
      case 'busy':
      case 'no-answer':
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <!-- Call ended -->
</Response>`, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
        })

      default:
        return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. This call will now end.</Say>
  <Hangup/>
</Response>`, {
          headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
        })
    }

  } catch (error) {
    console.error('SignalWire webhook error:', error)
    
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I'm sorry, there was a technical error. Please try calling back later.</Say>
  <Hangup/>
</Response>`, {
      headers: { ...corsHeaders, 'Content-Type': 'application/xml' }
    })
  }
})
