'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth-context';
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
  X,
  ChevronLeft,
  ChevronRight,
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

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Sidebar Component ──
function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();

  const handleNavClick = (href: string) => {
    router.push(href);
    onMobileClose();
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
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
            <img 
              src="/turn2law-icon.png" 
              alt="Turn2Law Icon" 
              style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', borderRadius: 'var(--radius-sm)' }} 
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
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar avatar-md" style={{ background: 'var(--color-accent)', fontSize: '0.75rem' }}>
              {user ? getInitials(user.name) : '?'}
            </div>
            {!collapsed && user && (
              <div className="sidebar-user-info" style={{ flex: 1 }}>
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                style={{ 
                  color: 'rgba(255,255,255,0.5)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'all 150ms ease',
                }}
                title="Sign out"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
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
        <div className="avatar avatar-md" style={{ display: 'flex' }}>
          {user ? getInitials(user.name) : '?'}
        </div>
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
      />
      <main className="main-content" style={{ marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : undefined }}>
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />
        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}

// ── App Shell (wraps with AuthProvider) ──
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedContent>{children}</ProtectedContent>
    </AuthProvider>
  );
}
