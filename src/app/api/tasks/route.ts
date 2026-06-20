// GET /api/tasks — List tasks
// POST /api/tasks — Create task
import { after } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateTaskInput, sanitizeText } from '@/lib/validators';
import { triggerTaskNotification } from '@/lib/task-notifications';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const teamId = url.searchParams.get('team_id');
    const assigneeId = url.searchParams.get('assignee_id');
    const status = url.searchParams.get('status');

    let query = supabase.from('tasks').select('*');

    if (teamId) query = query.eq('team_id', teamId);
    if (assigneeId) query = query.eq('assignee_id', assigneeId);
    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/tasks GET', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check role via admin client to avoid RLS recursion
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, team_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'intern') {
      return Response.json({ error: 'Only admins and leads can create tasks' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateTaskInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const taskData = {
      title: sanitizeText(body.title),
      description: sanitizeText(body.description || ''),
      acceptance_criteria: sanitizeText(body.acceptance_criteria || ''),
      assignee_id: body.assignee_id || null,
      team_id: body.team_id || profile.team_id || null,
      created_by: user.id,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
    };

    const { data, error } = await adminClient
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    const { error: activityError } = await adminClient.from('task_activity').insert({
      task_id: data.id,
      user_id: user.id,
      action: 'Created task',
      to_status: taskData.status,
    });
    if (activityError) {
      logger.warn('Task activity log skipped after task creation', {
        userId: user.id,
        metadata: { taskId: data.id, error: activityError.message },
      });
    }

    logger.taskCreated(data.id, user.id, data.title);
    triggerTaskNotification({
      taskId: data.id,
      type: 'assigned',
      requestUrl: request.url,
      cookieHeader: request.headers.get('cookie'),
      schedule: after,
    });

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/tasks POST', error);
    return handleApiError(error);
  }
}
