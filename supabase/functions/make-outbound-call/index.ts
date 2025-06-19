
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('🚀 Edge Function initialized - make-outbound-call v17.0 (CORS Fixed)');

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

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`❌ Method not allowed: ${req.method}`);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    console.log(`🔐 Auth header present: ${!!authHeader}`);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log(`🔧 Supabase URL: ${supabaseUrl ? 'Present' : 'Missing'}`);
    console.log(`🔧 Service Key: ${supabaseServiceKey ? 'Present' : 'Missing'}`);
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log(`❌ Authentication failed: ${authError?.message || 'No user'}`);
      return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ User authenticated: ${user.id}`);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.log(`❌ Failed to parse request body: ${parseError}`);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { phoneNumber, assistantId, campaignId, contactId } = requestBody;
    
    console.log(`📋 Request parsed: {
  phoneNumber: "${phoneNumber ? phoneNumber.substring(0, 6) + '***' : 'Missing'}",
  assistantId: "${assistantId || 'Missing'}"
}`);
    
    if (!phoneNumber || !assistantId) {
      console.log('❌ Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields: phoneNumber, assistantId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .eq('user_id', user.id)
      .single();

    if (assistantError || !assistant) {
      console.log(`❌ Assistant not found: ${assistantError?.message || 'Not found'}`);
      return new Response(JSON.stringify({ error: 'Assistant not found or access denied' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Assistant loaded: ${assistant.name}`);

    // Generate unique call ID
    const callId = crypto.randomUUID();

    // SignalWire API credentials check
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID');
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN');
    const signalwireSpace = Deno.env.get('SIGNALWIRE_SPACE');
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER');

    console.log(`🔧 SignalWire Config: {
  projectId: "${signalwireProjectId ? 'Present' : 'Missing'}",
  token: "${signalwireToken ? 'Present' : 'Missing'}",
  space: "${signalwireSpace ? 'Present' : 'Missing'}",
  phoneNumber: "${signalwirePhoneNumber ? 'Present' : 'Missing'}"
}`);

    if (!signalwireProjectId || !signalwireToken || !signalwireSpace || !signalwirePhoneNumber) {
      console.log('❌ SignalWire configuration incomplete');
      return new Response(JSON.stringify({ error: 'SignalWire configuration incomplete' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Construct URLs
    const statusCallback = `${supabaseUrl}/functions/v1/call-webhook`;
    const websocketUrl = `wss://${supabaseUrl.replace('https://', '')}/functions/v1/deepgram-voice-websocket?callId=${encodeURIComponent(callId)}&assistantId=${encodeURIComponent(assistantId)}&userId=${encodeURIComponent(user.id)}`;

    // Generate LaML
    const firstMessage = assistant.first_message || 'Hello! How can I help you today?';
    
    const escapeXml = (text: string): string => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const escapedGreeting = escapeXml(firstMessage);

    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapedGreeting}</Say>
  <Connect>
    <Stream url="${websocketUrl}" />
  </Connect>
</Response>`;

    console.log('📄 LaML generated successfully');

    // Make API call to SignalWire
    const signalwireUrl = `https://${signalwireSpace}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`;
    
    const formData = new URLSearchParams({
      To: phoneNumber,
      From: signalwirePhoneNumber,
      Twiml: laml,
      StatusCallback: statusCallback,
      StatusCallbackMethod: 'POST'
    });

    console.log(`📡 Making SignalWire API call to: ${signalwireUrl}`);

    const response = await fetch(signalwireUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${signalwireProjectId}:${signalwireToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    console.log(`📊 SignalWire Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`❌ SignalWire API error: ${response.status} - ${errorBody}`);
      
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
        phone_number: phoneNumber,
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
      status: 200,
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
