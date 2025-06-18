import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { VoiceAgentManager } from '@/services/voiceAgent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    CallSid, 
    CallStatus, 
    CallDuration,
    From,
    To,
    Direction,
    AnsweredBy,
    CallerName
  } = req.body;

  try {
    // Log the status webhook
    await supabase.from('webhook_logs').insert({
      call_id: CallSid,
      event_type: `status_${CallStatus.toLowerCase()}`,
      event_data: req.body
    });

    // Update call status in database
    const { data: call, error } = await supabase
      .from('calls')
      .update({
        status: CallStatus.toLowerCase(),
        duration: CallDuration ? parseInt(CallDuration) : null,
        answered_by: AnsweredBy,
        caller_name: CallerName,
        updated_at: new Date().toISOString()
      })
      .eq('external_id', CallSid)
      .select()
      .single();

    if (error) {
      console.error('Error updating call status:', error);
    }

    // Handle different call statuses
    switch (CallStatus.toLowerCase()) {
      case 'ringing':
        console.log(`Call ${CallSid} is ringing`);
        break;

      case 'answered':
        console.log(`Call ${CallSid} was answered`);
        // Initialize voice agent if not already active
        if (call && !VoiceAgentManager.getAgent(CallSid)) {
          await VoiceAgentManager.createAgent(CallSid, {
            assistantId: call.assistant_id,
            campaignId: call.campaign_id
          });
        }
        break;

      case 'completed':
        console.log(`Call ${CallSid} completed`);
        // End voice agent
        await VoiceAgentManager.endAgent(CallSid);
        
        // Update final call record
        if (call) {
          await supabase
            .from('calls')
            .update({
              ended_at: new Date().toISOString(),
              status: 'completed'
            })
            .eq('id', call.id);
        }
        break;

      case 'failed':
      case 'busy':
      case 'no-answer':
        console.log(`Call ${CallSid} ${CallStatus}`);
        // End voice agent and mark as failed
        await VoiceAgentManager.endAgent(CallSid);
        
        if (call) {
          await supabase
            .from('calls')
            .update({
              ended_at: new Date().toISOString(),
              status: CallStatus.toLowerCase()
            })
            .eq('id', call.id);
        }
        break;
    }

    res.status(200).json({ message: 'Status updated successfully' });

  } catch (error) {
    console.error('Status webhook error:', error);
    res.status(500).json({ error: 'Status webhook processing failed' });
  }
}