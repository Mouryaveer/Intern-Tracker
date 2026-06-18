'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        setLoading(false);
        return;
      }

      if (result.mustReset) {
        router.push('/reset-password');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Brand Side */}
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
            Intern <span className="accent">Tracker</span>
          </h1>
        </div>
        <p>
          The operating system for Turn2Law&apos;s tech workflow. 
          Track tasks, standups, attendance, and performance — all in one place.
        </p>
        <div style={{
          marginTop: 'var(--spacing-3xl)',
          display: 'flex',
          gap: 'var(--spacing-2xl)',
          position: 'relative',
          zIndex: 1,
        }}>
          {[
            { value: '50+', label: 'Interns' },
            { value: '3', label: 'Squads' },
            { value: '∞', label: 'Productivity' },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-accent)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.4)' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Login Form Side */}
      <div className="login-form-section">
        <div className="login-form-container">
          <h2 className="login-form-title">Sign in</h2>
          <p className="login-form-subtitle">
            Enter the credentials provided by your admin
          </p>

          {error && (
            <div className="login-error" style={{ marginBottom: 'var(--spacing-xl)' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)',
                  }} 
                />
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="you@turn2law.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-tertiary)',
                  }} 
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-tertiary)',
                    padding: '2px',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-accent btn-lg w-full"
              disabled={loading}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
