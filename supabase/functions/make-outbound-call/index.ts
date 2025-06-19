
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('🚀 Edge Function initialized - make-outbound-call v16.0 (Fixed LaML Structure)');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  console.log(`📞 make-outbound-call invoked: {
  method: "${req.method}",
  url: "${req.url}",
  timestamp: "${new Date().toISOString()}"
}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Parse request body
    const { phoneNumber, assistantId, campaignId, contactId } = await req.json();
    
    if (!phoneNumber || !assistantId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: phoneNumber, assistantId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mask phone number for logging (show first 6 digits + ***)
    const maskedPhone = phoneNumber.length > 6 ? 
      phoneNumber.substring(0, 6) + '***' : 
      phoneNumber;

    console.log(`📋 Request parsed: {
  phoneNumber: "${maskedPhone}",
  assistantId: "${assistantId}"
}`);

    // Get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single();

    if (assistantError || !assistant) {
      return new Response(JSON.stringify({ error: 'Assistant not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Assistant loaded: ${assistant.name}`);

    // Generate unique call ID
    const callId = crypto.randomUUID();

    // Construct URLs
    const statusCallback = `${supabaseUrl}/functions/v1/call-webhook`;
    const websocketUrl = `wss://${supabaseUrl.replace('https://', '')}/functions/v1/deepgram-voice-websocket?callId=${encodeURIComponent(callId)}&assistantId=${encodeURIComponent(assistantId)}&userId=${encodeURIComponent(user.id)}`;

    console.log(`🔗 URLs constructed: {
  statusCallback: "${statusCallback}",
  websocket: "${websocketUrl}"
}`);

    // Generate LaML with CORRECT structure for SignalWire
    const firstMessage = assistant.first_message || 'Hello! How can I help you today?';
    
    console.log(`🎯 Generating LaML with: {
  firstMessage: "${firstMessage}",
  wsUrl: "${websocketUrl}",
  assistantName: "${assistant.name}"
}`);

    console.log('🔧 LaML Generation Debug:');
    console.log(`- Input greeting: ${firstMessage}`);
    console.log(`- Input websocketUrl: ${websocketUrl}`);
    
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const escapedGreeting = escapeXml(firstMessage);
    console.log(`- Escaped greeting: ${escapedGreeting}`);

    // FIXED: Use Connect/Stream instead of Start/Stream for SignalWire compatibility
    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapedGreeting}</Say>
  <Connect>
    <Stream url="${websocketUrl}" />
  </Connect>
</Response>`;

    console.log('=====================================');
    console.log('📄 FIXED LaML being generated:');
    console.log('=====================================');
    console.log(laml);
    console.log('=====================================');

    // Validate LaML structure
    console.log('📊 LaML Stats:');
    console.log(`- Length: ${laml.length}`);
    console.log(`- Contains XML declaration: ${laml.includes('<?xml')}`);
    console.log(`- Contains Response tags: ${laml.includes('<Response>') && laml.includes('</Response>')}`);
    console.log(`- Contains Connect tags: ${laml.includes('<Connect>') && laml.includes('</Connect>')}`);
    console.log(`- Contains Stream tag: ${laml.includes('<Stream')}`);
    console.log(`- Contains Say tags: ${laml.includes('<Say')}`);

    if (laml.includes('<Response>') && laml.includes('</Response>') && 
        laml.includes('<Connect>') && laml.includes('<Stream')) {
      console.log('✅ LaML validation passed');
    } else {
      console.error('❌ LaML validation failed');
      return new Response(JSON.stringify({ error: 'Invalid LaML structure generated' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SignalWire API credentials
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID');
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN');
    const signalwireSpace = Deno.env.get('SIGNALWIRE_SPACE');
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER');

    if (!signalwireProjectId || !signalwireToken || !signalwireSpace || !signalwirePhoneNumber) {
      return new Response(JSON.stringify({ error: 'SignalWire configuration incomplete' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Make API call to SignalWire
    const signalwireUrl = `https://${signalwireSpace}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`;
    
    console.log('📡 SignalWire API Call Debug:');
    console.log(`- URL: ${signalwireUrl}`);
    console.log(`- To: ${phoneNumber}`);
    console.log(`- From: ${signalwirePhoneNumber}`);
    console.log(`- LaML length: ${laml.length}`);
    console.log(`- StatusCallback: ${statusCallback}`);

    const formData = new URLSearchParams({
      To: phoneNumber,
      From: signalwirePhoneNumber,
      Twiml: laml,
      StatusCallback: statusCallback,
      StatusCallbackMethod: 'POST'
    });

    const response = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    console.log('📊 SignalWire Response Debug:');
    console.log(`- Status: ${response.status}`);
    console.log(`- Status Text: ${response.statusText}`);
    console.log(`- Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log('❌ SignalWire API error details:');
      console.error(`- Status: ${response.status}`);
      console.error(`- Status Text: ${response.statusText}`);
      console.error(`- Error Body: ${errorBody}`);
      console.error(`- LaML that was sent: ${laml}`);
      
      return new Response(JSON.stringify({ 
        error: 'SignalWire API error', 
        details: errorBody,
        status: response.status 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callData = await response.json();
    console.log(`✅ Call initiated successfully: ${callData.sid}`);

    // Store call record in database
    const { error: dbError } = await supabase
      .from('calls')
      .insert({
        id: callId,
        user_id: user.id,
        external_id: callData.sid,
        assistant_id: assistantId,
        campaign_id: campaignId || null,
        contact_id: contactId || null,
        to_number: phoneNumber,
        from_number: signalwirePhoneNumber,
        status: 'initiated',
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
    } else {
      console.log('✅ Call record stored in database');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      callSid: callData.sid,
      callId: callId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
