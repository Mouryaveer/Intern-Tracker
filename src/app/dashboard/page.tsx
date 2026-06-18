'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getTasks,
  getTasksByAssignee,
  getTasksByTeam,
  getTodayStandup,
  getUpcomingMeetings,
  getStandupsByDate,
  getUsers,
  getRecentActivities,
  getTeams,
} from '@/lib/data-service';
import { Task, TaskActivity, Profile, Meeting, Standup, Team } from '@/lib/types';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquareText,
  Calendar,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { subscribeToTable, unsubscribe } from '@/lib/realtime';

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage() {
  const { user, isAdmin, isLead, isIntern } = useAuth();
  const router = useRouter();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todayStandup, setTodayStandup] = useState<Standup | null>(null);
  const [todayStandups, setTodayStandups] = useState<Standup[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentActivities, setRecentActivities] = useState<TaskActivity[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      // Parallel fetches for efficiency
      const [
        fetchedAllUsers,
        fetchedAllTeams,
        fetchedUpcomingMeetings,
        fetchedRecentActivities,
      ] = await Promise.all([
        getUsers(),
        getTeams(),
        getUpcomingMeetings(),
        getRecentActivities(8),
      ]);

      setAllUsers(fetchedAllUsers);
      setAllTeams(fetchedAllTeams);
      setUpcomingMeetings(fetchedUpcomingMeetings.slice(0, 3));
      setRecentActivities(fetchedRecentActivities);

      // Tasks scoping based on role
      let scopedTasks: Task[] = [];
      if (isAdmin) {
        scopedTasks = await getTasks();
      } else if (isLead && user.team_id) {
        scopedTasks = await getTasksByTeam(user.team_id);
      } else {
        scopedTasks = await getTasksByAssignee(user.id);
      }
      setTasks(scopedTasks);

      // Standups data
      const today = new Date().toISOString().split('T')[0];
      const [fetchedTodayStandup, fetchedTodayStandups] = await Promise.all([
        getTodayStandup(user.id),
        getStandupsByDate(today),
      ]);
      setTodayStandup(fetchedTodayStandup);
      setTodayStandups(fetchedTodayStandups);

      // Team members scoping
      let members: Profile[] = [];
      if (user.team_id) {
        members = fetchedAllUsers.filter(u => u.team_id === user.team_id && u.role === 'intern');
      } else {
        members = fetchedAllUsers.filter(u => u.role === 'intern');
      }
      setTeamMembers(members);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isLead]);

  useEffect(() => {
    if (user) {
      void Promise.resolve().then(loadDashboardData);

      // Subscribe to realtime updates
      const tasksChannel = subscribeToTable({
        table: 'tasks',
        callback: () => loadDashboardData(),
      });
      const standupsChannel = subscribeToTable({
        table: 'standups',
        callback: () => loadDashboardData(),
      });
      const meetingsChannel = subscribeToTable({
        table: 'meetings',
        callback: () => loadDashboardData(),
      });
      const activityChannel = subscribeToTable({
        table: 'task_activity',
        callback: () => loadDashboardData(),
      });

      return () => {
        unsubscribe(tasksChannel);
        unsubscribe(standupsChannel);
        unsubscribe(meetingsChannel);
        unsubscribe(activityChannel);
      };
    }
  }, [user, loadDashboardData]);

  if (loading || !user) {
    return (
      <div className="animate-slide-up" style={{ padding: 'var(--spacing-xl) 0' }}>
        {/* Skeleton Stats Grid */}
        <div className="stats-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card skeleton-pulse" style={{ height: 100, border: 'none', background: 'var(--color-surface)' }} />
          ))}
        </div>
        
        {/* Skeleton Content Grid */}
        <div className="grid-2" style={{ gap: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div className="card skeleton-pulse" style={{ height: 120, border: 'none', background: 'var(--color-surface)' }} />
            <div className="card skeleton-pulse" style={{ height: 350, border: 'none', background: 'var(--color-surface)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div className="card skeleton-pulse" style={{ height: 250, border: 'none', background: 'var(--color-surface)' }} />
            <div className="card skeleton-pulse" style={{ height: 300, border: 'none', background: 'var(--color-surface)' }} />
          </div>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Stats computation
  const openTasks = tasks.filter(t => t.status !== 'done').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    return t.due_date && new Date(t.due_date) < new Date(today);
  }).length;

  // Standup compliance
  const submittedStandupsCount = todayStandups.filter(s =>
    teamMembers.some(m => m.id === s.user_id)
  ).length;

  return (
    <div className="animate-slide-up">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => router.push('/tasks')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon accent">
            <ClipboardList size={22} />
          </div>
          <div>
            <div className="stat-value">{openTasks}</div>
            <div className="stat-label">Open Tasks</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => router.push('/tasks')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon success">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-value">{completedTasks}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => router.push('/tasks')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon warning">
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-value">{inProgressTasks}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        {(isAdmin || isLead) && (
          <div className="stat-card" onClick={() => router.push('/tasks')} style={{ cursor: 'pointer' }}>
            <div className="stat-icon danger">
              <AlertTriangle size={22} />
            </div>
            <div>
              <div className="stat-value" style={{ color: overdueTasks > 0 ? 'var(--color-blocked)' : undefined }}>
                {overdueTasks}
              </div>
              <div className="stat-label">Overdue</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ gap: 'var(--spacing-xl)', marginTop: 'var(--spacing-xl)' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

          {/* Standup Status */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <MessageSquareText size={18} style={{ color: 'var(--color-accent)' }} />
                  Today&apos;s Standup
                </div>
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => router.push('/standups')}>
                {todayStandup ? 'View' : 'Submit'} <ArrowRight size={14} />
              </button>
            </div>

            {isIntern ? (
              todayStandup ? (
                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-done-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-done)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                    <CheckCircle2 size={16} /> Submitted today
                  </div>
                </div>
              ) : (
                <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-in-progress-bg)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-in-progress)', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                    <Clock size={16} /> Not submitted yet — submit before EOD
                  </div>
                </div>
              )
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span className="text-sm text-secondary">
                    {submittedStandupsCount} of {teamMembers.length} interns submitted
                  </span>
                  <span className="text-sm font-semibold">
                    {teamMembers.length > 0 ? Math.round((submittedStandupsCount / teamMembers.length) * 100) : 0}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${submittedStandupsCount === teamMembers.length ? 'success' : 'warning'}`}
                    style={{ width: `${teamMembers.length > 0 ? (submittedStandupsCount / teamMembers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tasks Overview */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <ClipboardList size={18} style={{ color: 'var(--color-accent)' }} />
                {isIntern ? 'My Tasks' : 'Task Overview'}
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => router.push('/tasks')}>
                View Board <ArrowRight size={14} />
              </button>
            </div>

            {tasks.filter(t => t.status !== 'done').length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                <div className="empty-state-title">All caught up! 🎉</div>
                <div className="empty-state-text">No open tasks right now.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {tasks
                  .filter(t => t.status !== 'done')
                  .sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  })
                  .slice(0, 5)
                  .map((task) => {
                    const isOverdue = task.due_date && new Date(task.due_date) < new Date(today) && task.status !== 'done';
                    return (
                      <div
                        key={task.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--spacing-md)',
                          padding: 'var(--spacing-md)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border-light)',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                        onClick={() => router.push('/tasks')}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--color-surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        <span style={{ flex: 1, fontSize: 'var(--font-size-sm)', fontWeight: 500 }} className="truncate">
                          {task.title}
                        </span>
                        <span className={`badge badge-${task.status.replace('_', '-')}`}>
                          {task.status === 'in_progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                        {isOverdue && (
                          <span style={{ color: 'var(--color-blocked)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                            Overdue
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          {/* Upcoming Meetings */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
                Upcoming Meetings
              </div>
              <button className="btn btn-sm btn-outline" onClick={() => router.push('/meetings')}>
                View All <ArrowRight size={14} />
              </button>
            </div>

            {upcomingMeetings.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                <div className="empty-state-title">No upcoming meetings</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {upcomingMeetings.map((meeting) => {
                  const date = new Date(meeting.scheduled_at);
                  const team = meeting.team_id ? allTeams.find(t => t.id === meeting.team_id) : null;
                  return (
                    <div
                      key={meeting.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-md)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-light)',
                      }}
                    >
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-accent-bg)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 800, color: 'var(--color-accent)', lineHeight: 1 }}>
                          {date.toLocaleDateString('en-US', { day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{meeting.title}</div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                          {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {team && ` · ${team.name}`}
                          {!team && ' · All Teams'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <TrendingUp size={18} style={{ color: 'var(--color-accent)' }} />
                Recent Activity
              </div>
            </div>

            <div className="timeline">
              {recentActivities.slice(0, 6).map((activity) => {
                const actUser = allUsers.find(u => u.id === activity.user_id);
                // Note: task list in state is already scoped/filtered, but recent activity could refer to any task.
                // However, since we fetch tasks for state, let's find the task title. Since tasks state is scoped,
                // let's fetch activity tasks if they aren't in the list? Actually, tasks state in dashboard has the tasks assigned to/owned by the user.
                // But for recent activity, we can just say "a task".
                // Better: we can assume activity.action contains enough information or we display the task ID/generic name.
                // Wait! Let's check `logTaskActivity` or how activity is shown. It says:
                // task && <> &quot;{task.title}&quot;</>
                // We don't have all tasks in the database fetched here if it's scoped, but wait!
                // For admin it has all tasks. For lead/intern it has scoped tasks.
                // Let's keep it simple: if task is not in tasks list, we can just display the activity message.
                // Wait! In supabase schema, `task_activity` table does NOT have task title. Let's look up if we can display task.
                // Wait, if needed we could fetch the tasks referenced in the activity. But most of the time they are in the scoped list.
                // Let's just find task in the tasks array, or if it's missing, we show "task".
                const task = tasks.find(t => t.id === activity.task_id);
                return (
                  <div className="timeline-item" key={activity.id}>
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-action">
                        <span style={{ color: 'var(--color-accent)' }}>{actUser?.name || 'Unknown'}</span>
                        {' '}{activity.action.toLowerCase()}
                        {task ? <> &quot;{task.title}&quot;</> : <> task</>}
                      </div>
                      {activity.from_status && activity.to_status && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 2 }}>
                          <span className={`badge badge-${activity.from_status.replace('_', '-')}`} style={{ fontSize: '10px' }}>
                            {activity.from_status.replace('_', ' ')}
                          </span>
                          <ArrowRight size={12} style={{ color: 'var(--color-text-tertiary)' }} />
                          <span className={`badge badge-${activity.to_status.replace('_', '-')}`} style={{ fontSize: '10px' }}>
                            {activity.to_status.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                      <div className="timeline-meta">{formatRelativeTime(activity.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
