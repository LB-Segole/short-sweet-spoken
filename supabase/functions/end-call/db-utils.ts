
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export interface CallRecord {
  status: string;
}

export const createSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

export const fetchCallRecord = async (callId: string): Promise<CallRecord> => {
  const supabase = createSupabaseClient();
  
  const { data: callRecord, error: fetchError } = await supabase
    .from('calls')
    .select('status')
    .eq('signalwire_call_id', callId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch call record:', fetchError);
    throw new Error('Call not found in database');
  }

  console.log('Current call status in database:', callRecord.status);
  return callRecord;
};

export const updateCallStatus = async (callId: string, status: string = 'completed'): Promise<void> => {
  const supabase = createSupabaseClient();
  
  const { error: updateError } = await supabase
    .from('calls')
    .update({ status })
    .eq('signalwire_call_id', callId);

  if (updateError) {
    console.error('Failed to update call status in database:', updateError);
  } else {
    console.log('Database updated with call termination');
  }
};

export const isCallAlreadyTerminated = (status: string): boolean => {
  const terminatedStatuses = ['completed', 'failed', 'ended', 'no-answer', 'busy'];
  return !status || terminatedStatuses.includes(status);
};
