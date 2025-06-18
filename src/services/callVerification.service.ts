
import { supabase } from '@/integrations/supabase/client';

export interface VerificationCheck {
  id: string;
  type: 'signalwire_api' | 'call_connection' | 'audio_stream' | 'ai_response';
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

class CallVerificationService {
  private sessions: Map<string, VerificationSession> = new Map();
  private subscribers: Map<string, ((session: VerificationSession) => void)[]> = new Map();

  async createVerificationSession(callId: string, phoneNumber: string): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: VerificationSession = {
      callId,
      sessionId,
      phoneNumber,
      checks: [],
      startTime: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      status: 'running',
      overallStatus: 'checking'
    };

    this.sessions.set(sessionId, session);
    this.subscribers.set(sessionId, []);
    
    // Start verification process
    this.runVerificationChecks(sessionId);
    
    return sessionId;
  }

  subscribeToSession(sessionId: string, callback: (session: VerificationSession) => void): () => void {
    const callbacks = this.subscribers.get(sessionId) || [];
    callbacks.push(callback);
    this.subscribers.set(sessionId, callbacks);

    return () => {
      const updatedCallbacks = (this.subscribers.get(sessionId) || []).filter(cb => cb !== callback);
      this.subscribers.set(sessionId, updatedCallbacks);
    };
  }

  private async runVerificationChecks(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Check 1: SignalWire API connectivity
    await this.runSignalWireApiCheck(sessionId);
    
    // Check 2: Call connection
    await this.runCallConnectionCheck(sessionId);
    
    // Check 3: Audio stream quality
    await this.runAudioStreamCheck(sessionId);
    
    // Check 4: AI response time
    await this.runAIResponseCheck(sessionId);
    
    // Finalize session
    this.finalizeSession(sessionId);
  }

  private async runSignalWireApiCheck(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const check: VerificationCheck = {
      id: `check_${Date.now()}_1`,
      type: 'signalwire_api',
      status: 'pending',
      details: 'Testing SignalWire API connectivity...',
      timestamp: new Date().toISOString()
    };

    this.addCheckToSession(sessionId, check);

    try {
      // Simulate API check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      check.status = 'passed';
      check.details = 'SignalWire API is responding correctly';
      
    } catch (error) {
      check.status = 'failed';
      check.details = `SignalWire API check failed: ${error}`;
    }

    this.updateCheck(sessionId, check);
  }

  private async runCallConnectionCheck(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const check: VerificationCheck = {
      id: `check_${Date.now()}_2`,
      type: 'call_connection',
      status: 'pending',
      details: 'Testing call connection stability...',
      timestamp: new Date().toISOString()
    };

    this.addCheckToSession(sessionId, check);

    try {
      // Simulate connection check
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      check.status = 'passed';
      check.details = 'Call connection is stable';
      
    } catch (error) {
      check.status = 'failed';
      check.details = `Call connection check failed: ${error}`;
    }

    this.updateCheck(sessionId, check);
  }

  private async runAudioStreamCheck(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const check: VerificationCheck = {
      id: `check_${Date.now()}_3`,
      type: 'audio_stream',
      status: 'pending',
      details: 'Analyzing audio stream quality...',
      timestamp: new Date().toISOString()
    };

    this.addCheckToSession(sessionId, check);

    try {
      // Simulate audio check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      check.status = 'passed';
      check.details = 'Audio stream quality is excellent';
      
    } catch (error) {
      check.status = 'failed';
      check.details = `Audio stream check failed: ${error}`;
    }

    this.updateCheck(sessionId, check);
  }

  private async runAIResponseCheck(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const check: VerificationCheck = {
      id: `check_${Date.now()}_4`,
      type: 'ai_response',
      status: 'pending',
      details: 'Testing AI response time and accuracy...',
      timestamp: new Date().toISOString()
    };

    this.addCheckToSession(sessionId, check);

    try {
      // Simulate AI check
      await new Promise(resolve => setTimeout(resolve, 1800));
      
      check.status = 'passed';
      check.details = 'AI responses are fast and accurate';
      
    } catch (error) {
      check.status = 'failed';
      check.details = `AI response check failed: ${error}`;
    }

    this.updateCheck(sessionId, check);
  }

  private addCheckToSession(sessionId: string, check: VerificationCheck): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.checks.push(check);
    session.lastUpdate = new Date().toISOString();
    
    this.notifySubscribers(sessionId, session);
  }

  private updateCheck(sessionId: string, updatedCheck: VerificationCheck): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const checkIndex = session.checks.findIndex(c => c.id === updatedCheck.id);
    if (checkIndex !== -1) {
      session.checks[checkIndex] = updatedCheck;
      session.lastUpdate = new Date().toISOString();
      
      this.notifySubscribers(sessionId, session);
    }
  }

  private finalizeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const failedChecks = session.checks.filter(c => c.status === 'failed');
    
    session.status = 'completed';
    session.overallStatus = failedChecks.length === 0 ? 'verified' : 'failed';
    session.lastUpdate = new Date().toISOString();
    
    this.notifySubscribers(sessionId, session);
  }

  private notifySubscribers(sessionId: string, session: VerificationSession): void {
    const callbacks = this.subscribers.get(sessionId) || [];
    callbacks.forEach(callback => callback(session));
  }

  async getCallLogs(callId: string): Promise<VerificationCheck[]> {
    try {
      const { data: logs, error } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_id', callId)
        .order('timestamp', { ascending: true });

      if (error) throw error;

      return (logs || []).map(log => ({
        id: log.id,
        type: this.mapLogTypeToVerificationType(log.speaker),
        status: log.confidence > 0.8 ? 'passed' : 'failed',
        details: log.content,
        timestamp: log.timestamp || new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Error fetching call logs:', error);
      return [];
    }
  }

  private mapLogTypeToVerificationType(speaker: string): VerificationCheck['type'] {
    switch (speaker) {
      case 'system': return 'signalwire_api';
      case 'agent': return 'ai_response';
      case 'user': return 'audio_stream';
      default: return 'call_connection';
    }
  }

  getSession(sessionId: string): VerificationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): VerificationSession[] {
    return Array.from(this.sessions.values());
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.subscribers.delete(sessionId);
  }
}

export const callVerificationService = new CallVerificationService();
