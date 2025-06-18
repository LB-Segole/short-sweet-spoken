
import { supabase } from '@/integrations/supabase/client';
import { VerificationCheck, VerificationSession } from './types';
import { VerificationChecksService } from './checksService';
import { SessionManager } from './sessionManager';

export class CallVerificationService {
  private checksService = new VerificationChecksService();
  private sessionManager = new SessionManager();

  async createVerificationSession(callId: string, phoneNumber: string): Promise<string> {
    const sessionId = this.sessionManager.createSession(callId, phoneNumber);
    
    // Start verification process
    this.runVerificationChecks(sessionId);
    
    return sessionId;
  }

  // Alias for backward compatibility
  async startVerificationSession(callId: string, phoneNumber: string): Promise<string> {
    return this.createVerificationSession(callId, phoneNumber);
  }

  // Simple method to start verification directly
  startVerification(callId: string, phoneNumber: string): string {
    const sessionId = this.sessionManager.createSession(callId, phoneNumber);
    
    // Start verification process asynchronously
    setTimeout(() => this.runVerificationChecks(sessionId), 100);
    
    return sessionId;
  }

  subscribeToSession(sessionId: string, callback: (session: VerificationSession) => void): () => void {
    return this.sessionManager.subscribeToSession(sessionId, callback);
  }

  private async runVerificationChecks(sessionId: string): Promise<void> {
    // Check 1: SignalWire API connectivity
    await this.runAndUpdateCheck(sessionId, () => this.checksService.runSignalWireApiCheck());
    
    // Check 2: Call connection
    await this.runAndUpdateCheck(sessionId, () => this.checksService.runCallConnectionCheck());
    
    // Check 3: Audio stream quality
    await this.runAndUpdateCheck(sessionId, () => this.checksService.runAudioStreamCheck());
    
    // Check 4: AI response time
    await this.runAndUpdateCheck(sessionId, () => this.checksService.runAIResponseCheck());
    
    // Finalize session
    this.sessionManager.finalizeSession(sessionId);
  }

  private async runAndUpdateCheck(sessionId: string, checkFunction: () => Promise<VerificationCheck>): Promise<void> {
    const check = await checkFunction();
    this.sessionManager.addCheckToSession(sessionId, { ...check, status: 'pending' });
    
    const completedCheck = await checkFunction();
    this.sessionManager.updateCheck(sessionId, completedCheck);
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
        type: this.checksService.mapLogTypeToVerificationType(log.speaker),
        status: (log.confidence || 0) > 0.8 ? 'passed' : 'failed',
        details: log.content,
        timestamp: log.timestamp || new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Error fetching call logs:', error);
      return [];
    }
  }

  getSession(sessionId: string): VerificationSession | undefined {
    return this.sessionManager.getSession(sessionId);
  }

  getSessionResults(sessionId: string): VerificationSession | null {
    return this.sessionManager.getSession(sessionId) || null;
  }

  getAllSessions(): VerificationSession[] {
    return this.sessionManager.getAllSessions();
  }

  clearSession(sessionId: string): void {
    this.sessionManager.clearSession(sessionId);
  }

  clearOldSessions(): void {
    this.sessionManager.clearOldSessions();
  }
}

export const callVerificationService = new CallVerificationService();
