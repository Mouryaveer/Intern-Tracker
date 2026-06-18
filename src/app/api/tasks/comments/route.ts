// GET /api/tasks/comments?task_id=xxx — List comments
// POST /api/tasks/comments — Add comment
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/error-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const taskId = new URL(request.url).searchParams.get('task_id');
    if (!taskId) return Response.json({ error: 'task_id required' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const { task_id, content } = await request.json();
    if (!task_id || !content?.trim()) return Response.json({ error: 'task_id and content required' }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('task_comments')
      .insert({ task_id, user_id: user.id, content: content.trim() })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
