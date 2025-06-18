import { supabase } from '@/integrations/supabase/client';

export interface VerificationCheck {
  id: string;
  type: 'signalwire_api' | 'call_status' | 'webhook_response' | 'ring_timeout';
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

// Type alias for backward compatibility
export type CallVerificationSession = VerificationSession;

class CallVerificationService {
  private sessions = new Map<string, VerificationSession>();
  private subscribers = new Map<string, (session: VerificationSession) => void>();

  startVerification(callId: string, phoneNumber: string): string {
    const sessionId = `verify_${callId}_${Date.now()}`;
    
    const session: VerificationSession = {
      callId,
      sessionId,
      phoneNumber,
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      status: 'running',
      overallStatus: 'checking',
      checks: [
        { 
          id: `check_1_${sessionId}`,
          type: 'signalwire_api', 
          status: 'pending', 
          details: 'Checking SignalWire API response...', 
          timestamp: new Date().toISOString()
        },
        { 
          id: `check_2_${sessionId}`,
          type: 'call_status', 
          status: 'pending', 
          details: 'Verifying call status progression...', 
          timestamp: new Date().toISOString()
        },
        { 
          id: `check_3_${sessionId}`,
          type: 'webhook_response', 
          status: 'pending', 
          details: 'Testing webhook events...', 
          timestamp: new Date().toISOString()
        },
        { 
          id: `check_4_${sessionId}`,
          type: 'ring_timeout', 
          status: 'pending', 
          details: 'Validating ring duration (2 min)...', 
          timestamp: new Date().toISOString()
        }
      ]
    };

    this.sessions.set(sessionId, session);
    
    // Start verification checks
    this.runVerificationChecks(sessionId);
    
    return sessionId;
  }

  // Alias method for backward compatibility
  startVerificationSession(callId: string, phoneNumber: string): Promise<string> {
    return Promise.resolve(this.startVerification(callId, phoneNumber));
  }

  private async runVerificationChecks(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`🔍 Starting verification for call ${session.callId}`);

    // Run checks sequentially with delays
    setTimeout(() => this.checkSignalWireAPI(sessionId), 1000);
    setTimeout(() => this.checkCallStatus(sessionId), 3000);
    setTimeout(() => this.checkWebhookResponse(sessionId), 5000);
    setTimeout(() => this.checkRingTimeout(sessionId), 7000);
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
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'signalwire_api')!;
      check.status = 'failed';
      check.details = `❌ Error checking SignalWire API: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
      console.log(`❌ CHECK 1 ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateSession(sessionId);
    }
  }

  private async checkCallStatus(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 2: Verifying call status for ${session.callId}`);
    
    try {
      const { data: callData, error } = await supabase
        .from('calls')
        .select('status, signalwire_call_id')
        .eq('id', session.callId)
        .single();

      const check = session.checks.find(c => c.type === 'call_status')!;
      
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
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'call_status')!;
      check.status = 'failed';
      check.details = `❌ Error checking call status: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
    }
  }

  private async checkWebhookResponse(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 3: Testing webhook response for ${session.callId}`);
    
    try {
      // Check for webhook logs
      const { data: webhookLogs, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_id', session.callId)
        .eq('log_type', 'webhook')
        .gte('created_at', new Date(Date.now() - 30000).toISOString()) // Last 30 seconds
        .order('created_at', { ascending: false })
        .limit(1);

      const check = session.checks.find(c => c.type === 'webhook_response')!;
      
      if (error) {
        check.status = 'failed';
        check.details = `❌ Error checking webhook logs: ${error.message}`;
      } else if (webhookLogs && webhookLogs.length > 0) {
        check.status = 'passed';
        check.details = `✅ Webhook events received - last event: ${webhookLogs[0].created_at}`;
      } else {
        check.status = 'failed';
        check.details = `❌ No webhook events received within 30 seconds`;
      }
      
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'webhook_response')!;
      check.status = 'failed';
      check.details = `❌ Error testing webhook response: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
    }
  }

  private async checkRingTimeout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`✅ CHECK 4: Validating ring timeout for ${session.callId}`);
    
    try {
      const callStartTime = new Date(session.startTime);
      const currentTime = new Date();
      const elapsedSeconds = (currentTime.getTime() - callStartTime.getTime()) / 1000;

      const check = session.checks.find(c => c.type === 'ring_timeout')!;
      
      if (elapsedSeconds < 120) { // Less than 2 minutes
        check.status = 'passed';
        check.details = `✅ Ring duration within limits: ${Math.round(elapsedSeconds)}s (< 120s)`;
      } else {
        check.status = 'failed';
        check.details = `❌ Ring timeout exceeded: ${Math.round(elapsedSeconds)}s (> 120s)`;
      }
      
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
      this.updateSession(sessionId);
      
    } catch (error) {
      const check = session.checks.find(c => c.type === 'ring_timeout')!;
      check.status = 'failed';
      check.details = `❌ Error validating ring timeout: ${error instanceof Error ? error.message : 'Unknown error'}`;
      check.timestamp = new Date().toISOString();
      session.lastUpdate = new Date().toISOString();
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
      session.overallStatus = 'verified';
      console.log(`✅ Verification completed successfully for call ${session.callId}`);
    } else {
      session.status = 'failed';
      session.overallStatus = 'failed';
      console.log(`❌ Verification failed for call ${session.callId} - ${failedChecks.length} checks failed`);
    }

    session.lastUpdate = new Date().toISOString();
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

  getSessionResults(sessionId: string): VerificationSession | undefined {
    return this.getSession(sessionId);
  }

  getAllSessions(): VerificationSession[] {
    return Array.from(this.sessions.values());
  }

  clearOldSessions(): void {
    const now = new Date();
    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionTime = new Date(session.startTime);
      const ageMinutes = (now.getTime() - sessionTime.getTime()) / (1000 * 60);
      
      if (ageMinutes > 30) { // Clear sessions older than 30 minutes
        this.cleanup(sessionId);
      }
    }
  }

  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.subscribers.delete(sessionId);
  }

  private formatCallLog(log: any): VerificationCheck {
    return {
      id: log.id,
      type: this.mapLogTypeToVerificationType(log.speaker),
      status: log.confidence > 0.8 ? 'passed' : 'failed',
      details: log.content,
      timestamp: log.timestamp || new Date().toISOString()
    };
  }
}

export const callVerificationService = new CallVerificationService();
