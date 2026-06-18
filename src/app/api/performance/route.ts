// GET /api/performance — Get performance metrics
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import type { PerformanceMetrics, Task, AttendanceStatus } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    if (userId) {
      // Single user performance
      const metrics = await computeUserPerformance(supabase, userId);
      return Response.json({ data: metrics });
    }

    // Get profile to determine scope
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get relevant users
    let usersQuery = supabase
      .from('profiles')
      .select('id')
      .eq('role', 'intern')
      .eq('status', 'active');

    if (profile.role === 'lead' && profile.team_id) {
      usersQuery = usersQuery.eq('team_id', profile.team_id);
    } else if (profile.role === 'intern') {
      usersQuery = usersQuery.eq('id', user.id);
    }

    const { data: users } = await usersQuery;
    const userIds = (users || []).map(u => u.id);

    // Compute metrics for each user
    const metrics: PerformanceMetrics[] = [];
    for (const uid of userIds) {
      const m = await computeUserPerformance(supabase, uid);
      metrics.push(m);
    }

    return Response.json({ data: metrics });
  } catch (error) {
    logger.apiError('/api/performance GET', error);
    return handleApiError(error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeUserPerformance(supabase: any, userId: string): Promise<PerformanceMetrics> {
  // Fetch tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId);

  const userTasks = (tasks || []) as Task[];
  const completed = userTasks.filter((t: Task) => t.status === 'done');
  const onTime = completed.filter((t: Task) => {
    if (!t.due_date || !t.completed_at) return true;
    return new Date(t.completed_at) <= new Date(t.due_date + 'T23:59:59');
  });

  // Fetch standups
  const { data: standups } = await supabase
    .from('standups')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  const userStandups = (standups || []) as { date: string }[];

  // Calculate streak
  let streak = 0;
  const checkDate = new Date();
  for (let i = 0; i < 60; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const dow = checkDate.getDay();
    if (dow === 0 || dow === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    if (userStandups.some((s: { date: string }) => s.date === dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }
  }

  // Attendance
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('status')
    .eq('user_id', userId);

  const attendance = (attendanceData || []) as { status: AttendanceStatus }[];
  const totalMeetings = attendance.length;
  const present = attendance.filter((a: { status: AttendanceStatus }) =>
    a.status === 'present' || a.status === 'late'
  ).length;

  return {
    user_id: userId,
    tasks_completed: completed.length,
    tasks_total: userTasks.length,
    on_time_rate: completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
    standup_streak: streak,
    standups_submitted: userStandups.length,
    standups_expected: 0,
    attendance_rate: totalMeetings > 0 ? Math.round((present / totalMeetings) * 100) : 100,
  };
}
