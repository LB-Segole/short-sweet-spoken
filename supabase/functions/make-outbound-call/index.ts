import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🚀 Edge Function initialized - make-outbound-call v3.3');
console.log('🔧 Environment check:', {
  SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? '✅ Set' : '❌ Missing',
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? '✅ Set' : '❌ Missing',
  SIGNALWIRE_PROJECT_ID: Deno.env.get('SIGNALWIRE_PROJECT_ID') ? '✅ Set' : '❌ Missing',
  SIGNALWIRE_TOKEN: Deno.env.get('SIGNALWIRE_TOKEN') ? '✅ Set' : '❌ Missing',
  SIGNALWIRE_SPACE_URL: Deno.env.get('SIGNALWIRE_SPACE_URL') ? '✅ Set' : '❌ Missing',
  SIGNALWIRE_PHONE_NUMBER: Deno.env.get('SIGNALWIRE_PHONE_NUMBER') ? '✅ Set' : '❌ Missing'
});

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

// Helper function to convert any phone number format to E.164
const formatToE164 = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // If it already starts with country code (11+ digits), add + prefix
  if (digitsOnly.length >= 11) {
    return `+${digitsOnly}`;
  }
  
  // If it's 10 digits, assume US number and add +1
  if (digitsOnly.length === 10) {
    return `+1${digitsOnly}`;
  }
  
  // Return with + prefix for other cases
  return `+${digitsOnly}`;
};

