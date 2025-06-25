// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('🚀 DeepGram Voice Agent - ENHANCED DEBUG VERSION v6.0');
console.log('📍 Function deployed and ready to accept connections');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);
  
  console.log(`🔵 [${requestId}] === NEW REQUEST START ===`);
  console.log(`📡 [${requestId}] Method: ${req.method}`);
  console.log(`📡 [${requestId}] URL: ${req.url}`);
  console.log(`📡 [${requestId}] Timestamp: ${new Date().toISOString()}`);

  // Log all headers for debugging
  const headers = Object.fromEntries(req.headers.entries());
  console.log(`📋 [${requestId}] Headers:`, JSON.stringify(headers, null, 2));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] Handling CORS preflight request`);
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Parse URL parameters
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || 'anonymous';
  const callId = url.searchParams.get('callId') || 'default-call';
  const assistantId = url.searchParams.get('assistantId') || 'default-assistant';

  console.log(`🔍 [${requestId}] Connection params:`, { userId, callId, assistantId });

  // Check for WebSocket upgrade headers
  const upgradeHeader = req.headers.get('upgrade');
  const connectionHeader = req.headers.get('connection');
  
  console.log(`🔍 [${requestId}] WebSocket headers:`, { 
    upgrade: upgradeHeader, 
    connection: connectionHeader 
  });
  
  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    console.log(`❌ [${requestId}] Missing or invalid Upgrade header`);
    console.log(`❌ [${requestId}] Expected: websocket, Received: ${upgradeHeader}`);
    return new Response(JSON.stringify({ 
      error: 'WebSocket upgrade required',
      received_upgrade: upgradeHeader,
      expected: 'websocket',
      request_id: requestId
    }), {
      status: 426,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Upgrade': 'websocket', 
        'Connection': 'Upgrade' 
      },
    });
  }

  // Verify environment variables
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  console.log(`🔍 [${requestId}] Environment check:`, {
    hasDeepgram: !!deepgramApiKey,
    hasOpenAI: !!openaiApiKey,
    deepgramKeyLength: deepgramApiKey?.length || 0,
    openaiKeyLength: openaiApiKey?.length || 0
  });

  if (!deepgramApiKey || !openaiApiKey) {
    console.error(`❌ [${requestId}] Missing required API keys`);
    return new Response(JSON.stringify({ 
      error: 'Server configuration error - missing API keys',
      details: 'Required API keys not configured',
      missing: {
        deepgram: !deepgramApiKey,
        openai: !openaiApiKey
      },
      request_id: requestId
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log(`🔄 [${requestId}] Attempting WebSocket upgrade...`);
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log(`✅ [${requestId}] WebSocket upgrade successful`);
    
    let isActive = true;
    let deepgramSTT: WebSocket | null = null;
    let deepgramTTS: WebSocket | null = null;
    let keepAliveInterval: number | null = null;

    console.log(`🆔 [${requestId}] Connection established for user ${userId}`);

    // WebSocket event handlers
    socket.onopen = () => {
      console.log(`🔌 [${requestId}] Client WebSocket OPENED successfully`);
      isActive = true;
      
      // Send immediate ready message
      socket.send(JSON.stringify({
        type: 'connection_ready',
        connectionId: requestId,
        message: 'Voice assistant ready',
        userId,
        callId,
        assistantId,
        timestamp: Date.now()
      }));
      
      console.log(`📤 [${requestId}] Connection ready message sent`);
      
      // Start keepalive
      keepAliveInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ 
            type: 'ping', 
            connectionId: requestId,
            timestamp: Date.now() 
          }));
          console.log(`💓 [${requestId}] Ping sent`);
        }
      }, 30000) as unknown as number;
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 [${requestId}] Received message:`, data.type || data.event);

        switch (data.type || data.event) {
          case 'connected':
          case 'start':
            console.log(`🚀 [${requestId}] Session start/connected acknowledged`);
            socket.send(JSON.stringify({
              type: 'ack',
              connectionId: requestId,
              message: 'Session acknowledged',
              timestamp: Date.now()
            }));
            break;

          case 'text_input':
            if (data.text?.trim()) {
              console.log(`💬 [${requestId}] Processing text input:`, data.text);
              
              // Simple echo response for now
              const response = `I received your message: "${data.text}". This is a test response from the voice assistant.`;
              
              socket.send(JSON.stringify({
                type: 'ai_response',
                text: response,
                timestamp: Date.now()
              }));
              
              console.log(`📤 [${requestId}] AI response sent`);
            }
            break;

          case 'ping':
            socket.send(JSON.stringify({
              type: 'pong',
              connectionId: requestId,
              timestamp: Date.now()
            }));
            console.log(`💓 [${requestId}] Pong sent`);
            break;

          default:
            console.log(`❓ [${requestId}] Unknown message type:`, data.type || data.event);
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Message processing error:`, error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'error',
            error: 'Message processing failed',
            details: error.message,
            timestamp: Date.now()
          }));
        }
      }
    };

    socket.onclose = (event) => {
      console.log(`🔌 [${requestId}] Client WebSocket CLOSED:`, {
        code: event.code, 
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      isActive = false;
      
      // Clean up resources
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log(`🧹 [${requestId}] Keepalive stopped`);
      }
      
      console.log(`✅ [${requestId}] Cleanup completed`);
    };

    socket.onerror = (error) => {
      console.error(`❌ [${requestId}] Client WebSocket ERROR:`, error);
    };

    const endTime = Date.now();
    console.log(`✅ [${requestId}] WebSocket setup completed in ${endTime - startTime}ms`);
    console.log(`🔵 [${requestId}] === REQUEST PROCESSING COMPLETE ===`);
    
    return response;

  } catch (error) {
    console.error(`❌ [${requestId}] WebSocket upgrade failed:`, error);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'WebSocket upgrade failed', 
        details: error.message,
        stack: error.stack,
        request_id: requestId
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
