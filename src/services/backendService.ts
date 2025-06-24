
import { supabase } from '@/lib/supabase';

export interface BackendConfig {
  baseUrl: string;
  websocketUrl: string;
  apiKey?: string;
  provider: 'supabase' | 'railway';
}

export interface AuthUser {
  id: string;
  email?: string;
  metadata?: any;
}

export interface DatabaseRecord {
  id: string;
  created_at: string;
  updated_at?: string;
  [key: string]: any;
}

export abstract class BackendService {
  protected config: BackendConfig;

  constructor(config: BackendConfig) {
    this.config = config;
  }

  // Auth methods
  abstract signUp(email: string, password: string): Promise<AuthUser>;
  abstract signIn(email: string, password: string): Promise<AuthUser>;
  abstract signOut(): Promise<void>;
  abstract getCurrentUser(): Promise<AuthUser | null>;
  abstract onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;

  // Database methods
  abstract select<T = DatabaseRecord>(table: string, query?: any): Promise<T[]>;
  abstract insert<T = DatabaseRecord>(table: string, data: any): Promise<T>;
  abstract update<T = DatabaseRecord>(table: string, id: string, data: any): Promise<T>;
  abstract delete(table: string, id: string): Promise<void>;

  // Real-time methods
  abstract subscribe(table: string, callback: (payload: any) => void): () => void;

  // WebSocket methods
  abstract createWebSocket(path: string): string;
}

// Supabase implementation
export class SupabaseService extends BackendService {
  constructor() {
    super({
      baseUrl: 'https://csixccpoxpnwowbgkoyw.supabase.co',
      websocketUrl: 'wss://csixccpoxpnwowbgkoyw.supabase.co',
      provider: 'supabase'
    });
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('User creation failed');
    
    return {
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata
    };
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign in failed');
    
    return {
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ? {
        id: session.user.id,
        email: session.user.email,
        metadata: session.user.user_metadata
      } : null;
      callback(user);
    });
    
    return () => subscription.unsubscribe();
  }

  async select<T = DatabaseRecord>(table: string, query?: any): Promise<T[]> {
    let queryBuilder = supabase.from(table).select('*');
    
    if (query?.where) {
      for (const [column, value] of Object.entries(query.where)) {
        queryBuilder = queryBuilder.eq(column, value);
      }
    }
    
    if (query?.orderBy) {
      queryBuilder = queryBuilder.order(query.orderBy.column, { ascending: query.orderBy.ascending ?? true });
    }
    
    if (query?.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }
    
    const { data, error } = await queryBuilder;
    if (error) throw new Error(error.message);
    return data as T[];
  }

  async insert<T = DatabaseRecord>(table: string, data: any): Promise<T> {
    const { data: result, error } = await supabase.from(table).insert(data).select().single();
    if (error) throw new Error(error.message);
    return result as T;
  }

  async update<T = DatabaseRecord>(table: string, id: string, data: any): Promise<T> {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return result as T;
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
    
    return () => supabase.removeChannel(channel);
  }

  createWebSocket(path: string): string {
    return `${this.config.websocketUrl}/functions/v1/${path}`;
  }
}

// Railway implementation (template for future use)
export class RailwayService extends BackendService {
  constructor(config: Omit<BackendConfig, 'provider'>) {
    super({ ...config, provider: 'railway' });
  }

  async signUp(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) throw new Error('Sign up failed');
    return response.json();
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${this.config.baseUrl}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) throw new Error('Sign in failed');
    return response.json();
  }

  async signOut(): Promise<void> {
    await fetch(`${this.config.baseUrl}/auth/signout`, { method: 'POST' });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/user`);
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    // Implementation would depend on Railway setup
    // Could use WebSocket or polling
    return () => {};
  }

  async select<T = DatabaseRecord>(table: string, query?: any): Promise<T[]> {
    const params = new URLSearchParams();
    if (query) params.append('query', JSON.stringify(query));
    
    const response = await fetch(`${this.config.baseUrl}/api/${table}?${params}`);
    if (!response.ok) throw new Error('Select failed');
    return response.json();
  }

  async insert<T = DatabaseRecord>(table: string, data: any): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}/api/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Insert failed');
    return response.json();
  }

  async update<T = DatabaseRecord>(table: string, id: string, data: any): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}/api/${table}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) throw new Error('Update failed');
    return response.json();
  }

  async delete(table: string, id: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/${table}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Delete failed');
  }

  subscribe(table: string, callback: (payload: any) => void): () => void {
    // Implementation would use WebSocket or SSE
    return () => {};
  }

  createWebSocket(path: string): string {
    return `${this.config.websocketUrl}/${path}`;
  }
}

// Service factory
export function createBackendService(provider: 'supabase' | 'railway' = 'supabase', config?: any): BackendService {
  switch (provider) {
    case 'supabase':
      return new SupabaseService();
    case 'railway':
      return new RailwayService(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Global service instance
export const backendService = createBackendService();
