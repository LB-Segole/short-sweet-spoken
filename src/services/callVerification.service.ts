import { supabase } from '@/integrations/supabase/client';

export interface VerificationCheck {
  type: 'signalwire_api' | 'call_connection' | 'audio_stream' | 'ai_response';
  status: 'pending' | 'passed' | 'failed';
  details: string;
  timestamp?: string;
}

export interface VerificationSession {
  callId: string;
  sessionId: string;
  checks: VerificationCheck[];
  startTime: string;
  status: 'running' | 'completed' | 'failed';
}

class CallVerificationService {
  private sessions = new Map<string, VerificationSession>();
  private subscribers = new Map<string, (session: VerificationSession) => void>();

  startVerification(callId: string): string {
    const sessionId = `verify_${callId}_${Date.now()}`;
    
    const session: VerificationSession = {
      callId,
      sessionId,
      startTime: new Date().toISOString(),
      status: 'running',
      checks: [
        { type: 'signalwire_api', status: 'pending', details: 'Checking SignalWire API response...' },
        { type: 'call_connection', status: 'pending', details: 'Verifying call connection...' },
        { type: 'audio_stream', status: 'pending', details: 'Testing audio stream...' },
        { type: 'ai_response', status: 'pending', details: 'Validating AI agent response...' }
      ]
    };

    this.sessions.set(sessionId, session);
    
    // Start verification checks
    this.runVerificationChecks(sessionId);
    
    return sessionId;
  }

  private async runVerificationChecks(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🔍 Starting verification for call ${session.callId}`);

    // Run checks sequentially with delays
    setTimeout(() => this.checkSignalWireAPI(sessionId), 1000);
    setTimeout(() => this.checkCallConnection(sessionId), 3000);
    setTimeout(() => this.checkAudioStream(sessionId), 5000);
    setTimeout(() => this.checkAIResponse(sessionId), 7000);
    setTimeout(() => this.completeVerification(sessionId), 10000);
  }

  private async checkSignalWireAPI(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 1: Verifying SignalWire API response for ${session.callId}`);
    
