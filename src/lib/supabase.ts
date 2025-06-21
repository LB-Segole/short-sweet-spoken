
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csixccpoxpnwowbgkoyw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXhjY3BveHBud293Ymdrb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5Mjg0MDMsImV4cCI6MjA2MzUwNDQwM30.tQrCwtiHS5p-CTp1Z2gkVnAcV_TGlcxpGy-zwI46UyQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// For server-side operations, this would use service role key
export const supabaseAdmin = null;

// Real-time subscription helpers
export const subscribeToCallUpdates = (callId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`call-${callId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'calls',
        filter: `id=eq.${callId}`
      }, 
      callback
    )
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'call_logs',
        filter: `call_id=eq.${callId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToActiveCallsUpdates = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`user-calls-${userId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'calls',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};
