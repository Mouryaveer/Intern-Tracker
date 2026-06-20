import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { Task } from '@/lib/types';

export const dynamic = 'force-dynamic';

type NotificationType = 'assigned' | 'reassigned';

interface TaskNotificationRequest {
  taskId?: unknown;
  type?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isNotificationType(value: unknown): value is NotificationType {
  return value === 'assigned' || value === 'reassigned';
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { success: false, code: 'UNAUTHENTICATED', error: 'Not authenticated' },
        { status: 401 }
      );
    }

    let body: TaskNotificationRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { success: false, code: 'INVALID_JSON', error: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    if (!isValidUuid(body.taskId)) {
      return Response.json(
        { success: false, code: 'INVALID_TASK_ID', error: 'taskId must be a valid UUID' },
        { status: 400 }
      );
    }

    if (!isNotificationType(body.type)) {
      return Response.json(
        { success: false, code: 'INVALID_TYPE', error: 'type must be assigned or reassigned' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: taskRow, error: taskError } = await admin
      .from('tasks')
      .select('*')
      .eq('id', body.taskId)
      .single();

    if (taskError || !taskRow) {
      logger.warn('Task notification skipped: task not found', {
        userId: user.id,
        metadata: { taskId: body.taskId, error: taskError?.message },
      });
      return Response.json(
        { success: false, skipped: true, code: 'TASK_NOT_FOUND', error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskRow as Task;
    if (!task.assignee_id) {
      logger.info('Task notification skipped: task has no assignee', {
        userId: user.id,
        metadata: { taskId: task.id },
      });
      return Response.json({
        success: true,
        skipped: true,
        code: 'NO_ASSIGNEE',
        message: 'Task has no assignee',
      });
    }

    logger.info('Task in-app notification signal created', {
      userId: user.id,
      metadata: {
        taskId: task.id,
        assigneeId: task.assignee_id,
        type: body.type,
      },
    });

    return Response.json({
      success: true,
      skipped: false,
      type: body.type,
      taskId: task.id,
      assigneeId: task.assignee_id,
      delivery: 'dashboard',
    });
  } catch (error) {
    logger.apiError('/api/notifications/task POST', error);
    return Response.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
