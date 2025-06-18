
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

export const processWebhookData = async (req: Request): Promise<Record<string, any>> => {
  const url = new URL(req.url);
  
  let webhookData;
  
  if (req.method === 'GET') {
    webhookData = Object.fromEntries(url.searchParams);
  } else {
    const formData = await req.formData();
    webhookData = Object.fromEntries(formData);
  }

  console.log('=== WEBHOOK DATA ANALYSIS ===');
  console.log('Full webhook payload:', JSON.stringify(webhookData, null, 2));

  return webhookData;
};

export const updateCallStatus = async (webhookData: Record<string, any>): Promise<void> => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const callSid = webhookData.CallSid;
  const callStatus = webhookData.CallStatus;
  const callDuration = webhookData.CallDuration;

  console.log('=== KEY CALL METRICS ===');
  console.log('📞 Call SID:', callSid);
  console.log('📊 Call Status:', callStatus);
  console.log('⏱️ Call Duration:', callDuration);

  if (!callSid) return;

  // Map SignalWire statuses to our database statuses
  let dbStatus = callStatus;
  if (callStatus === 'queued') {
    dbStatus = 'pending';
  } else if (callStatus === 'ringing') {
    dbStatus = 'calling';
  }

  // Update call status in database
  const { error } = await supabase
    .from('calls')
    .update({ 
      status: dbStatus,
      completed_at: callStatus === 'completed' ? new Date().toISOString() : null,
      duration: callDuration ? parseInt(callDuration) : null
    })
    .eq('signalwire_call_id', callSid);

  if (error) {
    console.error('❌ Failed to update call status:', error);
  } else {
    console.log(`✅ Updated call ${callSid} status to ${dbStatus}`);
  }

  logCallStatusAnalysis(callStatus, callDuration);
};

const logCallStatusAnalysis = (callStatus: string, callDuration?: string): void => {
  console.log('=== CALL STATUS ANALYSIS ===');
  switch (callStatus) {
    case 'queued':
      console.log('📋 Call is queued and waiting to be processed');
      break;
    case 'ringing':
      console.log('🔔 Phone is ringing! Call successfully reached the recipient');
      break;
    case 'in-progress':
      console.log('📞 Call answered and in progress with real-time AI');
      break;
    case 'completed':
      console.log('✅ Call completed successfully');
      if (callDuration) {
        console.log(`📊 Call duration: ${callDuration} seconds`);
      }
      break;
    case 'busy':
      console.log('📵 Recipient phone is busy');
      break;
    case 'no-answer':
      console.log('📵 No answer from recipient');
      break;
    case 'failed':
      console.log('❌ Call failed');
      break;
    case 'canceled':
      console.log('🚫 Call was canceled');
      break;
    default:
      console.log(`ℹ️ Unknown status: ${callStatus}`);
  }
};
