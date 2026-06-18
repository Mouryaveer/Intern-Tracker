// GET /api/meetings/[id]/attendance — Get attendance for meeting
// POST /api/meetings/[id]/attendance — Mark attendance (upsert)
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateAttendanceStatus } from '@/lib/validators';
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
      .from('attendance')
      .select('*')
      .eq('meeting_id', id);

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/meetings/[id]/attendance GET', error);
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: meetingId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, status } = body;

    if (!user_id || !status) {
      return Response.json({ error: 'user_id and status are required' }, { status: 400 });
    }

    if (!validateAttendanceStatus(status)) {
      return Response.json({ error: 'Invalid attendance status' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert(
        {
          meeting_id: meetingId,
          user_id,
          status,
          check_in_time: status === 'present' || status === 'late' ? new Date().toISOString() : null,
        },
        { onConflict: 'meeting_id,user_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/meetings/[id]/attendance POST', error);
    return handleApiError(error);
  }
}
