// GET /api/meetings/[id] — Get meeting
// PATCH /api/meetings/[id] — Update meeting
// DELETE /api/meetings/[id] — Delete meeting
import { createServerSupabaseClient } from '@/lib/supabase/server';
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
      .from('meetings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Meeting not found' }, { status: 404 });
    }

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/meetings/[id] GET', error);
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

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = sanitizeText(body.title);
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
    if (body.agenda !== undefined) updates.agenda = sanitizeText(body.agenda);
    if (body.notes_url !== undefined) updates.notes_url = body.notes_url;
    if (body.team_id !== undefined) updates.team_id = body.team_id || null;

    const { data, error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/meetings/[id] PATCH', error);
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

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return Response.json({ message: 'Meeting deleted' });
  } catch (error) {
    logger.apiError('/api/meetings/[id] DELETE', error);
    return handleApiError(error);
  }
}
