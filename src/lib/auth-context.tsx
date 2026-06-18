'use client';
// ============================================================
// Turn2Law Intern Tracker — Auth Context
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { authenticateUser, updateUser, getUserById, initDataLayer } from './data-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  pendingReset: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string; mustReset?: boolean };
  logout: () => void;
  resetPassword: (newPassword: string) => boolean;
  setUser: (user: User) => void;
  isAdmin: boolean;
  isLead: boolean;
  isIntern: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReset, setPendingReset] = useState(false);

  useEffect(() => {
    // Initialize data layer
    initDataLayer();

    // Check for pending password reset first
    const resetUserId = localStorage.getItem('reset_user_id');
    if (resetUserId) {
      setPendingReset(true);
      setLoading(false);
      return;
    }

    // Check for existing session
    const savedSession = localStorage.getItem('current_user');
    if (savedSession) {
      try {
        const parsed: User = JSON.parse(savedSession);
        // Re-verify user still exists and is active
        const freshUser = getUserById(parsed.id);
        if (freshUser && freshUser.status === 'active') {
          // If user now needs to reset (admin toggled flag), force reset
          if (freshUser.must_reset_password) {
            localStorage.setItem('reset_user_id', freshUser.id);
            localStorage.removeItem('current_user');
            setPendingReset(true);
          } else {
            setUser(freshUser);
          }
        } else {
          localStorage.removeItem('current_user');
        }
      } catch {
        localStorage.removeItem('current_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const authenticated = authenticateUser(email, password);
    if (!authenticated) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (authenticated.status !== 'active') {
      return { success: false, error: 'Account is deactivated. Contact your admin.' };
    }

    if (authenticated.must_reset_password) {
      // Store user ID for password reset flow — do NOT grant full access
      localStorage.setItem('reset_user_id', authenticated.id);
      setPendingReset(true);
      return { success: true, mustReset: true };
    }

    setUser(authenticated);
    localStorage.setItem('current_user', JSON.stringify(authenticated));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setPendingReset(false);
    localStorage.removeItem('current_user');
    localStorage.removeItem('reset_user_id');
  }, []);

  const resetPassword = useCallback((newPassword: string) => {
    const resetUserId = localStorage.getItem('reset_user_id');
    if (!resetUserId) return false;

    // updateUser will hash the password via data-service
    const updated = updateUser(resetUserId, {
      password: newPassword,
      must_reset_password: false,
    });

    if (updated) {
      setUser(updated);
      setPendingReset(false);
      localStorage.setItem('current_user', JSON.stringify(updated));
      localStorage.removeItem('reset_user_id');
      return true;
    }
    return false;
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    pendingReset,
    login,
    logout,
    resetPassword,
    setUser,
    isAdmin: user?.role === 'admin',
    isLead: user?.role === 'lead',
    isIntern: user?.role === 'intern',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
