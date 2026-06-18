// GET /api/users/[id] — Get user by ID
// PATCH /api/users/[id] — Update user
// DELETE /api/users/[id] — Deactivate user (admin only)
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateUserInput, sanitizeText } from '@/lib/validators';
import type { NextRequest } from 'next/server';

async function getCallerRole(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('role').eq('id', userId).single();
  return data?.role ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin.from('profiles').select('*').eq('id', id).single();
    if (error || !data) return Response.json({ error: 'User not found' }, { status: 404 });
    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/users/[id]', error);
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const callerRole = await getCallerRole(currentUser.id);
    const isAdmin = callerRole === 'admin';
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) return Response.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const validation = validateUserInput(body, true);
    if (!validation.valid) return Response.json({ error: validation.errors.join(', ') }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = sanitizeText(body.name);
    if (body.email !== undefined && isAdmin) updates.email = body.email;
    if (body.role !== undefined && isAdmin) updates.role = body.role;
    if (body.team_id !== undefined && isAdmin) updates.team_id = body.team_id || null;
    if (body.status !== undefined && isAdmin) updates.status = body.status;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.must_reset_password !== undefined && isAdmin) updates.must_reset_password = body.must_reset_password;

    const admin = createAdminClient();
    const { data, error } = await admin.from('profiles').update(updates).eq('id', id).select().single();
    if (error) throw error;

    if (body.password && isAdmin) {
      await admin.auth.admin.updateUserById(id, { password: body.password });
      await admin.from('profiles').update({ must_reset_password: true }).eq('id', id);
      logger.forcePasswordReset(id, currentUser.id);
    }

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/users/[id] PATCH', error);
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const callerRole = await getCallerRole(currentUser.id);
    if (callerRole !== 'admin') return Response.json({ error: 'Only admins can deactivate users' }, { status: 403 });
    if (currentUser.id === id) return Response.json({ error: 'Cannot deactivate yourself' }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from('profiles').update({ status: 'inactive' }).eq('id', id);
    if (error) throw error;

    logger.userDeactivated(id, currentUser.id);
    return Response.json({ message: 'User deactivated' });
  } catch (error) {
    logger.apiError('/api/users/[id] DELETE', error);
    return handleApiError(error);
  }
}
