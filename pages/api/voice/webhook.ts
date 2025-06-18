import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { transcribeAudio } from '@/services/speechService';
import { generateAIResponse } from '@/services/aiService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    CallSid, 
    From, 
    To, 
    CallStatus, 
    RecordingUrl, 
    SpeechResult,
    Confidence,
    CallDuration 
  } = req.body;

  try {
    // Log webhook event for debugging
    await supabase.from('webhook_logs').insert({
      call_id: CallSid,
      event_type: CallStatus || 'speech_input',
      event_data: req.body
    });

    // Update call status in database
    if (CallSid) {
      await supabase.from('calls').upsert({
        external_id: CallSid,
        from_number: From,
        to_number: To,
        status: CallStatus?.toLowerCase() || 'in-progress',
        duration: CallDuration ? parseInt(CallDuration) : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'external_id'
      });
    }

    // Handle different call events
    switch (CallStatus) {
      case 'ringing':
        return handleCallRinging(res);
      
      case 'answered':
        return handleCallAnswered(res);
      
      case 'completed':
        return handleCallCompleted(res, CallSid, CallDuration);
      
      case 'failed':
      case 'busy':
      case 'no-answer':
        return handleCallFailed(res, CallSid, CallStatus);
      
      default:
        // Handle speech input during active call
        if (SpeechResult) {
          return await handleSpeechInput(res, CallSid, SpeechResult, Confidence);
        }
        return handleCallAnswered(res);
    }

  } catch (error) {
    console.error('Voice webhook error:', error);
    
    // Return error response in TwiML format
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">I'm sorry, I'm experiencing technical difficulties. Please try calling back later.</Say>
        <Hangup/>
      </Response>
    `);
  }
}

function handleCallRinging(res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(`
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <!-- Call is ringing, no action needed -->
    </Response>
  `);
}

function handleCallAnswered(res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(`
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Gather 
        input="speech" 
        action="/api/voice/webhook" 
        method="POST" 
        speechTimeout="3"
        timeout="10"
        language="en-US"
        enhanced="true">
        <Say voice="alice">Hello! This is Sarah, an AI assistant from First Choice Solutions. I'm calling to discuss how we can help improve your business operations. How are you doing today?</Say>
      </Gather>
      <Say voice="alice">I didn't catch that. Let me transfer you to one of our human representatives.</Say>
      <Dial>+1234567890</Dial>
    </Response>
  `);
}

async function handleSpeechInput(res: NextApiResponse, callSid: string, speechResult: string, confidence: string) {
  try {
    // Generate AI response based on speech input
    const aiResponse = await generateAIResponse(speechResult, {
      callId: callSid,
      confidence: parseFloat(confidence || '0')
    });

    // Log the conversation
    await supabase.from('call_logs').insert({
      call_id: callSid,
      speaker: 'customer',
      message: speechResult,
      confidence: parseFloat(confidence || '0'),
      timestamp: new Date().toISOString()
    });

    await supabase.from('call_logs').insert({
      call_id: callSid,
      speaker: 'agent',
      message: aiResponse.text,
      timestamp: new Date().toISOString()
    });

    // Determine next action based on AI response
    if (aiResponse.shouldTransfer) {
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">${aiResponse.text}</Say>
          <Dial>+1234567890</Dial>
        </Response>
      `);
    } else if (aiResponse.shouldEndCall) {
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">${aiResponse.text}</Say>
          <Hangup/>
        </Response>
      `);
    } else {
      // Continue conversation
      res.setHeader('Content-Type', 'text/xml');
      res.status(200).send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Gather 
            input="speech" 
            action="/api/voice/webhook" 
            method="POST" 
            speechTimeout="3"
            timeout="10"
            language="en-US"
            enhanced="true">
            <Say voice="alice">${aiResponse.text}</Say>
          </Gather>
          <Say voice="alice">I didn't hear a response. Let me connect you with a human representative.</Say>
          <Dial>+1234567890</Dial>
        </Response>
      `);
    }

  } catch (error) {
    console.error('Error processing speech input:', error);
    
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">I'm having trouble understanding. Let me connect you with one of our team members.</Say>
        <Dial>+1234567890</Dial>
      </Response>
    `);
  }
}

function handleCallCompleted(res: NextApiResponse, callSid: string, duration: string) {
  // Log call completion
  supabase.from('calls').update({
    status: 'completed',
    duration: duration ? parseInt(duration) : null,
    ended_at: new Date().toISOString()
  }).eq('external_id', callSid);

  res.status(200).json({ message: 'Call completed' });
}

function handleCallFailed(res: NextApiResponse, callSid: string, status: string) {
  // Log call failure
  supabase.from('calls').update({
    status: status.toLowerCase(),
    ended_at: new Date().toISOString()
  }).eq('external_id', callSid);

  res.status(200).json({ message: `Call ${status}` });
}