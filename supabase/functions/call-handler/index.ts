
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

console.log('🚀 Edge Function initialized - call-handler v1.0');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const callId = searchParams.get('callId') || 'unknown';
  const userId = searchParams.get('userId') || 'demo';
  const assistantId = searchParams.get('assistantId') || 'demo';

  const safeGreeting = 'Hello! You are now connected to your AI assistant.';
  const websocketUrl = `wss://<your-supabase-project>.supabase.co/functions/v1/deepgram-voice-websocket?callId=${callId}&userId=${userId}&assistantId=${assistantId}`;

  const laml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${websocketUrl}" />
  </Start>
  <Say voice="alice">${safeGreeting}</Say>
</Response>`;

  return new Response(laml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      ...corsHeaders
    }
  });
});
