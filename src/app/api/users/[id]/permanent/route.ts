// DELETE /api/users/[id]/permanent — Permanently delete a user (admin only)
// This deletes the Supabase auth user which cascades to the profiles row,
// and also deletes all related rows (tasks assigned, standups, etc.).
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the caller is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only admins may permanently delete
    const admin = createAdminClient();
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return Response.json({ error: 'Only admins can permanently delete users' }, { status: 403 });
    }

    // Prevent self-deletion
    if (currentUser.id === id) {
      return Response.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Fetch the target user's profile for the log entry before deleting
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('name, email, role')
      .eq('id', id)
      .single();

    if (!targetProfile) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete related data first to avoid FK constraint issues
    // (If your schema has ON DELETE CASCADE these may be no-ops, but it's safer to be explicit)
    await admin.from('standups').delete().eq('user_id', id);
    await admin.from('tasks').delete().eq('assigned_to', id);
    await admin.from('tasks').delete().eq('created_by', id);

    // Delete the auth user — this cascades to the profiles row (via FK trigger)
    const { error: authDeleteError } = await admin.auth.admin.deleteUser(id);
    if (authDeleteError) {
      logger.apiError('/api/users/[id]/permanent DELETE', authDeleteError, currentUser.id);
      return Response.json({ error: authDeleteError.message }, { status: 500 });
    }

    // Fallback: explicitly delete the profile row in case there is no cascade
    await admin.from('profiles').delete().eq('id', id);

    logger.userPermanentlyDeleted(id, currentUser.id, targetProfile.email, targetProfile.name);

    return Response.json({
      message: `User "${targetProfile.name}" (${targetProfile.email}) has been permanently deleted.`,
    });
  } catch (error) {
    logger.apiError('/api/users/[id]/permanent DELETE', error);
    return handleApiError(error);
  }
}
