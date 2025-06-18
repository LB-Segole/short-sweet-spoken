
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders } from "./cors-utils.ts";

export const generateTwiMLResponse = async (callId: string, assistantId: string): Promise<Response> => {
  console.log('=== TWIML REQUEST - EXTENDED RING + GREETING ===');
  console.log('📞 Call ID:', callId);
  console.log('🤖 Assistant ID:', assistantId);
  console.log('🔔 Call will ring for 2 minutes then connect to AI with greeting');
  
  if (!callId || !assistantId) {
    console.error("❌ Missing callId or assistantId");
    return createErrorTwiML("We're sorry, but we're experiencing technical difficulties. Please try again later.");
  }

  // Get WebSocket URL for real-time AI conversation with greeting
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!supabaseUrl) {
    console.error("❌ SUPABASE_URL not configured");
    return createErrorTwiML("Configuration error occurred.");
  }

  const wsUrl = `wss://${supabaseUrl.replace('https://', '')}/functions/v1/voice-websocket?callId=${encodeURIComponent(callId)}&assistantId=${encodeURIComponent(assistantId)}`;
  
  console.log('🌐 WebSocket URL for greeting + conversation:', wsUrl);

  // TwiML that connects to real-time AI with greeting after call is answered
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>
</Response>`;

  console.log('📤 Returning AI connection TwiML with greeting support');
  console.log('🔔 Phone will ring normally for up to 2 minutes');
  console.log('🎙️ AI greeting will start immediately after answer');
  console.log('💬 Bidirectional conversation begins after greeting');
  
  return new Response(twiml, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml'
    }
  });
};

export const generateConnectTwiML = async (callId: string, assistantId: string): Promise<Response> => {
  console.log('=== CONNECT TWIML (DEPRECATED) ===');
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connection error occurred.</Say>
  <Hangup/>
</Response>`;

  return new Response(twiml, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/xml'
    }
  });
};

export const createErrorTwiML = (message: string): Response => {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${message}</Say>
  <Hangup/>
</Response>`,
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      }
    }
  );
};
