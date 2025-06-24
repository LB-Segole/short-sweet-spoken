
/**
 * React Hook for Backend Service
 * 
 * This hook provides React components with easy access to backend operations
 * while maintaining the abstraction layer for easy migration.
 * 
 * Usage in components:
 * ```typescript
 * const { auth, database, voice } = useBackendService();
 * 
 * // Auth operations
 * const user = await auth.signIn(email, password);
 * 
 * // Database operations
 * const records = await database.select('table_name');
 * 
 * // Voice operations
 * const wsUrl = voice.createWebSocketUrl('voice-chat');
 * ```
 */

import { useCallback } from 'react';
import { backendService, AuthUser, DatabaseRecord } from '../services/BackendService';

export const useBackendService = () => {
  // Auth operations
  const auth = {
    signUp: useCallback(async (email: string, password: string): Promise<AuthUser> => {
      return backendService.signUp(email, password);
    }, []),

    signIn: useCallback(async (email: string, password: string): Promise<AuthUser> => {
      return backendService.signIn(email, password);
    }, []),

    signOut: useCallback(async (): Promise<void> => {
      return backendService.signOut();
    }, []),

    getCurrentUser: useCallback(async (): Promise<AuthUser | null> => {
      return backendService.getCurrentUser();
    }, []),

    onAuthStateChange: useCallback((callback: (user: AuthUser | null) => void): (() => void) => {
      return backendService.onAuthStateChange(callback);
    }, [])
  };

  // Database operations
  const database = {
    select: useCallback(async <T = DatabaseRecord>(table: string, query?: any): Promise<T[]> => {
      return backendService.select<T>(table, query);
    }, []),

    insert: useCallback(async <T = DatabaseRecord>(table: string, data: any): Promise<T> => {
      return backendService.insert<T>(table, data);
    }, []),

    update: useCallback(async <T = DatabaseRecord>(table: string, id: string, data: any): Promise<T> => {
      return backendService.update<T>(table, id, data);
    }, []),

    delete: useCallback(async (table: string, id: string): Promise<void> => {
      return backendService.delete(table, id);
    }, []),

    subscribe: useCallback((table: string, callback: (payload: any) => void): (() => void) => {
      return backendService.subscribe(table, callback);
    }, [])
  };

  // Voice service operations
  const voice = {
    createWebSocketUrl: useCallback((path: string, params?: Record<string, string>): string => {
      return backendService.createVoiceWebSocketUrl(path, params);
    }, []),

    processAudioData: useCallback((audioData: Float32Array): string => {
      return backendService.processAudioData(audioData);
    }, []),

    handleMessage: useCallback((message: any) => {
      return backendService.handleVoiceMessage(message);
    }, [])
  };

  // Utility functions
  const utils = {
    getCurrentBackendType: useCallback((): string => {
      return backendService.getCurrentBackendType();
    }, []),

    isRailway: useCallback((): boolean => {
      return backendService.isRailwayBackend();
    }, []),

    isSupabase: useCallback((): boolean => {
      return backendService.isSupabaseBackend();
    }, [])
  };

  return {
    auth,
    database,
    voice,
    utils
  };
};

export default useBackendService;
