'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  phoneNumber: string;
  role: string;
  kycVerified: boolean;
  balanceKes: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'LOGIN' | 'REGISTER') => void;
  closeAuthModal: () => void;
  authMode: 'LOGIN' | 'REGISTER' | 'OTP';
  setAuthMode: (mode: 'LOGIN' | 'REGISTER' | 'OTP') => void;
  setAuthData: (token: string, user: User) => void;
  logout: () => void;
  updateBalance: (newBalanceKes: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'OTP'>('LOGIN');

  // Hydrate session from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('betpoake_token');
      const storedUser = localStorage.getItem('betpoake_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        const parsed = JSON.parse(storedUser);
        setUser({
          ...parsed,
          balanceKes: parsed.balanceKes ?? 0, // Enforces 0.00 balance
        });
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);

  const setAuthData = (jwt: string, userData: User) => {
    setToken(jwt);
    setUser(userData);
    localStorage.setItem('betpoake_token', jwt);
    localStorage.setItem('betpoake_user', JSON.stringify(userData));
    closeAuthModal();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('betpoake_token');
    localStorage.removeItem('betpoake_user');
  };

  const updateBalance = (newBalanceKes: number) => {
    if (user) {
      const updated = { ...user, balanceKes: newBalanceKes };
      setUser(updated);
      localStorage.setItem('betpoake_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authMode,
        setAuthMode,
        setAuthData,
        logout,
        updateBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
