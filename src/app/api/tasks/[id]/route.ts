// GET /api/tasks/[id] — Get task
// PATCH /api/tasks/[id] — Update task
// DELETE /api/tasks/[id] — Delete task
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { sanitizeText } from '@/lib/validators';
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/tasks/[id] GET', error);
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current task for activity logging
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentTask) {
      return Response.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await request.json();

    // Build update object
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = sanitizeText(body.title);
    if (body.description !== undefined) updates.description = sanitizeText(body.description);
    if (body.acceptance_criteria !== undefined) updates.acceptance_criteria = sanitizeText(body.acceptance_criteria);
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id || null;
    if (body.team_id !== undefined) updates.team_id = body.team_id || null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.due_date = body.due_date || null;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log status change activity (manual log in addition to trigger)
    if (body.status && body.status !== currentTask.status) {
      logger.taskStatusChanged(id, user.id, currentTask.status, body.status);
    }

    logger.taskUpdated(id, user.id, updates);
    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/tasks/[id] PATCH', error);
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check role via admin client to avoid RLS recursion
    const { data: profile } = await createAdminClient()
      .from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role === 'intern') {
      return Response.json({ error: 'Only admins and leads can delete tasks' }, { status: 403 });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.taskDeleted(id, user.id);
    return Response.json({ message: 'Task deleted' });
  } catch (error) {
    logger.apiError('/api/tasks/[id] DELETE', error);
    return handleApiError(error);
  }
}
