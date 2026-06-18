// GET /api/users/[id] — Get user by ID
// PATCH /api/users/[id] — Update user (admin only)
// DELETE /api/users/[id] — Deactivate user (admin only)
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateUserInput, sanitizeText } from '@/lib/validators';
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
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

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

    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin role (allow self-update for non-sensitive fields)
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    const isAdmin = callerProfile?.role === 'admin';
    const isSelf = currentUser.id === id;

    if (!isAdmin && !isSelf) {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateUserInput(body, true);
    if (!validation.valid) {
      return Response.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = sanitizeText(body.name);
    if (body.email !== undefined && isAdmin) updates.email = body.email;
    if (body.role !== undefined && isAdmin) updates.role = body.role;
    if (body.team_id !== undefined && isAdmin) updates.team_id = body.team_id || null;
    if (body.status !== undefined && isAdmin) updates.status = body.status;
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
    if (body.must_reset_password !== undefined && isAdmin) updates.must_reset_password = body.must_reset_password;

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If password is being reset by admin
    if (body.password && isAdmin) {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(id, {
        password: body.password,
      });
      // Also set must_reset_password
      await supabase
        .from('profiles')
        .update({ must_reset_password: true })
        .eq('id', id);

      logger.forcePasswordReset(id, currentUser.id);
    }

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/users/[id] PATCH', error);
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
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin role
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return Response.json({ error: 'Only admins can deactivate users' }, { status: 403 });
    }

    if (currentUser.id === id) {
      return Response.json({ error: 'Cannot deactivate yourself' }, { status: 400 });
    }

    // Soft delete: set status to inactive
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) throw error;

    logger.userDeactivated(id, currentUser.id);
    return Response.json({ message: 'User deactivated' });
  } catch (error) {
    logger.apiError('/api/users/[id] DELETE', error);
    return handleApiError(error);
  }
}
