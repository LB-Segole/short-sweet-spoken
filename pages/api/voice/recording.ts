import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { transcribeAudioFromUrl } from '@/services/speechService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    CallSid,
    RecordingSid,
    RecordingUrl,
    RecordingStatus,
    RecordingDuration,
    RecordingChannels,
    RecordingSource
  } = req.body;

  try {
    // Log recording webhook
    await supabase.from('webhook_logs').insert({
      call_id: CallSid,
      event_type: 'recording_available',
      event_data: req.body
    });

    if (RecordingStatus === 'completed' && RecordingUrl) {
      // Store recording information
      const { data: recording, error: recordingError } = await supabase
        .from('call_recordings')
        .insert({
          call_id: CallSid,
          recording_sid: RecordingSid,
          recording_url: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : null,
          channels: RecordingChannels ? parseInt(RecordingChannels) : 1,
          source: RecordingSource,
          status: 'available',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (recordingError) {
        console.error('Error storing recording:', recordingError);
      }

      // Optionally transcribe the full recording for backup/analysis
      if (process.env.ENABLE_FULL_TRANSCRIPTION === 'true') {
        try {
          const transcription = await transcribeAudioFromUrl(RecordingUrl);
          
          await supabase
            .from('call_recordings')
            .update({
              transcription: transcription.transcript,
              transcription_confidence: transcription.confidence
            })
            .eq('recording_sid', RecordingSid);

        } catch (transcriptionError) {
          console.error('Recording transcription failed:', transcriptionError);
        }
      }
    }

    res.status(200).json({ message: 'Recording processed successfully' });

  } catch (error) {
    console.error('Recording webhook error:', error);
    res.status(500).json({ error: 'Recording webhook processing failed' });
  }
}