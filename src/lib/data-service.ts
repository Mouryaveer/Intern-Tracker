// ============================================================
// Turn2Law Intern Tracker — Data Service (Supabase)
// All data operations go through Supabase Postgres
// ============================================================

import { createClient } from '@/lib/supabase/client';
import type {
  Profile,
  Team,
  Task,
  TaskActivity,
  Standup,
  Meeting,
  Attendance,
  AttendanceStatus,
  PerformanceMetrics,
  TeamMetrics,
} from './types';

// ── Helper: get supabase client ──
function getSupabase() {
  return createClient();
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error === 'string'
      ? body.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

// ============================================================
// USERS / PROFILES
// ============================================================

export async function getUsers(): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []) as Profile[];
}

export async function getUserById(id: string): Promise<Profile | null> {
  if (!id) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Profile;
}

export async function getUsersByTeam(teamId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  return (data || []) as Profile[];
}

export async function updateUser(id: string, updates: Partial<Profile>): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function deactivateUser(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'inactive' })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// TEAMS
// ============================================================

export async function getTeams(): Promise<Team[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []) as Team[];
}

export async function getTeamById(id: string): Promise<Team | null> {
  if (!id) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Team;
}

export async function createTeam(team: Omit<Team, 'id' | 'created_at'>): Promise<Team> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('teams')
    .insert(team)
    .select()
    .single();

  if (error) throw error;
  return data as Team;
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Team;
}

export async function deleteTeam(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================
// TASKS
// ============================================================

export async function getTasks(): Promise<Task[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Task[];
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!id) return null;
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as Task;
}

export async function getTasksByAssignee(userId: string): Promise<Task[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Task[];
}

export async function getTasksByTeam(teamId: string): Promise<Task[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Task[];
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'completed_at'>): Promise<Task> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  const { data } = await parseApiResponse<{ data: Task }>(response);
  return data;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const { data } = await parseApiResponse<{ data: Task }>(response);
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await parseApiResponse(response);
}

// ============================================================
// TASK ACTIVITY
// ============================================================

export async function getTaskActivity(taskId: string): Promise<TaskActivity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('task_activity')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as TaskActivity[];
}

export async function logTaskActivity(activity: Omit<TaskActivity, 'id' | 'created_at'>): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('task_activity')
    .insert(activity);

  if (error) throw error;
}

export async function getRecentActivities(limit: number = 10): Promise<TaskActivity[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('task_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as TaskActivity[];
}

// ============================================================
// STANDUPS
// ============================================================

export async function submitStandup(
  userId: string,
  didYesterday: string,
  doingToday: string,
  blockers: string
): Promise<Standup> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('standups')
    .upsert(
      {
        user_id: userId,
        date: today,
        did_yesterday: didYesterday,
        doing_today: doingToday,
        blockers: blockers || '',
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Standup;
}

export async function getTodayStandup(userId: string): Promise<Standup | null> {
  const supabase = getSupabase();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('standups')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error) return null;
  return data as Standup;
}

export async function getStandupsByDate(date: string): Promise<Standup[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('standups')
    .select('*')
    .eq('date', date);

  if (error) throw error;
  return (data || []) as Standup[];
}

export async function getStandupsByUser(userId: string): Promise<Standup[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('standups')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []) as Standup[];
}

// ============================================================
// MEETINGS
// ============================================================

export async function getMeetings(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Meeting[];
}

export async function getUpcomingMeetings(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) throw error;
  return (data || []) as Meeting[];
}

export async function getPastMeetings(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .lt('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Meeting[];
}

export async function createMeeting(meeting: Omit<Meeting, 'id' | 'created_at'>): Promise<Meeting> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meetings')
    .insert(meeting)
    .select()
    .single();

  if (error) throw error;
  return data as Meeting;
}

// ============================================================
// ATTENDANCE
// ============================================================

export async function getAttendanceByMeeting(meetingId: string): Promise<Attendance[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('meeting_id', meetingId);

  if (error) throw error;
  return (data || []) as Attendance[];
}

export async function markAttendance(
  meetingId: string,
  userId: string,
  status: AttendanceStatus
): Promise<Attendance> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        status,
        check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
      },
      { onConflict: 'meeting_id,user_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Attendance;
}

// ============================================================
// PERFORMANCE METRICS (computed client-side)
// ============================================================

export async function getUserPerformance(userId: string): Promise<PerformanceMetrics> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_user_performance_metrics', { p_user_id: userId });
  if (error) {
    console.error('Error fetching user performance:', error.message ?? error);
    // Return empty fallback instead of throwing to prevent dashboard crash
    return {
      user_id: userId,
      tasks_completed: 0,
      tasks_total: 0,
      on_time_rate: 100,
      standup_streak: 0,
      standups_submitted: 0,
      standups_expected: 0,
      attendance_rate: 100,
    };
  }
  return data as PerformanceMetrics;
}

export async function getTeamMetrics(teamId: string): Promise<TeamMetrics> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_team_performance_metrics', { p_team_id: teamId });
  if (error) {
    console.error('Error fetching team performance:', error.message ?? error);
    return {
      team_id: teamId,
      total_tasks: 0,
      completed_tasks: 0,
      completion_rate: 0,
      active_members: 0,
      standup_compliance: 100,
    };
  }
  return data as TeamMetrics;
}
