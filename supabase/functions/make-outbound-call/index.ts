import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

console.log('🚀 Edge Function initialized - make-outbound-call v25.0 (Fixed StatusCallbackEvent format)');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Helper function to format phone number to E.164
const formatToE164 = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with country code and has correct length
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // If it's a 10-digit US number, add country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it's longer, assume it already has country code
  if (digits.length > 10) {
    return `+${digits}`;
  }
  
  // If it's shorter, it's probably invalid
  throw new Error(`Invalid phone number format: ${phoneNumber}`);
};

serve(async (req) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  
  console.log(`📞 make-outbound-call invoked: {
  method: "${method}",
  url: "${url}",
  timestamp: "${timestamp}",
  headers: ${JSON.stringify(Object.fromEntries(req.headers.entries()))}
}`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request - returning 200');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (method !== 'POST') {
    console.log(`❌ Method not allowed: ${method}. Only POST is supported.`);
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      message: `Expected POST, got ${method}`,
      timestamp
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID');
    const signalwireToken = Deno.env.get('SIGNALWIRE_TOKEN');
    const signalwireSpace = Deno.env.get('SIGNALWIRE_SPACE_URL');
    const signalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER');

    console.log(`🔧 Environment Check: {
  supabaseUrl: "${supabaseUrl ? 'Present' : 'MISSING'}",
  serviceKey: "${supabaseServiceKey ? 'Present' : 'MISSING'}",
  signalwireProjectId: "${signalwireProjectId ? 'Present' : 'MISSING'}",
  signalwireToken: "${signalwireToken ? 'Present' : 'MISSING'}",
  signalwireSpace: "${signalwireSpace ? 'Present' : 'MISSING'}",
  signalwirePhone: "${signalwirePhoneNumber ? 'Present' : 'MISSING'}"
}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('❌ Missing Supabase configuration');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        message: 'Missing Supabase configuration',
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!signalwireProjectId || !signalwireToken || !signalwireSpace || !signalwirePhoneNumber) {
      console.log('❌ Missing SignalWire configuration');
      return new Response(JSON.stringify({ 
        error: 'SignalWire configuration incomplete',
        message: 'Missing required SignalWire environment variables',
        missing: [
          !signalwireProjectId && 'SIGNALWIRE_PROJECT_ID',
          !signalwireToken && 'SIGNALWIRE_TOKEN', 
          !signalwireSpace && 'SIGNALWIRE_SPACE_URL',
          !signalwirePhoneNumber && 'SIGNALWIRE_PHONE_NUMBER'
        ].filter(Boolean),
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Format SignalWire phone number to E.164
    let formattedFromNumber;
    try {
      formattedFromNumber = formatToE164(signalwirePhoneNumber);
      console.log(`📞 Formatted SignalWire phone number: ${signalwirePhoneNumber} → ${formattedFromNumber}`);
    } catch (error) {
      console.log(`❌ Invalid SignalWire phone number format: ${signalwirePhoneNumber}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid SignalWire phone number configuration',
        message: `SignalWire phone number must be in valid format, got: ${signalwirePhoneNumber}`,
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    console.log(`🔐 Auth header: ${authHeader ? 'Present' : 'MISSING'}`);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return new Response(JSON.stringify({ 
        error: 'Missing or invalid authorization header',
        message: 'Please provide a valid Bearer token',
        timestamp
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log(`❌ Authentication failed: ${authError?.message || 'No user found'}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid authentication token',
        message: authError?.message || 'Authentication failed',
        timestamp
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ User authenticated: ${user.id} (${user.email})`);

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log(`📋 Request body text: ${bodyText}`);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.log(`❌ Failed to parse request body: ${parseError}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        message: parseError.message,
        timestamp
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { phoneNumber, assistantId, campaignId, contactId } = requestBody;
    
    console.log(`📋 Request parsed: {
  phoneNumber: "${phoneNumber ? phoneNumber.substring(0, 6) + '***' : 'MISSING'}",
  assistantId: "${assistantId || 'MISSING'}",
  campaignId: "${campaignId || 'null'}",
  contactId: "${contactId || 'null'}"
}`);
    
    if (!phoneNumber || !assistantId) {
      console.log('❌ Missing required fields in request');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        message: 'phoneNumber and assistantId are required',
        received: { phoneNumber: !!phoneNumber, assistantId: !!assistantId },
        timestamp
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate and format the destination phone number
    let formattedToNumber;
    try {
      formattedToNumber = formatToE164(phoneNumber);
      console.log(`📞 Formatted destination phone number: ${phoneNumber} → ${formattedToNumber}`);
    } catch (error) {
      console.log(`❌ Invalid destination phone number format: ${phoneNumber}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid phone number format',
        message: `Phone number must be in valid format, got: ${phoneNumber}`,
        timestamp
      }), {
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
      return new Response(JSON.stringify({ 
        error: 'Assistant not found or access denied',
        message: assistantError?.message || 'Assistant not found',
        timestamp
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Assistant loaded: ${assistant.name} (ID: ${assistant.id})`);

    // Generate unique call ID
    const callId = crypto.randomUUID();
    console.log(`🆔 Generated call ID: ${callId}`);

    // Construct URLs with proper domain
    const statusCallback = `${supabaseUrl}/functions/v1/call-webhook`;
    const websocketUrl = `wss://${supabaseUrl.replace('https://', '')}/functions/v1/voice-websocket?callId=${encodeURIComponent(callId)}&assistantId=${encodeURIComponent(assistantId)}&userId=${encodeURIComponent(user.id)}`;

    console.log(`🌐 URLs configured: {
  statusCallback: "${statusCallback}",
  websocketUrl: "${websocketUrl.substring(0, 80)}..."
}`);

    // Generate LaML with proper XML encoding for all content
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
    const escapedWebsocketUrl = escapeXml(websocketUrl);

    // Simplified LaML that focuses on making the call work
    const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${escapedGreeting}</Say>
  <Pause length="1"/>
  <Gather input="speech" timeout="10" action="${escapeXml(statusCallback)}" method="POST">
    <Say voice="alice">Please say something to continue our conversation.</Say>
  </Gather>
  <Say voice="alice">Thank you for your time. Goodbye!</Say>
</Response>`;

    console.log('📄 LaML generated successfully');
    console.log(`📄 LaML content: ${laml}`);

    // Make API call to SignalWire with corrected StatusCallbackEvent format
    const signalwireUrl = `https://${signalwireSpace}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`;
    
    const formData = new URLSearchParams({
      To: formattedToNumber,
      From: formattedFromNumber,
      Twiml: laml,
      StatusCallback: statusCallback,
      StatusCallbackMethod: 'POST',
      StatusCallbackEvent: 'initiated ringing answered completed'
    });

    console.log(`📡 Making SignalWire API call: {
  url: "${signalwireUrl}",
  to: "${formattedToNumber}",
  from: "${formattedFromNumber}"
}`);

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
        status: response.status,
        message: 'Failed to initiate call via SignalWire',
        timestamp
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const callData = await response.json();
    console.log(`✅ Call initiated successfully: ${callData.sid}`);

    // Store call record in database with status 'calling' instead of 'initiated'
    const { error: dbError } = await supabase
      .from('calls')
      .insert({
        id: callId,
        user_id: user.id,
        signalwire_call_id: callData.sid,
        assistant_id: assistantId,
        campaign_id: campaignId || null,
        contact_id: contactId || null,
        phone_number: formattedToNumber,
        status: 'calling', // Changed from 'initiated' to 'calling' to avoid constraint issues
        created_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Don't fail the call for DB issues, just log
    } else {
      console.log('✅ Call record stored in database');
    }

    const successResponse = { 
      success: true, 
      callSid: callData.sid,
      callId: callId,
      message: 'Call initiated successfully',
      timestamp
    };

    console.log(`✅ Returning success response: ${JSON.stringify(successResponse)}`);

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Function error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack,
      timestamp
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