serve(async (req) => {
  console.log('📞 make-outbound-call invoked:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let requestBody: CallRequest;
    try {
      requestBody = await req.json();
      console.log('📋 Request parsed:', { 
        phoneNumber: requestBody.phoneNumber?.substring(0, 7) + '***',
        assistantId: requestBody.assistantId 
      });
    } catch (error) {
      console.error('❌ Invalid JSON body:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate required environment variables - including SIGNALWIRE_PHONE_NUMBER
    const requiredEnvVars = [
      'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 
      'SIGNALWIRE_PROJECT_ID', 'SIGNALWIRE_TOKEN', 'SIGNALWIRE_SPACE_URL', 'SIGNALWIRE_PHONE_NUMBER'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!Deno.env.get(envVar)) {
        console.error(`❌ Missing required env var: ${envVar}`);
        return new Response(
          JSON.stringify({ success: false, error: `Server configuration error: Missing ${envVar}. Please configure this in Supabase Edge Function secrets.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' },
        global: { headers: { 'x-application-name': 'voice-ai-outbound-calls' } }
      }
    );

    const { phoneNumber, assistantId, campaignId, contactId, squadId } = requestBody;

    // Enhanced phone number validation
    const phoneRegex = /^\+[1-9]\d{10,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.error('❌ Invalid phone format:', phoneNumber);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid phone number format: ${phoneNumber}. Must be E.164 format (e.g., +12037936539)`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔐 Verifying user token...');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Check active calls limit (but clean up old calls first)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Update old pending/calling calls to completed
    const { error: cleanupError } = await supabaseClient
      .from('calls')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .in('status', ['pending', 'calling'])
      .lt('created_at', fiveMinutesAgo);

    if (cleanupError) {
      console.warn('⚠️ Cleanup error (non-critical):', cleanupError);
    } else {
      console.log('🧹 Cleaned up old pending calls');
    }

    // Check current active calls
    const { count: activeCalls, error: countError } = await supabaseClient
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'calling', 'answered']);

    if (countError) {
      console.warn('⚠️ Count error (proceeding anyway):', countError);
    }

    const MAX_CONCURRENT_CALLS = 3;
    if (activeCalls && activeCalls >= MAX_CONCURRENT_CALLS) {
      console.error(`❌ Too many active calls: ${activeCalls}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Maximum concurrent calls limit reached (${MAX_CONCURRENT_CALLS}). Please wait for current calls to complete.`,
          activeCalls
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Load assistant
    let assistant = null;
    if (assistantId) {
      console.log('👤 Loading assistant:', assistantId);
      const { data: assistantData, error: assistantError } = await supabaseClient
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .eq('user_id', user.id)
        .single();

      if (!assistantError && assistantData) {
        assistant = assistantData;
        console.log('✅ Assistant loaded:', assistant.name);
      } else {
        console.warn('⚠️ Assistant not found, using default');
      }
    }

    // Create call record
    console.log('📝 Creating call record...');
    const { data: callData, error: callError } = await supabaseClient
      .from('calls')
      .insert({
        phone_number: phoneNumber,
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
      console.error('❌ Failed to create call record:', callError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${callError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Call record created:', callData.id);

    // Get SignalWire configuration
    const signalwireProjectId = Deno.env.get('SIGNALWIRE_PROJECT_ID')!;
    const signalwireApiToken = Deno.env.get('SIGNALWIRE_TOKEN')!;
    const signalwireSpaceUrl = Deno.env.get('SIGNALWIRE_SPACE_URL')!;
    const rawSignalwirePhoneNumber = Deno.env.get('SIGNALWIRE_PHONE_NUMBER')!;
    
    // Convert SignalWire phone number to E.164 format
    const signalwirePhoneNumber = formatToE164(rawSignalwirePhoneNumber);

    console.log('📞 Phone number conversion:', {
      raw: rawSignalwirePhoneNumber.substring(0, 7) + '***',
      e164: signalwirePhoneNumber.substring(0, 7) + '***'
    });

    // Construct webhook URLs properly
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-webhook`;
    
    // Construct WebSocket URL properly  
    const wsUrl = `wss://${supabaseUrl.replace('https://', '').replace('http://', '')}/functions/v1/voice-websocket?callId=${callData.id}&assistantId=${assistantId || 'demo'}&userId=${user.id}`;

    console.log('🔗 WebSocket URL:', wsUrl);
    console.log('🔗 Status callback URL:', statusCallbackUrl);

    // Enhanced SWML with proper voice agent integration
    const firstMessage = assistant?.first_message || 'Hello! This is your AI assistant. How can I help you today?';
    
    const swml = `<?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Say voice="alice">${firstMessage}</Say>
      <Connect>
        <Stream url="${wsUrl}">
          <Parameter name="callId" value="${callData.id}" />
          <Parameter name="assistantId" value="${assistantId || 'demo'}" />
          <Parameter name="userId" value="${user.id}" />
        </Stream>
      </Connect>
    </Response>`;

    console.log('📞 Initiating SignalWire call...');
    console.log('📝 SWML:', swml);
    
    // Fixed call parameters with properly formatted E.164 phone number
    const callParams = new URLSearchParams({
      To: phoneNumber,
      From: signalwirePhoneNumber, // Now properly formatted as E.164
      Twiml: swml,
      StatusCallback: statusCallbackUrl,
      StatusCallbackMethod: 'POST',
      Timeout: '30'
    });

    // Add status callback events individually
    callParams.append('StatusCallbackEvent', 'initiated');
    callParams.append('StatusCallbackEvent', 'ringing');
    callParams.append('StatusCallbackEvent', 'answered');
    callParams.append('StatusCallbackEvent', 'completed');

    const signalwireUrl = `https://${signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${signalwireProjectId}/Calls.json`;

    console.log('🌐 SignalWire API call to:', signalwireUrl);
    console.log('📞 Call params:', {
      To: phoneNumber,
      From: signalwirePhoneNumber,
      StatusCallback: statusCallbackUrl
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
      console.error('❌ SignalWire API error:', signalwireResponse.status, errorText);
      
      // Update call record to failed
      await supabaseClient
        .from('calls')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', callData.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: `SignalWire API error: ${signalwireResponse.status} - ${errorText}`,
          details: {
            fromNumber: signalwirePhoneNumber,
            toNumber: phoneNumber,
            statusCode: signalwireResponse.status
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const signalwireData = await signalwireResponse.json();
    console.log('✅ SignalWire call created:', signalwireData.sid);

    // Update call record with SignalWire ID
    const { error: updateError } = await supabaseClient
      .from('calls')
      .update({
        signalwire_call_id: signalwireData.sid,
        status: 'calling',
        updated_at: new Date().toISOString()
      })
      .eq('id', callData.id);

    if (updateError) {
      console.warn('⚠️ Call update error (non-critical):', updateError);
    }

    // Log webhook event
    await supabaseClient.from('webhook_logs').insert({
      call_id: callData.id,
      event_type: 'call_initiated',
      event_data: {
        signalwire_sid: signalwireData.sid,
        phone_number: phoneNumber,
        assistant_id: assistantId,
        websocket_url: wsUrl,
        from_number: signalwirePhoneNumber,
        swml_used: swml
      }
    });

    console.log('🎉 Call successfully initiated!');
    return new Response(
      JSON.stringify({
        success: true,
        callId: signalwireData.sid,
        dbCallId: callData.id,
        status: 'calling',
        message: 'Call initiated successfully',
        websocketUrl: wsUrl,
        fromNumber: signalwirePhoneNumber,
        toNumber: phoneNumber
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Critical error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: `Internal server error: ${error.message}`,
        errorCode: error.name,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
