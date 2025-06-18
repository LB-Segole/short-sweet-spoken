
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { validatePassword } from '../utils/validation';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  countryCode?: string;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  updateProfile: (data: ProfileData) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'user',
          createdAt: session.user.created_at
        });
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          role: 'user',
          createdAt: session.user.created_at
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (data.user) {
        const userData: User = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
          email: data.user.email || '',
          role: 'user',
          createdAt: data.user.created_at
        };
        setUser(userData);
        
        toast.success('Login successful', {
          description: `Welcome back, ${userData.name}!`,
        });
      }
    } catch (error: any) {
      toast.error('Login failed', {
        description: error.message || "Invalid email or password",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet requirements: ' + passwordValidation.errors.join(', '));
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (error) throw error;

      if (authData.user) {
        toast.success('Registration successful', {
          description: `Welcome, ${data.name}! Please check your email to verify your account.`,
        });
      }
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || "Could not create account",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      toast.success('Logged out', {
        description: "You have been successfully logged out",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (newPassword: string, currentPassword?: string) => {
    setIsLoading(true);
    try {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error('Password does not meet requirements');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profileData: ProfileData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: profileData.email,
        data: {
          name: profileData.name,
          phone: profileData.phone,
          countryCode: profileData.countryCode,
          address: profileData.address,
          city: profileData.city,
          country: profileData.country,
          postalCode: profileData.postalCode,
        }
      });

      if (error) throw error;

      if (user) {
        setUser({
          ...user,
          name: profileData.name,
          email: profileData.email,
        });
      }
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user, 
        login, 
        register, 
        logout,
        resetPassword,
        updatePassword,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
