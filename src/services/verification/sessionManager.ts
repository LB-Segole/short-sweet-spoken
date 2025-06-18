
import { VerificationSession, VerificationCheck, SessionSubscriber } from './types';

export class SessionManager {
  private sessions: Map<string, VerificationSession> = new Map();
  private subscribers: Map<string, SessionSubscriber[]> = new Map();

  createSession(callId: string, phoneNumber: string): string {
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
    
    return sessionId;
  }

  getSession(sessionId: string): VerificationSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): VerificationSession[] {
    return Array.from(this.sessions.values());
  }

  addCheckToSession(sessionId: string, check: VerificationCheck): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.checks.push(check);
    session.lastUpdate = new Date().toISOString();
    
    this.notifySubscribers(sessionId, session);
  }

  updateCheck(sessionId: string, updatedCheck: VerificationCheck): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const checkIndex = session.checks.findIndex(c => c.id === updatedCheck.id);
    if (checkIndex !== -1) {
      session.checks[checkIndex] = updatedCheck;
      session.lastUpdate = new Date().toISOString();
      
      this.notifySubscribers(sessionId, session);
    }
  }

  finalizeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const failedChecks = session.checks.filter(c => c.status === 'failed');
    
    session.status = 'completed';
    session.overallStatus = failedChecks.length === 0 ? 'verified' : 'failed';
    session.lastUpdate = new Date().toISOString();
    
    this.notifySubscribers(sessionId, session);
  }

  subscribeToSession(sessionId: string, callback: SessionSubscriber): () => void {
    const callbacks = this.subscribers.get(sessionId) || [];
    callbacks.push(callback);
    this.subscribers.set(sessionId, callbacks);

    return () => {
      const updatedCallbacks = (this.subscribers.get(sessionId) || []).filter(cb => cb !== callback);
      this.subscribers.set(sessionId, updatedCallbacks);
    };
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.subscribers.delete(sessionId);
  }

  clearOldSessions(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000); // 1 hour in milliseconds

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionTime = new Date(session.startTime).getTime();
      if (sessionTime < oneHourAgo) {
        this.clearSession(sessionId);
      }
    }
  }

  private notifySubscribers(sessionId: string, session: VerificationSession): void {
    const callbacks = this.subscribers.get(sessionId) || [];
    callbacks.forEach(callback => callback(session));
  }
}
