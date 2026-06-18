'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Lock, ShieldCheck, AlertCircle, Check, X } from 'lucide-react';

// Password strength rules
const PASSWORD_RULES = [
  { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
];

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { pendingReset, resetPassword, user, loading: authLoading } = useAuth();

  // If user is already logged in and doesn't need reset, go to dashboard
  useEffect(() => {
    if (user && !pendingReset && !authLoading) {
      router.replace('/dashboard');
    }
  }, [user, pendingReset, authLoading, router]);

  // If no pending reset and no user, redirect to login
  useEffect(() => {
    if (!pendingReset && !user && !authLoading) {
      router.replace('/login');
    }
  }, [pendingReset, user, authLoading, router]);

  const allRulesPassed = PASSWORD_RULES.every(rule => rule.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRulesPassed) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const success = await resetPassword(newPassword);
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Failed to reset password. Please try logging in again.');
        setLoading(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div style={{ marginBottom: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <Image 
            src="/turn2law-logo.png" 
            alt="Turn2Law Logo" 
            width={240}
            height={63}
            priority
            style={{ maxWidth: '240px', height: 'auto', display: 'block', marginBottom: 'var(--spacing-sm)' }} 
          />
          <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800 }}>
            Reset Your <span className="accent">Password</span>
          </h1>
        </div>
        <p>
          For your security, you must set a new password before accessing the system. 
          Choose a strong password you&apos;ll remember.
        </p>
        <div style={{
          marginTop: 'var(--spacing-2xl)',
          padding: 'var(--spacing-lg)',
          background: 'rgba(201, 149, 42, 0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(201, 149, 42, 0.2)',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--color-accent)' }}>Why?</strong> Your admin created your account 
            with a temporary password. Setting your own password ensures only you can access your account.
          </div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="login-form-container">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-2xl)',
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="login-form-title" style={{ marginBottom: 2 }}>Set new password</h2>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Your admin has required a password change
              </p>
            </div>
          </div>

          {error && (
            <div className="login-error" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="new-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', left: '12px', top: '50%', 
                    transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)',
                  }} 
                />
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  placeholder="Choose a strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
              </div>

              {/* Password strength indicators */}
              {newPassword.length > 0 && (
                <div style={{ 
                  marginTop: 'var(--spacing-sm)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '4px',
                }}>
                  {PASSWORD_RULES.map((rule, idx) => {
                    const passed = rule.test(newPassword);
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          fontSize: 'var(--font-size-xs)',
                          color: passed ? 'var(--color-done)' : 'var(--color-text-tertiary)',
                          transition: 'color 150ms ease',
                        }}
                      >
                        {passed 
                          ? <Check size={12} style={{ color: 'var(--color-done)' }} />
                          : <X size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                        }
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', left: '12px', top: '50%', 
                    transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)',
                  }} 
                />
                <input
                  id="confirm-password"
                  type="password"
                  className="form-input"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  style={{ 
                    paddingLeft: '40px',
                    borderColor: confirmPassword.length > 0 
                      ? (passwordsMatch ? 'var(--color-done)' : 'var(--color-blocked)') 
                      : undefined,
                  }}
                />
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-blocked)', marginTop: 4 }}>
                  Passwords do not match
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-accent btn-lg w-full"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Setting password...
                </>
              ) : (
                'Set Password & Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
