
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
    const { assistantId, phoneNumber, userId } = await req.json()
    
    if (!assistantId || !phoneNumber) {
      throw new Error('Assistant ID and phone number are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get assistant configuration (updated from voice_agents to assistants)
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (assistantError || !assistant) {
      throw new Error('Assistant not found')
    }

    // SignalWire configuration
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN')
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')

    if (!signalwireSpaceUrl || !signalwireProjectId || !signalwireToken || !signalwirePhoneNumber) {
      throw new Error('SignalWire configuration missing')
    }

    // Create SWML for the call with assistant integration
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/signalwire-webhook`
    const streamUrl = `wss://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/deepgram-voice-agent?assistantId=${assistantId}`

    // Use assistant's first message or a default greeting
    const greeting = assistant.first_message || `Hello! This is ${assistant.name}, an AI assistant. How can I help you today?`

    const swml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${greeting}</Say>
  <Connect>
    <Stream url="${streamUrl}" />
  </Connect>
</Response>`

    // Make the outbound call
    const callResponse = await fetch(`https://${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phoneNumber,
        From: signalwirePhoneNumber,
        Twiml: swml,
        StatusCallback: `${webhookUrl}?assistantId=${assistantId}`,
        StatusCallbackMethod: 'POST'
      })
    })

    if (!callResponse.ok) {
      const error = await callResponse.text()
      throw new Error(`SignalWire API error: ${callResponse.status} ${error}`)
    }

    const callData = await callResponse.json()

    // Create call session record
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .insert({
        assistant_id: assistantId, // Updated field name
        user_id: userId,
        session_type: 'outbound',
        phone_number: phoneNumber,
        status: 'active',
        metadata: {
          signalwire_call_sid: callData.sid,
          assistant_name: assistant.name,
          assistant_model: assistant.model,
          voice_id: assistant.voice_id
        }
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating call session:', sessionError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        call_sid: callData.sid,
        session_id: session?.id,
        assistant_name: assistant.name,
        phone_number: phoneNumber,
        message: `Call initiated with ${assistant.name} using Hugging Face model: ${assistant.model}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Outbound call error:', error)
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
