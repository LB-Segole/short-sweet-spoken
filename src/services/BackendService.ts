
/**
 * Main Backend Service - Migration Interface
 * 
 * This is the single point of contact for all backend operations.
 * It uses adapter pattern to abstract different backend implementations.
 * 
 * MIGRATION GUIDE:
 * ================
 * 
 * Current State: Uses SupabaseAdapters
 * Future State: Switch to RailwayAdapters
 * 
 * To migrate to Railway:
 * 1. Update BACKEND_TYPE to 'railway'
 * 2. Set RAILWAY_BASE_URL to your Railway deployment
 * 3. Implement any missing methods in RailwayAdapters
 * 4. Test each service method thoroughly
 * 5. No changes needed in React components!
 */

import { 
  AuthAdapter,
  DatabaseAdapter, 
  VoiceServiceAdapter,
  AuthUser,
  DatabaseRecord 
} from './adapters/types';

import { 
  SupabaseAuthAdapter,
  SupabaseDatabaseAdapter,
  SupabaseVoiceServiceAdapter 
} from './adapters/SupabaseAdapter';

import {
  RailwayAuthAdapter,
  RailwayDatabaseAdapter,
  RailwayVoiceServiceAdapter
} from './adapters/RailwayAdapter';

// Migration Configuration
// =====================
// Change these values to switch backends
const BACKEND_TYPE: 'supabase' | 'railway' = 'supabase';
const RAILWAY_BASE_URL = 'https://your-railway-app.railway.app'; // Update when migrating
const RAILWAY_WS_URL = 'wss://your-railway-app.railway.app'; // Update when migrating

export class BackendService {
  private authAdapter: AuthAdapter;
  private databaseAdapter: DatabaseAdapter;
  private voiceServiceAdapter: VoiceServiceAdapter;

  constructor() {
    console.log('🚀 BackendService initializing', { backend: BACKEND_TYPE });
    
    // Adapter Factory Pattern
    // Switch between Supabase and Railway implementations
    if (BACKEND_TYPE === 'railway') {
      console.log('🚂 Using Railway adapters');
      this.authAdapter = new RailwayAuthAdapter(RAILWAY_BASE_URL);
      this.databaseAdapter = new RailwayDatabaseAdapter(RAILWAY_BASE_URL);
      this.voiceServiceAdapter = new RailwayVoiceServiceAdapter(RAILWAY_BASE_URL, RAILWAY_WS_URL);
    } else {
      console.log('🟢 Using Supabase adapters');
      this.authAdapter = new SupabaseAuthAdapter();
      this.databaseAdapter = new SupabaseDatabaseAdapter();
      this.voiceServiceAdapter = new SupabaseVoiceServiceAdapter();
    }
    
    console.log('✅ BackendService initialized successfully');
  }

  // ==========================================
  // AUTH METHODS
  // ==========================================
  // These methods abstract authentication across different backends
  
  async signUp(email: string, password: string): Promise<AuthUser> {
    console.log('🔐 BackendService: Sign up requested', { email });
    return this.authAdapter.signUp(email, password);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    console.log('🔐 BackendService: Sign in requested', { email });
    return this.authAdapter.signIn(email, password);
  }

  async signOut(): Promise<void> {
    console.log('🔐 BackendService: Sign out requested');
    return this.authAdapter.signOut();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    console.log('🔐 BackendService: Get current user requested');
    return this.authAdapter.getCurrentUser();
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    console.log('🔐 BackendService: Setting up auth state listener');
    return this.authAdapter.onAuthStateChange(callback);
  }

  // ==========================================
  // DATABASE METHODS
  // ==========================================
  // These methods abstract database operations across different backends
  
  async select<T = DatabaseRecord>(table: string, query?: any): Promise<T[]> {
    console.log('🗄️ BackendService: Select requested', { table, query });
    return this.databaseAdapter.select<T>(table, query);
  }

  async insert<T = DatabaseRecord>(table: string, data: any): Promise<T> {
    console.log('🗄️ BackendService: Insert requested', { table, data });
    return this.databaseAdapter.insert<T>(table, data);
  }

  async update<T = DatabaseRecord>(table: string, id: string, data: any): Promise<T> {
    console.log('🗄️ BackendService: Update requested', { table, id, data });
    return this.databaseAdapter.update<T>(table, id, data);
  }

  async delete(table: string, id: string): Promise<void> {
    console.log('🗄️ BackendService: Delete requested', { table, id });
    return this.databaseAdapter.delete(table, id);
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    console.log('🗄️ BackendService: Subscribe requested', { table });
    return this.databaseAdapter.subscribe(table, callback);
  }

  // ==========================================
  // VOICE SERVICE METHODS
  // ==========================================
  // These methods abstract voice/WebSocket operations across different backends
  
  createVoiceWebSocketUrl(path: string, params?: Record<string, string>): string {
    console.log('🎙️ BackendService: Create voice WebSocket URL requested', { path, params });
    return this.voiceServiceAdapter.createWebSocketUrl(path, params);
  }

  processAudioData(audioData: Float32Array): string {
    console.log('🎙️ BackendService: Process audio data requested', { length: audioData.length });
    return this.voiceServiceAdapter.processAudioData(audioData);
  }

  handleVoiceMessage(message: any) {
    console.log('🎙️ BackendService: Handle voice message requested', { type: message.type });
    return this.voiceServiceAdapter.handleVoiceMessage(message);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================
  
  getCurrentBackendType(): string {
    return BACKEND_TYPE;
  }

  isRailwayBackend(): boolean {
    return BACKEND_TYPE === 'railway';
  }

  isSupabaseBackend(): boolean {
    return BACKEND_TYPE === 'supabase';
  }
}

// Export singleton instance
export const backendService = new BackendService();

// Export types for components to use
export type { AuthUser, DatabaseRecord };
