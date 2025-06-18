// Enhanced Supabase client with logging, session tracking, and error handling
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { logger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

// Environment variable validation with fallbacks
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://csixccpoxpnwowbgkoyw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaXhjY3BveHBud293Ymdrb3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5Mjg0MDMsImV4cCI6MjA2MzUwNDQwM30.tQrCwtiHS5p-CTp1Z2gkVnAcV_TGlcxpGy-zwI46UyQ";

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const error = 'Missing required Supabase environment variables';
  logger.error(error, {
    hasUrl: !!SUPABASE_URL,
    hasKey: !!SUPABASE_PUBLISHABLE_KEY
  });
  throw new Error(error);
}

// Generate session ID for correlation across the pipeline
export const supabaseSessionId = uuidv4();

// Enhanced fetch wrapper with logging and timeout
const enhancedFetch = async (url: string, options: RequestInit = {}) => {
  const startTime = Date.now();
  const method = options.method || 'GET';
  
  logger.debug('Supabase API call initiated', {
    url: url.replace(SUPABASE_URL, '[SUPABASE_URL]'), // Mask URL for security
    method,
    supabaseSessionId,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      logger.warn('Supabase API call failed', {
        method,
        status: response.status,
        statusText: response.statusText,
        duration,
        supabaseSessionId
      });
    } else {
      logger.debug('Supabase API call completed', {
        method,
        status: response.status,
        duration,
        supabaseSessionId
      });
    }

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Supabase API call error', {
      method,
      error: error instanceof Error ? error.message : String(error),
      duration,
      supabaseSessionId
    });
    throw error;
  }
};

// Main Supabase client with enhanced configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-supabase-session-id': supabaseSessionId,
      'x-client-info': 'voice-ai-pipeline'
    },
    fetch: enhancedFetch
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Admin client for server-side operations (Edge Functions)
export const supabaseAdmin = (() => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not found, admin operations will be limited', {
      supabaseSessionId,
      timestamp: new Date().toISOString()
    });
    return null;
  }

  const adminClient = createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'x-supabase-admin-session-id': supabaseSessionId,
        'x-client-info': 'voice-ai-pipeline-admin'
      },
      fetch: enhancedFetch
    }
  });

  logger.info('Supabase admin client initialized', {
    supabaseSessionId,
    timestamp: new Date().toISOString()
  });

  return adminClient;
})();

// Database connection validation
export const validateDatabaseConnection = async (): Promise<boolean> => {
  try {
    logger.debug('Validating database connection', { supabaseSessionId });
    
    const { error } = await supabase
      .from('calls')
      .select('id')
      .limit(1);

    if (error) {
      logger.error('Database validation failed', {
        error: error.message,
        code: error.code,
        details: error.details,
        supabaseSessionId
      });
      return false;
    }

    logger.info('Database connection validated successfully', {
      supabaseSessionId,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (err) {
    logger.error('Database validation error', {
      error: err instanceof Error ? err.message : String(err),
      supabaseSessionId
    });
    return false;
  }
};

// Authentication state helper
export const getAuthState = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    logger.error('Failed to get auth session', {
      error: error.message,
      supabaseSessionId
    });
    return { session: null, error };
  }

  logger.debug('Auth state retrieved', {
    hasSession: !!session,
    userId: session?.user?.id,
    supabaseSessionId
  });

  return { session, error: null };
};

// Initialize logging
logger.info('Supabase client initialized', {
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_PUBLISHABLE_KEY,
  hasAdmin: !!supabaseAdmin,
  supabaseSessionId,
  timestamp: new Date().toISOString()
});

// Export types for convenience
export type { Database } from './types';
