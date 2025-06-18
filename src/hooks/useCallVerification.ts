
import { useState, useEffect, useCallback } from 'react';
import { callVerificationService, CallVerificationSession } from '@/services/callVerification.service';

export const useCallVerification = () => {
  const [sessions, setSessions] = useState<CallVerificationSession[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Poll for session updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(callVerificationService.getAllSessions());
    }, 2000);

    // Clean up old sessions every 5 minutes
    const cleanupInterval = setInterval(() => {
      callVerificationService.clearOldSessions();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, []);

  const startVerification = useCallback(async (callId: string, phoneNumber: string) => {
    setIsRunning(true);
    try {
      const sessionId = await callVerificationService.startVerificationSession(callId, phoneNumber);
      console.log(`🔍 Started ring verification session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Failed to start ring verification:', error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const getSession = useCallback((sessionId: string) => {
    return callVerificationService.getSessionResults(sessionId);
  }, []);

  const getLatestSession = useCallback(() => {
    const allSessions = callVerificationService.getAllSessions();
    return allSessions.length > 0 
      ? allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
      : null;
  }, []);

  return {
    sessions,
    isRunning,
    startVerification,
    getSession,
    getLatestSession
  };
};
