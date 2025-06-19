
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 Edge Function initialized - make-outbound-call v12.0 (Fixed StatusCallbackEvent)');

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

const formatToE164 = (phoneNumber: string): string => {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }
  
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  return `+${digitsOnly}`;
};

const escapeXmlContent = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
};

// Generate proper TwiML-compatible LaML
const generateSignalWireLaML = (greeting: string, websocketUrl: string): string => {
  const safeGreeting = escapeXmlContent(greeting || 'Hello! You are now connected to your AI assistant.');
  
  // Validate WebSocket URL format
  if (!websocketUrl.startsWith('wss://') && !websocketUrl.startsWith('ws://')) {
    console.error('❌ Invalid WebSocket URL format:', websocketUrl);
    throw new Error('Invalid WebSocket URL format - must start with wss:// or ws://');
  }

  // Generate proper TwiML-compatible LaML structure
  const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${safeGreeting}</Say>
  <Connect>
    <Stream url="${websocketUrl}" />
  </Connect>
</Response>`;

  console.log('📄 Generated TwiML-compatible LaML:', laml);
  
  // Validate LaML structure
  if (!laml.includes('<Response>') || !laml.includes('</Response>')) {
    throw new Error('Invalid LaML structure - missing Response tags');
  }
  
  if (!laml.includes('<Connect>') || !laml.includes('</Connect>')) {
    throw new Error('Invalid LaML structure - missing Connect tags');
  }
  
  if (!laml.includes('<Stream url=')) {
    throw new Error('Invalid LaML structure - missing Stream element');
  }

  return laml;
};

serve(async (req) => {
  console.log('📞 make-outbound-call invoked:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: CallRequest = await req.json();
    console.log('📋 Request parsed:', { 
      phoneNumber: requestBody.phoneNumber?.substring(0, 7) + '***',
      assistantId: requestBody.assistantId 
    });

    // Validate required environment variables
    const requiredEnvVars = [
      'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 
      'SIGNALWIRE_PROJECT_ID', 'SIGNALWIRE_TOKEN', 'SIGNALWIRE_SPACE_URL', 'SIGNALWIRE_PHONE_NUMBER',
      'DEEPGRAM_API_KEY'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        console.error(`❌ Missing required env var: ${envVar}`);
        return new Response(
          JSON.stringify({ success: false, error: `Server configuration error: Missing ${envVar}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { phoneNumber, assistantId, campaignId, contactId, squadId } = requestBody;

    // Validate phone number format
    const formattedNumber = formatToE164(phoneNumber);
    const phoneRegex = /^\+[1-9]\d{10,14}$/;
    if (!phoneRegex.test(formattedNumber)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid phone number format: ${formattedNumber}. Must be E.164 format`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Load assistant configuration
    let assistant = null;
    if (assistantId) {
      const { data: assistantData } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single();

      if (assistantData) {
        assistant = assistantData;
        console.log('✅ Assistant loaded:', assistant.name);
      }
    }

    // Create call record
    const { data: callData, error: callError } = await supabaseClient
      .from('calls')
      .insert({
        phone_number: formattedNumber,
        status: 'pending',
        user_id: user.id,
        assistant_id: assistantId,
        campaign_id: campaignId,
        contact_id: contactId,
        squad_id: squadId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (callError) {
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${callError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get SignalWire configuration
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')!;
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_TOKEN')!;
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')!;
    const rawSignalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')!;
    
    const signalwirePhoneNumber = formatToE164(rawSignalwirePhoneNumber);

    // Construct URLs
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-webhook`;
    
    // Use the voice-websocket endpoint for proper handling
    const wsUrl = `${supabaseUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/functions/v1/voice-websocket?callId=${callData.id}&assistantId=${assistantId || 'demo'}&userId=${user.id}`;

    console.log('🔗 URLs constructed:', {
      statusCallback: statusCallbackUrl,
      websocket: wsUrl
    });

    // Generate TwiML-compatible LaML with proper structure
    const firstMessage = assistant?.first_message || 'Hello! You are now connected to your AI assistant.';
    const laml = generateSignalWireLaML(firstMessage, wsUrl);

    // Make SignalWire API call with proper TwiML - Fixed StatusCallbackEvent format
    const callParams = new URLSearchParams({
      To: formattedNumber,
      From: signalwirePhoneNumber,
      Twiml: laml,
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST'
      // Remove StatusCallbackEvent entirely as it's causing the 422 error
    });

    const signalwireUrl = `https://${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`;

    console.log('📡 Calling SignalWire API with TwiML-compatible LaML (without StatusCallbackEvent):', {
      url: signalwireUrl,
      to: formattedNumber,
      from: signalwirePhoneNumber,
      lamlLength: laml.length
    });

    const signalwireResponse = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireApiToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: callParams
    });

    if (!signalwireResponse.ok) {
      const errorText = await signalwireResponse.text();
      console.error('❌ SignalWire API error:', {
        status: signalwireResponse.status,
        statusText: signalwireResponse.statusText,
        error: errorText
      });
      
      await supabaseClient
        .from('calls')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', callData.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `SignalWire API error: ${signalwireResponse.status} - ${errorText}`,
          details: { status: signalwireResponse.status, body: errorText }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const signalwireData = await signalwireResponse.json();
    console.log('✅ SignalWire call created successfully:', signalwireData.sid);

    // Update call record
    await supabaseClient
      .from('calls')
      .update({
        signalwire_call_id: signalwireData.sid,
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', callData.id);

    return new Response(
      JSON.stringify({
        success: true,
        callId: signalwireData.sid,
        dbCallId: callData.id,
        status: 'calling',
        message: 'Call initiated successfully without StatusCallbackEvent',
        websocketUrl: wsUrl,
        provider: 'deepgram',
        assistant: assistant ? {
          name: assistant.name,
          prompt: assistant.system_prompt,
          voice_provider: 'deepgram'
        } : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Critical error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal server error: ${error.message}`,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
