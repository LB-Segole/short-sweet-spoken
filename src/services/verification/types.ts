
export interface VerificationCheck {
  id: string;
  type: 'signalwire_api' | 'call_connection' | 'audio_stream' | 'ai_response' | 'call_status' | 'webhook_response' | 'ring_timeout';
  status: 'pending' | 'passed' | 'failed';
  details: string;
  timestamp: string;
}

export interface VerificationSession {
  callId: string;
  sessionId: string;
  phoneNumber: string;
  checks: VerificationCheck[];
  startTime: string;
  lastUpdate: string;
  status: 'running' | 'completed' | 'failed';
  overallStatus: 'checking' | 'verified' | 'failed';
}

export type SessionSubscriber = (session: VerificationSession) => void;
