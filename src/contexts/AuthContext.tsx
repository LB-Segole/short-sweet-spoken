
import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = async (email: string, _password: string) => {
    // Mock login implementation
    console.log('Login attempt:', email);
    setCurrentUser({ id: '1', email });
  };

  const logout = async () => {
    setCurrentUser(null);
  };

  const signup = async (email: string, _password: string) => {
    // Mock signup implementation
    console.log('Signup attempt:', email);
    setCurrentUser({ id: '1', email });
  };

  const value = {
    currentUser,
    login,
    logout,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
