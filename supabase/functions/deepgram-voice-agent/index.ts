// deno-lint-ignore-file
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

console.log('🚀 Deepgram Voice Agent - Starting initialization...');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, upgrade, connection',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
};

// Health check endpoint
const handleHealthCheck = () => {
  console.log('💚 Health check requested');
  return new Response(
    JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'deepgram-voice-agent',
      version: '1.0.0'
    }),
    { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  );
};

serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  const startTime = Date.now();
  
  console.log(`🔵 [${requestId}] === NEW REQUEST START ===`);
  console.log(`📡 [${requestId}] Method: ${req.method}, URL: ${req.url}`);
  
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      console.log(`✅ [${requestId}] CORS preflight handled`);
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Handle health check
    const url = new URL(req.url);
    if (url.pathname === '/health' || req.method === 'GET') {
      return handleHealthCheck();
    }

    // Validate WebSocket upgrade headers
    const upgradeHeader = req.headers.get('upgrade');
    const connectionHeader = req.headers.get('connection');
    
    console.log(`🔍 [${requestId}] Headers check:`, { 
      upgrade: upgradeHeader, 
      connection: connectionHeader 
    });
    
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      console.log(`❌ [${requestId}] Invalid upgrade header: ${upgradeHeader}`);
      return new Response(
        JSON.stringify({ 
          error: 'WebSocket upgrade required',
          received: upgradeHeader,
          expected: 'websocket',
          requestId 
        }),
        {
          status: 426,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Upgrade': 'websocket',
            'Connection': 'Upgrade'
          },
        }
      );
    }

    // Check environment variables
    const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const huggingFaceKey = Deno.env.get('HUGGING_FACE_API');
    
    console.log(`🔍 [${requestId}] Environment check:`, {
      hasDeepgram: !!deepgramKey,
      hasOpenAI: !!openaiKey,
      hasHuggingFace: !!huggingFaceKey
    });

    if (!deepgramKey) {
      console.error(`❌ [${requestId}] Missing DEEPGRAM_API_KEY`);
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'DEEPGRAM_API_KEY not configured',
          requestId 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Upgrade to WebSocket
    console.log(`🔄 [${requestId}] Attempting WebSocket upgrade...`);
    const { socket, response } = Deno.upgradeWebSocket(req);
    console.log(`✅ [${requestId}] WebSocket upgrade successful`);

    // Connection state management
    let isActive = true;
    let keepAliveInterval: number | null = null;
    let deepgramSTT: WebSocket | null = null;
    let deepgramTTS: WebSocket | null = null;
    let conversationHistory: Array<{role: string, content: string}> = [];

    // Parse connection parameters
    const userId = url.searchParams.get('userId') || 'anonymous';
    const callId = url.searchParams.get('callId') || 'browser-session';
    const assistantId = url.searchParams.get('assistantId') || 'default';

    console.log(`🆔 [${requestId}] Connection params:`, { userId, callId, assistantId });

    // WebSocket event handlers with comprehensive error handling
    socket.onopen = () => {
      try {
        console.log(`🔌 [${requestId}] ✅ CLIENT WEBSOCKET OPENED SUCCESSFULLY`);
        isActive = true;
        
        // Send immediate connection confirmation
        const welcomeMessage = {
          type: 'connection_established',
          connectionId: requestId,
          message: 'Voice assistant connected and ready',
          userId,
          callId,
          assistantId,
          timestamp: Date.now(),
          capabilities: ['text', 'audio', 'speech-to-text', 'text-to-speech']
        };
        
        socket.send(JSON.stringify(welcomeMessage));
        console.log(`📤 [${requestId}] Welcome message sent`);
        
        // Start keepalive system
        keepAliveInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN && isActive) {
            try {
              socket.send(JSON.stringify({ 
                type: 'ping', 
                connectionId: requestId,
                timestamp: Date.now() 
              }));
              console.log(`💓 [${requestId}] Keepalive ping sent`);
            } catch (error) {
              console.error(`❌ [${requestId}] Keepalive ping failed:`, error);
            }
          }
        }, 20000) as unknown as number;
        
        console.log(`💓 [${requestId}] Keepalive system started (20s intervals)`);
        
      } catch (error) {
        console.error(`❌ [${requestId}] Error in onopen handler:`, error);
        try {
          socket.close(1011, 'Internal server error during initialization');
        } catch (closeError) {
          console.error(`❌ [${requestId}] Error closing socket:`, closeError);
        }
      }
    };

    socket.onmessage = async (event) => {
      try {
        console.log(`📨 [${requestId}] Message received, parsing...`);
        const data = JSON.parse(event.data);
        console.log(`📨 [${requestId}] Message type: ${data.type || data.event}`);

        switch (data.type || data.event) {
          case 'pong':
            console.log(`💓 [${requestId}] Pong received - connection healthy`);
            break;

          case 'ping':
            console.log(`💓 [${requestId}] Ping received, sending pong`);
            socket.send(JSON.stringify({
              type: 'pong',
              connectionId: requestId,
              timestamp: Date.now()
            }));
            break;

          case 'text_input':
            if (data.text?.trim()) {
              console.log(`💬 [${requestId}] Processing text input: "${data.text.substring(0, 50)}..."`);
              await handleTextInput(socket, data.text, requestId, conversationHistory);
            }
            break;

          case 'audio_input':
            if (data.audio) {
              console.log(`🎵 [${requestId}] Processing audio input (${data.audio.length} chars base64)`);
              await handleAudioInput(socket, data.audio, requestId);
            }
            break;

          case 'start_conversation':
            console.log(`🚀 [${requestId}] Starting conversation session`);
            socket.send(JSON.stringify({
              type: 'conversation_started',
              message: 'Ready to chat! You can send text or audio.',
              timestamp: Date.now()
            }));
            break;

          default:
            console.log(`❓ [${requestId}] Unknown message type: ${data.type || data.event}`);
            socket.send(JSON.stringify({
              type: 'error',
              error: `Unknown message type: ${data.type || data.event}`,
              timestamp: Date.now()
            }));
            break;
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error processing message:`, error);
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: 'error',
              error: 'Message processing failed',
              details: error.message,
              timestamp: Date.now()
            }));
          } catch (sendError) {
            console.error(`❌ [${requestId}] Failed to send error message:`, sendError);
          }
        }
      }
    };

    socket.onclose = (event) => {
      console.log(`🔌 [${requestId}] CLIENT WEBSOCKET CLOSED:`, {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      
      isActive = false;
      
      // Cleanup resources
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
        console.log(`🧹 [${requestId}] Keepalive stopped`);
      }
      
      if (deepgramSTT) {
        deepgramSTT.close();
        deepgramSTT = null;
      }
      
      if (deepgramTTS) {
        deepgramTTS.close();
        deepgramTTS = null;
      }
      
      console.log(`✅ [${requestId}] Cleanup completed - connection closed gracefully`);
    };

    socket.onerror = (error) => {
      console.error(`❌ [${requestId}] CLIENT WEBSOCKET ERROR:`, error);
      isActive = false;
    };

    const endTime = Date.now();
    console.log(`✅ [${requestId}] WebSocket setup completed successfully in ${endTime - startTime}ms`);
    
    return response;

  } catch (error) {
    console.error(`❌ [${requestId}] Fatal error in request handler:`, error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Helper function to handle text input and generate AI responses
async function handleTextInput(
  socket: WebSocket, 
  text: string, 
  requestId: string,
  conversationHistory: Array<{role: string, content: string}>
) {
  try {
    console.log(`🤖 [${requestId}] Generating AI response for: "${text.substring(0, 50)}..."`);
    
    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: text });
    
    // For now, use a simple response system
    // TODO: Integrate with HuggingFace or OpenAI for actual AI responses
    const responses = [
      "That's interesting! Tell me more about that.",
      "I understand. How can I help you with that?",
      "Thanks for sharing that with me. What would you like to know?",
      "I see. Is there anything specific you'd like assistance with?",
      "That sounds important. How can I support you?"
    ];
    
    const aiResponse = responses[Math.floor(Math.random() * responses.length)];
    conversationHistory.push({ role: 'assistant', content: aiResponse });
    
    // Keep conversation history manageable
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    // Send AI response
    socket.send(JSON.stringify({
      type: 'ai_response',
      text: aiResponse,
      timestamp: Date.now()
    }));
    
    console.log(`✅ [${requestId}] AI response sent successfully`);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleTextInput:`, error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to process text input',
      details: error.message,
      timestamp: Date.now()
    }));
  }
}

// Helper function to handle audio input (placeholder for Deepgram STT)
async function handleAudioInput(socket: WebSocket, audioData: string, requestId: string) {
  try {
    console.log(`🎵 [${requestId}] Processing audio input (${audioData.length} chars)`);
    
    // TODO: Implement Deepgram STT integration
    // For now, send a placeholder response
    socket.send(JSON.stringify({
      type: 'transcript',
      text: 'Audio processing not yet implemented',
      timestamp: Date.now()
    }));
    
    console.log(`✅ [${requestId}] Audio processing placeholder sent`);
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error in handleAudioInput:`, error);
    socket.send(JSON.stringify({
      type: 'error',
      error: 'Failed to process audio input',
      details: error.message,
      timestamp: Date.now()
    }));
  }
}

console.log('🎯 Deepgram Voice Agent initialized and ready to serve requests');
