import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

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

// Service role client for server-side operations
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

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