    try {
      const { data: callData, error } = await supabase
        .from('calls')
        .select('signalwire_call_id, status, created_at')
        .eq('id', session.callId)
        .single();

      const check = session.checks.find(c => c.type === 'signalwire_api')!;
      
      if (error) {
        check.status = 'failed';
        check.details = `❌ Error querying call data: ${error.message}`;
        console.log(`❌ CHECK 1 ERROR: ${error.message}`);
      } else if (callData?.signalwire_call_id) {
        check.status = 'passed';
        check.details = `✅ SignalWire call SID received: ${callData.signalwire_call_id}`;
        console.log(`✅ CHECK 1 PASSED: SignalWire SID ${callData.signalwire_call_id}`);
      } else {
        check.status = 'failed';
        check.details = '❌ No SignalWire call SID found - API call may have failed';
        console.log(`❌ CHECK 1 FAILED: No SignalWire SID found`);
      }
      
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'signalwire_api')!;
      check.status = 'failed';
      check.details = `❌ Error checking SignalWire API: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      console.log(`❌ CHECK 1 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateSession(sessionId);
    }
  }

  private async checkCallConnection(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 2: Verifying call connection for ${session.callId}`);
    
    try {
      const { data: callData, error } = await supabase
        .from('calls')
        .select('status, signalwire_call_id')
        .eq('id', session.callId)
        .single();

      const check = session.checks.find(c => c.type === 'call_connection')!;
      
      if (error) {
        check.status = 'failed';
        check.details = `❌ Error checking call status: ${error.message}`;
      } else if (callData?.status === 'connected' || callData?.status === 'in-progress') {
        check.status = 'passed';
        check.details = `✅ Call successfully connected with status: ${callData.status}`;
      } else if (callData?.status === 'failed') {
        check.status = 'failed';
        check.details = `❌ Call failed to connect`;
      } else {
        check.status = 'failed';
        check.details = `❌ Call connection pending - current status: ${callData?.status || 'unknown'}`;
      }
      
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'call_connection')!;
      check.status = 'failed';
      check.details = `❌ Error checking call connection: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
    }
  }

  private async checkAudioStream(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 3: Testing audio stream for ${session.callId}`);
    
    try {
      // Check if audio stream is active by looking for recent audio logs
      const { data: audioLogs, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_id', session.callId)
        .eq('log_type', 'audio_stream')
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
        .order('created_at', { ascending: false })
        .limit(1);

      const check = session.checks.find(c => c.type === 'audio_stream')!;
      
      if (error) {
        check.status = 'failed';
        check.details = `❌ Error checking audio stream: ${error.message}`;
      } else if (audioLogs && audioLogs.length > 0) {
        check.status = 'passed';
        check.details = `✅ Audio stream active - last activity: ${audioLogs[0].created_at}`;
      } else {
        // Try to test microphone access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          check.status = 'passed';
          check.details = `✅ Audio stream ready - microphone access granted`;
        } catch (micError) {
          check.status = 'failed';
          check.details = `❌ Audio stream failed - microphone access denied`;
        }
      }
      
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'audio_stream')!;
      check.status = 'failed';
      check.details = `❌ Error testing audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
    }
  }

  private async checkAIResponse(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 4: Validating AI agent response for ${session.callId}`);
    
    try {
      // Check for AI responses in call logs
      const { data: aiLogs, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_id', session.callId)
        .eq('log_type', 'ai_response')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last 60 seconds
        .order('created_at', { ascending: false })
        .limit(1);

      const check = session.checks.find(c => c.type === 'ai_response')!;
      
      if (error) {
        check.status = 'failed';
        check.details = `❌ Error checking AI responses: ${error.message}`;
      } else if (aiLogs && aiLogs.length > 0) {
        check.status = 'passed';
        check.details = `✅ AI agent responding - last response: ${aiLogs[0].created_at}`;
      } else {
        // Test AI agent with a ping
        try {
          const { data, error: aiError } = await supabase.functions.invoke('ai-agent-test', {
            body: { callId: session.callId, message: 'ping' }
          });
          
          if (aiError) {
            check.status = 'failed';
            check.details = `❌ AI agent test failed: ${aiError.message}`;
          } else {
            check.status = 'passed';
            check.details = `✅ AI agent responsive - test successful`;
          }
        } catch (aiTestError) {
          check.status = 'failed';
          check.details = `❌ AI agent not responding - test failed`;
        }
      }
      
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'ai_response')!;
      check.status = 'failed';
      check.details = `❌ Error validating AI response: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      this.updateSession(sessionId);
    }
  }

  private completeVerification(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const failedChecks = session.checks.filter(c => c.status === 'failed');
    const pendingChecks = session.checks.filter(c => c.status === 'pending');

    // Mark any pending checks as failed
    pendingChecks.forEach(check => {
      check.status = 'failed';
      check.details = '❌ Check timed out';
      check.timestamp = new Date().toISOString();
    });

    if (failedChecks.length === 0) {
      session.status = 'completed';
      console.log(`✅ Verification completed successfully for call ${session.callId}`);
    } else {
      session.status = 'failed';
      console.log(`❌ Verification failed for call ${session.callId} - ${failedChecks.length} checks failed`);
    }

    this.updateSession(sessionId);
  }

  private updateSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const subscriber = this.subscribers.get(sessionId);
    if (subscriber) {
      subscriber(session);
    }
  }

  subscribe(sessionId: string, callback: (session: VerificationSession) => void): void {
    this.subscribers.set(sessionId, callback);
  }

  unsubscribe(sessionId: string): void {
    this.subscribers.delete(sessionId);
  }

  getSession(sessionId: string): VerificationSession | undefined {
    return this.sessions.get(sessionId);
  }

  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.subscribers.delete(sessionId);
  }
}

export const callVerificationService = new CallVerificationService();
