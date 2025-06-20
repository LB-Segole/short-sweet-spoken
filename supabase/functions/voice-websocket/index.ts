import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('🎤 Voice WebSocket Function initialized v2.2 - Deepgram Only, Rate Limited');
console.log('SIGNALWIRE_PROJECT_ID:', Deno.env.get('SIGNALWIRE_PROJECT_ID'));
console.log('SIGNALWIRE_TOKEN:', Deno.env.get('SIGNALWIRE_TOKEN'));
console.log('SIGNALWIRE_SPACE_URL:', Deno.env.get('SIGNALWIRE_SPACE_URL'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, UPGRADE',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const upgradeHeader = req.headers.get('upgrade')
  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return new Response('Expected websocket connection', { status: 426 })
  }

  // Environment variables & Clients
  const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY')!;

  // Get parameters from the request URL
  const url = new URL(req.url);
  const callId = url.searchParams.get('callId');
  const assistantId = url.searchParams.get('assistantId');
  const userId = url.searchParams.get('userId'); // Important for security/RLS

  if (!callId || !assistantId || !userId) {
    return new Response('Missing required URL parameters: callId, assistantId, userId', { status: 400 });
  }

  const { socket: signalwireSocket, response } = Deno.upgradeWebSocket(req)
  
  let deepgramSocket: WebSocket | null = null
  let streamSid: string | null = null;
  let lastTTSCall = 0;
  let lastSTTCall = 0;
  const TTS_RATE_LIMIT_MS = 1000; // 1 second between TTS calls
  const STT_RATE_LIMIT_MS = 500;  // 0.5 second between STT calls

  const log = (message: string, data?: any) => {
    console.log(`[Call: ${callId}] ${message}`, data || '')
  }

  const sendToSignalWire = (data: any) => {
    if (signalwireSocket.readyState === WebSocket.OPEN) {
      signalwireSocket.send(JSON.stringify(data))
    }
  }

  const initializeDeepgram = () => {
    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=false&endpointing=300&encoding=mulaw&sample_rate=8000`
    deepgramSocket = new WebSocket(deepgramUrl, { headers: { Authorization: `Token ${deepgramApiKey}` } })

    deepgramSocket.onopen = () => log('Deepgram socket opened')
    deepgramSocket.onclose = () => log('Deepgram socket closed')
    deepgramSocket.onerror = (error) => log('Deepgram socket error', error)
    deepgramSocket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'Results' && data.channel?.alternatives?.[0]?.transcript) {
        const now = Date.now();
        if (now - lastSTTCall < STT_RATE_LIMIT_MS) {
          log('STT rate limit hit, skipping this transcript');
          return;
        }
        lastSTTCall = now;
        const transcript = data.channel.alternatives[0].transcript
        if (transcript.trim().length > 0) {
          log('Received transcript:', transcript)
          // Echo the transcript back as TTS (demo: repeat what user said)
          generateAndStreamTTS(transcript)
        }
      }
    }
  }

  const generateAndStreamTTS = async (text: string) => {
    const now = Date.now();
    if (now - lastTTSCall < TTS_RATE_LIMIT_MS) {
      log('TTS rate limit hit, skipping this TTS');
      return;
    }
    lastTTSCall = now;
    try {
      const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mulaw&sample_rate=8000', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      })

      if (response.ok && response.body) {
        const reader = response.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const base64Audio = btoa(String.fromCharCode(...value))
          if (streamSid) {
            sendToSignalWire({
              event: "media",
              streamSid: streamSid,
              media: {
                payload: base64Audio
              }
            })
          }
        }
        log('Finished streaming TTS audio')
      } else {
        log('Deepgram TTS API error', { status: response.status, text: await response.text() })
      }
    } catch (error) {
      log('Error with TTS generation', error)
    }
  }

  signalwireSocket.onopen = () => {
    log('SignalWire socket connected')
  }

  signalwireSocket.onmessage = async (event) => {
    const msg = JSON.parse(event.data)
    switch (msg.event) {
      case 'start':
        log('Received start event from SignalWire', msg)
        streamSid = msg.streamSid; // Capture the streamSid
        // Fetch assistant details to start the conversation
        const { data: assistant, error } = await supabaseClient
          .from('assistants')
          .select('system_prompt, first_message')
          .eq('id', assistantId)
          .eq('user_id', userId) // Ensure user owns assistant
          .single();
        if (error || !assistant) {
          log('Error fetching assistant or access denied', error);
          generateAndStreamTTS("I'm sorry, I can't seem to access my configuration right now. Please try again later.");
          return;
        }
        initializeDeepgram();
        if(assistant.first_message) {
            log('Sending first message:', assistant.first_message);
            generateAndStreamTTS(assistant.first_message);
        }
        break
      case 'media':
        if (deepgramSocket && deepgramSocket.readyState === WebSocket.OPEN) {
          // Decode the base64 payload from SignalWire and send it to Deepgram
          const audioData = atob(msg.media.payload)
          const audioBuffer = new Uint8Array(audioData.length)
          for (let i = 0; i < audioData.length; i++) {
            audioBuffer[i] = audioData.charCodeAt(i)
          }
          deepgramSocket.send(audioBuffer)
        }
        break
      case 'stop':
        log('Received stop event from SignalWire', msg)
        if (deepgramSocket) deepgramSocket.close()
        break
    }
  }

  signalwireSocket.onclose = () => {
    log('SignalWire socket closed')
    if (deepgramSocket) deepgramSocket.close()
  }

  signalwireSocket.onerror = (error) => {
    log('SignalWire socket error', error)
    if (deepgramSocket) deepgramSocket.close()
  }

  return response
})
