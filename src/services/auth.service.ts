
import api from './api';
import { User } from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/login', credentials);
    localStorage.setItem('auth_token', response.data.token);
    return response.data;
  }

  async register(data: RegisterData): Promise<{ token: string; user: User }> {
    const response = await api.post('/auth/register', data);
    localStorage.setItem('auth_token', response.data.token);
    return response.data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('auth_token');
    return api.post('/auth/logout');
  }

  async getProfile(): Promise<User> {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }
}

export const authService = new AuthService();
