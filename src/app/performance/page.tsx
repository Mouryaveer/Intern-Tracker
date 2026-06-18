'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUsers,
  getUsersByTeam,
  getTeams,
  getUserPerformance,
  getTeamMetrics,
  getRecentActivities,
  getUserById,
  getTasks,
  getTeamById,
} from '@/lib/data-service';
import { PerformanceMetrics, TeamMetrics } from '@/lib/types';
import Avatar from '@/components/Avatar';
import {
  BarChart3,
  TrendingUp,
  Target,
  Flame,
  Trophy,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageSquareText,
} from 'lucide-react';
import { useIsMobile } from '@/lib/useIsMobile';

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#0B1F3A', '#C9952A', '#3B82F6', '#16A34A', '#DC2626',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1',
];

function getAvatarColor(name: string): string {
  const idx = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

// ── Metric Ring (Circular Progress) ──
function MetricRing({ value, size = 60, color = 'var(--color-accent)' }: { value: number; size?: number; color?: string }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="6"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

// ── Intern Performance Card ──
function InternPerformanceCard({ userId }: { userId: string }) {
  const user = getUserById(userId);
  const metrics = getUserPerformance(userId);
  const { isMobile } = useIsMobile();

  if (!user) return null;

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
        <Avatar name={user.name} avatarUrl={user.avatar_url} size="lg" />
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{user.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {user.team_id ? getTeamById(user.team_id)?.name : 'No team'}
          </div>
        </div>
        {metrics.standup_streak >= 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
            <Flame size={14} /> {metrics.standup_streak} day streak
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile ? 'var(--spacing-lg)' : 'var(--spacing-md)' }}>
        {/* Tasks Completed */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <MetricRing
              value={metrics.tasks_total > 0 ? (metrics.tasks_completed / metrics.tasks_total) * 100 : 0}
              color="var(--color-done)"
            />
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700, transform: 'rotate(0deg)' }}>
              {metrics.tasks_completed}
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Tasks Done
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
            of {metrics.tasks_total}
          </div>
        </div>

        {/* On-Time Rate */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <MetricRing
              value={metrics.on_time_rate}
              color={metrics.on_time_rate >= 80 ? 'var(--color-done)' : metrics.on_time_rate >= 50 ? 'var(--color-in-progress)' : 'var(--color-blocked)'}
            />
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700, transform: 'rotate(0deg)' }}>
              {metrics.on_time_rate}%
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            On-Time
          </div>
        </div>

        {/* Standup Streak */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <MetricRing
              value={Math.min(metrics.standup_streak * 10, 100)}
              color="var(--color-accent)"
            />
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700, transform: 'rotate(0deg)' }}>
              {metrics.standup_streak}
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Standup Streak
          </div>
        </div>
      </div>

      {/* Attendance Rate */}
      <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Attendance Rate</span>
          <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>{metrics.attendance_rate}%</span>
        </div>
        <div className="progress-bar">
          <div
            className={`progress-bar-fill ${metrics.attendance_rate >= 80 ? 'success' : metrics.attendance_rate >= 50 ? 'warning' : 'danger'}`}
            style={{ width: `${metrics.attendance_rate}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Team Metrics Card ──
function TeamMetricsCard({ teamId }: { teamId: string }) {
  const team = getTeamById(teamId);
  const metrics = getTeamMetrics(teamId);
  const members = getUsersByTeam(teamId);
  const { isMobile } = useIsMobile();

  if (!team) return null;

  return (
    <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-accent-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-accent)',
          fontWeight: 800,
          fontSize: 'var(--font-size-lg)',
        }}>
          {team.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{team.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {metrics.active_members} members
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 'var(--spacing-base)' }}>
        <div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-done)' }}>
            {metrics.completion_rate}%
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Completion Rate</div>
          <div className="progress-bar" style={{ marginTop: 4 }}>
            <div className="progress-bar-fill success" style={{ width: `${metrics.completion_rate}%` }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: 'var(--color-accent)' }}>
            {metrics.standup_compliance}%
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>Standup Compliance</div>
          <div className="progress-bar" style={{ marginTop: 4 }}>
            <div
              className={`progress-bar-fill ${metrics.standup_compliance >= 80 ? 'success' : 'warning'}`}
              style={{ width: `${metrics.standup_compliance}%` }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-base)', marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-light)' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>{metrics.total_tasks}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Total Tasks</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-done)' }}>{metrics.completed_tasks}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Completed</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-in-progress)' }}>{metrics.total_tasks - metrics.completed_tasks}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-tertiary)' }}>Active</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Performance Page ──
export default function PerformancePage() {
  const { user, isAdmin, isLead } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'interns' | 'teams'>('interns');

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || !user) return null;

  const teams = getTeams();
  const allUsers = getUsers().filter(u => u.status === 'active');
  const interns = isAdmin
    ? allUsers.filter(u => u.role === 'intern')
    : isLead && user.team_id
      ? getUsersByTeam(user.team_id).filter(u => u.role === 'intern')
      : [user];

  // Top performers (by tasks completed)
  const internMetrics = interns.map(intern => ({
    user: intern,
    metrics: getUserPerformance(intern.id),
  })).sort((a, b) => b.metrics.tasks_completed - a.metrics.tasks_completed);

  return (
    <div className="animate-slide-up">
      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-value">
              {getTasks().filter(t => t.status === 'done').length}
            </div>
            <div className="stat-label">Total Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon accent">
            <Target size={22} />
          </div>
          <div>
            <div className="stat-value">
              {internMetrics.length > 0 ? Math.round(internMetrics.reduce((acc, m) => acc + m.metrics.on_time_rate, 0) / internMetrics.length) : 0}%
            </div>
            <div className="stat-label">Avg On-Time Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <Flame size={22} />
          </div>
          <div>
            <div className="stat-value">
              {internMetrics.length > 0 ? Math.max(...internMetrics.map(m => m.metrics.standup_streak)) : 0}
            </div>
            <div className="stat-label">Best Streak</div>
          </div>
        </div>
        {internMetrics.length > 0 && (
          <div className="stat-card">
            <div className="stat-icon primary">
              <Trophy size={22} />
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 'var(--font-size-md)' }}>
                {internMetrics[0].user.name.split(' ')[0]}
              </div>
              <div className="stat-label">Top Performer</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'interns' ? 'active' : ''}`} onClick={() => setActiveTab('interns')}>
          Individual Performance
        </button>
        <button className={`tab ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
          Team Performance
        </button>
      </div>

      {activeTab === 'interns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {interns.map(intern => (
            <InternPerformanceCard key={intern.id} userId={intern.id} />
          ))}
        </div>
      )}

      {activeTab === 'teams' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {teams.map(team => (
            <TeamMetricsCard key={team.id} teamId={team.id} />
          ))}
        </div>
      )}

      {/* Contribution Feed */}
      <div style={{ marginTop: 'var(--spacing-2xl)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-base)' }}>
          Recent Contributions
        </h3>
        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <div className="timeline">
            {getRecentActivities(10).map((activity) => {
              const actUser = getUserById(activity.user_id);
              const task = getTasks().find(t => t.id === activity.task_id);
              return (
                <div className="timeline-item" key={activity.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-action">
                      <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{actUser?.name || 'Unknown'}</span>
                      {' '}{activity.action.toLowerCase()}
                      {task && <> &quot;<span style={{ fontWeight: 500 }}>{task.title}</span>&quot;</>}
                    </div>
                    <div className="timeline-meta">
                      {new Date(activity.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
