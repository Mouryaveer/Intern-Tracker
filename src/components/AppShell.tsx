'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Avatar from './Avatar';
import ProfileModal from './ProfileModal';
import { useIsMobile } from '@/lib/useIsMobile';
import {
  LayoutDashboard,
  ClipboardList,
  MessageSquareText,
  Users,
  Calendar,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';

// ── Navigation Items ──
const NAV_ITEMS = [
  { section: 'Overview', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'Work', items: [
    { href: '/tasks', label: 'Task Board', icon: ClipboardList },
    { href: '/standups', label: 'Standups', icon: MessageSquareText },
  ]},
  { section: 'Organization', items: [
    { href: '/people', label: 'People & Teams', icon: Users },
    { href: '/meetings', label: 'Meetings', icon: Calendar },
    { href: '/performance', label: 'Performance', icon: BarChart3 },
  ]},
  { section: 'System', items: [
    { href: '/admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
  ]},
];

// ── Sidebar Component ──
function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, onProfileOpen }: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onProfileOpen: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  React.useEffect(() => {
    if (collapsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowLogoutConfirm(false);
    }
  }, [collapsed]);

  const handleNavClick = (href: string) => {
    router.push(href);
    onMobileClose();
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div 
          className="drawer-overlay" 
          onClick={onMobileClose}
          style={{ zIndex: 99 }}
        />
      )}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <Image 
              src="/turn2law-logo.png" 
              alt="Turn2Law Icon" 
              width={32}
              height={32}
              style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', filter: 'invert(1)' }} 
            />
            {!collapsed && (
              <div>
                <div className="sidebar-logo-text">Turn2Law</div>
                <div className="sidebar-logo-sub">Intern Tracker</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              className="btn-ghost" 
              onClick={onToggle}
              style={{ color: 'rgba(255,255,255,0.5)', padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {collapsed && (
            <button 
              className="btn-ghost" 
              onClick={onToggle}
              style={{ color: 'rgba(255,255,255,0.5)', padding: '4px', background: 'none', border: 'none', cursor: 'pointer', position: 'absolute', right: 8, top: 20 }}
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((section) => {
            const visibleItems = section.items.filter(item => 
              !('adminOnly' in item && item.adminOnly) || isAdmin
            );
            if (visibleItems.length === 0) return null;

            return (
              <div className="sidebar-section" key={section.section}>
                {!collapsed && (
                  <div className="sidebar-section-label">{section.section}</div>
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <button
                      key={item.href}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.href)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar-link-icon">
                        <Icon size={20} />
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer — User Info */}
        <div className={`sidebar-footer${collapsed ? ' sidebar-footer--collapsed' : ''}`}>
          {showLogoutConfirm && !collapsed ? (
            <div className="sidebar-logout-confirm">
              <div className="logout-confirm-title">Sign Out?</div>
              <div className="logout-confirm-desc">Are you sure you want to log out?</div>
              <div className="logout-confirm-buttons">
                <button
                  type="button"
                  className="btn-logout-confirm"
                  onClick={handleLogout}
                  aria-label="Confirm sign out"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  className="btn-logout-cancel"
                  onClick={() => setShowLogoutConfirm(false)}
                  aria-label="Cancel sign out"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sidebar-user">
                {/* Avatar — always visible */}
                <button
                  type="button"
                  onClick={onProfileOpen}
                  className="sidebar-avatar-btn"
                  title="View Profile"
                  aria-label="View Profile"
                >
                  <Avatar name={user?.name || '?'} avatarUrl={user?.avatar_url} size="md" />
                </button>

                {/* User details & buttons — hidden when collapsed */}
                <div className={`sidebar-footer-content sidebar-footer-fade${collapsed ? ' sidebar-footer-fade--hidden' : ''}`}>
                  {user && (
                    <div className="sidebar-user-details" onClick={onProfileOpen}>
                      <div className="sidebar-user-name">{user.name}</div>
                      <div className="sidebar-user-role">{user.role}</div>
                    </div>
                  )}
                  
                  <div className="sidebar-footer-actions">
                    <button
                      type="button"
                      className="sidebar-footer-btn sidebar-btn-theme"
                      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      aria-label="Toggle Theme"
                      onClick={toggleTheme}
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    <button
                      type="button"
                      className="sidebar-footer-btn sidebar-btn-settings"
                      title="Settings"
                      aria-label="Settings"
                      onClick={onProfileOpen}
                    >
                      <Settings size={16} />
                    </button>

                    <button
                      type="button"
                      className="sidebar-footer-btn sidebar-btn-logout"
                      title="Sign Out"
                      aria-label="Sign Out"
                      onClick={() => setShowLogoutConfirm(true)}
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Meta row: version + copyright — fades out when collapsed */}
              <div className={`sidebar-footer-meta sidebar-footer-fade${collapsed ? ' sidebar-footer-fade--hidden' : ''}`}>
                <span>v1.0.0</span>
                <span>© 2026 Turn2Law</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ── TopBar Component ──
function TopBar({ onMobileMenuOpen }: { onMobileMenuOpen: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPageTitle = () => {
    if (pathname === '/dashboard') return `Welcome back, ${user?.name?.split(' ')[0] || 'User'}`;
    if (pathname === '/tasks') return 'Task Board';
    if (pathname === '/standups') return 'Daily Standups';
    if (pathname === '/people') return 'People & Teams';
    if (pathname === '/meetings') return 'Meetings';
    if (pathname === '/performance') return 'Performance';
    if (pathname?.startsWith('/admin')) return 'Admin Panel';
    return 'Intern Tracker';
  };

  const getPageSubtitle = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          className="sidebar-toggle-mobile"
          onClick={onMobileMenuOpen}
          style={{ position: 'static', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
        >
          <Menu size={22} />
        </button>
        <div>
          <div className="topbar-title">{getPageTitle()}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>
            {getPageSubtitle()}
          </div>
        </div>
      </div>
      <div className="topbar-right">
        {user && <Avatar name={user.name} avatarUrl={user.avatar_url} size="md" />}
      </div>
    </header>
  );
}

// ── Protected Layout ──
function ProtectedContent({ children }: { children: React.ReactNode }) {
  const { user, loading, pendingReset } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isMobile } = useIsMobile();

  React.useEffect(() => {
    if (loading) return;

    // Force password reset — redirect to reset page if anywhere else
    if (pendingReset && pathname !== '/reset-password') {
      router.push('/reset-password');
      return;
    }

    // Not authenticated and not on auth pages — redirect to login
    if (!user && !pendingReset && pathname !== '/login' && pathname !== '/reset-password') {
      router.push('/login');
    }
  }, [user, loading, pendingReset, pathname, router]);

  // Auth pages — no shell
  if (pathname === '/login' || pathname === '/reset-password') {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner spinner-lg" />
        <p className="text-secondary">Loading...</p>
      </div>
    );
  }

  // Not authenticated or pending reset
  if (!user) {
    return null;
  }

  return (
    <div className="app-layout">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onProfileOpen={() => setProfileOpen(true)}
      />
      <main className={`main-content${sidebarCollapsed && !isMobile ? ' sidebar-collapsed' : ''}`}>
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}

// ── App Shell ──
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedContent>{children}</ProtectedContent>
  );
}
