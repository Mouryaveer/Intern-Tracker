'use client';

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const { login } = useAuth();

  const colors = {
    navy: "#0E1626",
    paper: "#FAF8F4",
    brass: "#C99A3E",
    slate: "#8C97AC",
    hairline: "#E4DFD5",
  };

  const fonts = {
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (!result.success) {
        setError(result.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      if (result.mustReset) {
        router.push('/reset-password');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const ascentPoints = [
    [30, 780],
    [30, 600],
    [150, 600],
    [150, 380],
    [270, 380],
    [270, 140],
    [370, 140],
    [370, 30],
  ];

  return (
    <div
      className={styles.container}
      style={{ fontFamily: fonts.body }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
      `}</style>

      {/* LEFT PANEL */}
      <div
        className={styles.leftPanel}
        style={{
          backgroundColor: colors.navy,
          backgroundImage:
            "radial-gradient(circle, rgba(201,154,62,0.18) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          minHeight: "420px",
        }}
      >
        {/* Signature ascent line — echoes the N-arrow logomark at panel scale */}
        <svg
          className={styles.bgSvg}
          viewBox="0 0 400 800"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points={ascentPoints.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke={colors.brass}
            strokeWidth="1.5"
            strokeOpacity="0.35"
          />
          {ascentPoints.map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="4"
              fill={colors.brass}
              fillOpacity="0.4"
            />
          ))}
        </svg>

        <div className={styles.relativeZ10}>
          <span
            className={styles.brandTag}
            style={{ fontFamily: fonts.mono, color: colors.brass }}
          >
            TURN2LAW · EST. 2023
          </span>

          <div
            className={styles.logoContainer}
            style={{ backgroundColor: colors.paper }}
          >
            <Image
              src="/turn2law-logo.png"
              alt="Turn2Law Logo"
              width={52}
              height={52}
              className={styles.logoImage}
              priority
            />
          </div>

          <h1
            className={styles.titleFirst}
            style={{ fontFamily: fonts.display, color: colors.paper }}
          >
            Intern
          </h1>
          <h1
            className={styles.titleSecond}
            style={{ fontFamily: fonts.display, color: colors.brass }}
          >
            Tracker
          </h1>

          <p
            className={styles.subtitle}
            style={{ color: colors.slate }}
          >
            The operating system for Turn2Law&apos;s tech workflow. Track tasks,
            standups, attendance, and performance — all in one place.
          </p>
        </div>

        <div className={styles.statsContainer}>
          {[
            ["50+", "INTERNS"],
            ["3", "SQUADS"],
            ["∞", "PRODUCTIVITY"],
          ].map(([num, label]) => (
            <div key={label}>
              <div
                className={styles.statValue}
                style={{ fontFamily: fonts.mono, color: colors.brass }}
              >
                {num}
              </div>
              <div
                className={styles.statLabel}
                style={{ color: colors.slate }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        className={styles.rightPanel}
        style={{ backgroundColor: colors.paper }}
      >
        <div
          className={styles.cornerBadge}
          style={{ backgroundColor: colors.navy }}
        >
          <Image
            src="/turn2law-logo.png"
            alt="Turn2Law"
            width={22}
            height={22}
            className={styles.cornerBadgeImg}
            priority
          />
        </div>

        <form onSubmit={handleSubmit} className={styles.formWrapper}>
          <span
            className={styles.formHeaderTag}
            style={{ fontFamily: fonts.mono, color: colors.brass }}
          >
            TURN2LAW · INTERNAL ACCESS
          </span>

          <h2
            className={styles.formTitle}
            style={{ fontFamily: fonts.display, color: colors.navy }}
          >
            Sign in
          </h2>

          <p className={styles.formSubtitle} style={{ color: colors.slate }}>
            Sign in with the credentials your admin issued you.
          </p>

          {error && (
            <div 
              className={styles.errorBanner} 
              style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
            >
              <AlertCircle className={styles.iconSmall} />
              {error}
            </div>
          )}

          <div
            className={styles.divider}
            style={{ borderColor: colors.hairline }}
          />

          {/* Email */}
          <label
            className={styles.inputLabel}
            style={{ color: colors.navy }}
          >
            Email address
          </label>
          <div
            className={styles.inputGroup}
            style={{
              borderColor:
                focusedField === "email" ? colors.brass : colors.hairline,
            }}
          >
            <Mail className={styles.iconSmall} style={{ color: colors.slate }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              placeholder="you@turn2law.in"
              className={styles.inputField}
              style={{ color: colors.navy }}
            />
          </div>

          {/* Password */}
          <label
            className={styles.inputLabel}
            style={{ color: colors.navy }}
          >
            Password
          </label>
          <div
            className={styles.inputGroupLast}
            style={{
              borderColor:
                focusedField === "password" ? colors.brass : colors.hairline,
            }}
          >
            <Lock className={styles.iconSmall} style={{ color: colors.slate }} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
              placeholder="Enter your password"
              className={styles.inputField}
              style={{ color: colors.navy }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className={styles.iconButton}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className={styles.iconSmall} style={{ color: colors.slate }} />
              ) : (
                <Eye className={styles.iconSmall} style={{ color: colors.slate }} />
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitBtn}
            style={{ backgroundColor: colors.brass, color: colors.paper }}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
