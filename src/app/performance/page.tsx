'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  getUsers,
  getTeams,
  getUserPerformance,
  getTeamMetrics,
  getRecentActivities,
  getTasks,
} from '@/lib/data-service';
import { PerformanceMetrics, TeamMetrics, Profile, Team, TaskActivity, Task } from '@/lib/types';
import Avatar from '@/components/Avatar';
import {
  Target,
  Flame,
  Trophy,
  CheckCircle2,
} from 'lucide-react';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';

// ── Metric Ring (Circular Progress) ──
function MetricRing({ value, size = 48, color = 'var(--color-accent)' }: { value: number; size?: number; color?: string }) {
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
interface InternPerformanceCardProps {
  intern: Profile;
  metrics: PerformanceMetrics | undefined;
  teamName: string;
}

function InternPerformanceCard({ intern, metrics, teamName }: InternPerformanceCardProps) {
  if (!metrics) return null;

  return (
    <div className="card" style={{ padding: 'var(--spacing-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <Avatar name={intern.name} avatarUrl={intern.avatar_url} size="lg" />
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>{intern.name}</div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            {teamName}
          </div>
        </div>
        {metrics.standup_streak >= 3 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-accent)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
            <Flame size={14} /> {metrics.standup_streak} day streak
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
        {/* Tasks Completed */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <MetricRing
              value={metrics.tasks_total > 0 ? (metrics.tasks_completed / metrics.tasks_total) * 100 : 0}
              color="var(--color-done)"
            />
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
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
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
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
            <div style={{ position: 'absolute', fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
              {metrics.standup_streak}
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Standup Streak
          </div>
        </div>
      </div>

      {/* Attendance Rate */}
      <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border-light)' }}>
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
interface TeamMetricsCardProps {
  team: Team;
  metrics: TeamMetrics | undefined;
}

function TeamMetricsCard({ team, metrics }: TeamMetricsCardProps) {
  if (!metrics) return null;

  return (
    <div className="card" style={{ padding: 'var(--spacing-base)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-base)' }}>
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

      <div style={{ display: 'flex', gap: 'var(--spacing-base)', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border-light)' }}>
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
  const [activeTab, setActiveTab] = useState<'interns' | 'teams'>('interns');
  
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActivities, setRecentActivities] = useState<TaskActivity[]>([]);
  const [userPerformanceMap, setUserPerformanceMap] = useState<Record<string, PerformanceMetrics>>({});
  const [teamMetricsMap, setTeamMetricsMap] = useState<Record<string, TeamMetrics>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [fetchedUsers, fetchedTeams, fetchedTasks, fetchedActivities] = await Promise.all([
        getUsers(),
        getTeams(),
        getTasks(),
        getRecentActivities(10),
      ]);

      setAllUsers(fetchedUsers);
      setAllTeams(fetchedTeams);
      setTasks(fetchedTasks);
      setRecentActivities(fetchedActivities);

      // Determine interns to calculate metrics for
      const internsList = isAdmin
        ? fetchedUsers.filter(u => u.role === 'intern')
        : isLead && user.team_id
          ? fetchedUsers.filter(u => u.team_id === user.team_id && u.role === 'intern')
          : [user];

      // Fetch user performances in parallel
      const perfResults = await Promise.all(
        internsList.map(async (intern) => {
          const perf = await getUserPerformance(intern.id);
          return { id: intern.id, perf };
        })
      );
      const perfMap: Record<string, PerformanceMetrics> = {};
      perfResults.forEach(r => { perfMap[r.id] = r.perf; });
      setUserPerformanceMap(perfMap);

      // Fetch team metrics in parallel
      const teamResults = await Promise.all(
        fetchedTeams.map(async (team) => {
          const metrics = await getTeamMetrics(team.id);
          return { id: team.id, metrics };
        })
      );
      const teamMap: Record<string, TeamMetrics> = {};
      teamResults.forEach(r => { teamMap[r.id] = r.metrics; });
      setTeamMetricsMap(teamMap);

    } catch (err) {
      console.error('Error loading performance data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isLead]);

  useEffect(() => {
    void Promise.resolve().then(loadData);

    // Subscribe to realtime updates
    const tasksChannel = subscribeToTable({
      table: 'tasks',
      callback: () => loadData(),
    });
    const standupsChannel = subscribeToTable({
      table: 'standups',
      callback: () => loadData(),
    });
    const profilesChannel = subscribeToTable({
      table: 'profiles',
      callback: () => loadData(),
    });
    const activityChannel = subscribeToTable({
      table: 'task_activity',
      callback: () => loadData(),
    });

    return () => {
      unsubscribe(tasksChannel);
      unsubscribe(standupsChannel);
      unsubscribe(profilesChannel);
      unsubscribe(activityChannel);
    };
  }, [loadData]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card skeleton-pulse" style={{ height: 100, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
        <div className="skeleton-pulse" style={{ height: 40, width: 300, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-xl)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton-pulse" style={{ height: 200, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
      </div>
    );
  }

  // Active interns
  const interns = isAdmin
    ? allUsers.filter(u => u.role === 'intern' && u.status === 'active')
    : isLead && user.team_id
      ? allUsers.filter(u => u.team_id === user.team_id && u.role === 'intern' && u.status === 'active')
      : [user];

  // Top performers
  const internMetrics = interns.map(intern => ({
    user: intern,
    metrics: userPerformanceMap[intern.id],
  }))
  .filter(item => item.metrics !== undefined)
  .sort((a, b) => b.metrics.tasks_completed - a.metrics.tasks_completed);

  const avgOnTimeRate = internMetrics.length > 0 
    ? Math.round(internMetrics.reduce((acc, m) => acc + m.metrics.on_time_rate, 0) / internMetrics.length) 
    : 0;

  const bestStreak = internMetrics.length > 0 
    ? Math.max(...internMetrics.map(m => m.metrics.standup_streak)) 
    : 0;

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
              {tasks.filter(t => t.status === 'done').length}
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
              {avgOnTimeRate}%
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
              {bestStreak}
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
          {interns.map(intern => {
            const team = allTeams.find(t => t.id === intern.team_id);
            return (
              <InternPerformanceCard 
                key={intern.id} 
                intern={intern} 
                metrics={userPerformanceMap[intern.id]}
                teamName={team ? team.name : 'No team'}
              />
            );
          })}
        </div>
      )}

      {activeTab === 'teams' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-base)' }}>
          {allTeams.map(team => (
            <TeamMetricsCard 
              key={team.id} 
              team={team} 
              metrics={teamMetricsMap[team.id]} 
            />
          ))}
        </div>
      )}

      {/* Contribution Feed */}
      <div style={{ marginTop: 'var(--spacing-2xl)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-base)' }}>
          Recent Contributions
        </h3>
        <div className="card" style={{ padding: 'var(--spacing-base)' }}>
          <div className="timeline">
            {recentActivities.map((activity) => {
              const actUser = allUsers.find(u => u.id === activity.user_id);
              const task = tasks.find(t => t.id === activity.task_id);
              return (
                <div className="timeline-item" key={activity.id}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-action">
                      <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{actUser?.name || 'Unknown'}</span>
                      {' '}{activity.action.toLowerCase()}
                      {task ? (
                        <> &quot;<span style={{ fontWeight: 500 }}>{task.title}</span>&quot;</>
                      ) : (
                        <> task</>
                      )}
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
