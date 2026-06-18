'use client';
// ============================================================
// Turn2Law Intern Tracker — Auth Context (Supabase)
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from './types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: Profile | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  pendingReset: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; mustReset?: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (newPassword: string) => Promise<boolean>;
  setUser: (user: Profile) => void;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isLead: boolean;
  isIntern: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingReset, setPendingReset] = useState(false);

  const supabase = createClient();

  // Fetch user profile via server-side API route (bypasses RLS)
  const fetchProfile = useCallback(async (_userId: string): Promise<Profile | null> => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return null;
      const { profile } = await res.json();
      return profile as Profile ?? null;
    } catch {
      return null;
    }
  }, []);

  // Refresh profile from database
  const refreshProfile = useCallback(async () => {
    if (!supabaseUser) return;
    const profile = await fetchProfile(supabaseUser.id);
    if (profile) {
      setUser(profile);
      if (profile.must_reset_password) {
        setPendingReset(true);
      }
    }
  }, [supabaseUser, fetchProfile]);

  // Initialize: check existing session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setSupabaseUser(authUser);
          const profile = await fetchProfile(authUser.id);

          if (profile) {
            if (profile.status !== 'active') {
              // User is deactivated — sign them out
              await supabase.auth.signOut();
              setUser(null);
              setSupabaseUser(null);
            } else if (profile.must_reset_password) {
              setPendingReset(true);
              setUser(profile); // Set user so reset page can access name
            } else {
              setUser(profile);
            }
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setSupabaseUser(session.user);
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            if (profile.must_reset_password) {
              setPendingReset(true);
              setUser(profile);
            } else {
              setUser(profile);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSupabaseUser(null);
          setPendingReset(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSupabaseUser(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message === 'Invalid login credentials'
            ? 'Invalid email or password'
            : error.message,
        };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id);

        if (!profile) {
          return { success: false, error: 'Account profile not found. Contact your admin.' };
        }

        if (profile.status !== 'active') {
          await supabase.auth.signOut();
          return { success: false, error: 'Account is deactivated. Contact your admin.' };
        }

        if (profile.must_reset_password) {
          setSupabaseUser(data.user);
          setUser(profile);
          setPendingReset(true);
          return { success: true, mustReset: true };
        }

        setSupabaseUser(data.user);
        setUser(profile);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Login failed',
      };
    }
  }, [supabase, fetchProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
    setPendingReset(false);
  }, [supabase]);

  const resetPassword = useCallback(async (newPassword: string): Promise<boolean> => {
    try {
      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        console.error('Password update error:', authError);
        return false;
      }

      // Update must_reset_password flag in profiles
      if (supabaseUser) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_reset_password: false })
          .eq('id', supabaseUser.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Password was changed but flag wasn't cleared — still let them proceed
        }

        const profile = await fetchProfile(supabaseUser.id);
        if (profile) {
          setUser(profile);
        }
      }

      setPendingReset(false);
      return true;
    } catch (err) {
      console.error('Reset password error:', err);
      return false;
    }
  }, [supabase, supabaseUser, fetchProfile]);

  const value: AuthContextType = {
    user,
    supabaseUser,
    loading,
    pendingReset,
    login,
    logout,
    resetPassword,
    setUser,
    refreshProfile,
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
