// GET /api/meetings — List meetings
// POST /api/meetings — Create meeting
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateMeetingInput, sanitizeText } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'upcoming' | 'past'

    let query = supabase.from('meetings').select('*');

    if (type === 'upcoming') {
      query = query
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true });
    } else if (type === 'past') {
      query = query
        .lt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: false });
    } else {
      query = query.order('scheduled_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/meetings GET', error);
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

    // Check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'intern') {
      return Response.json({ error: 'Only admins and leads can create meetings' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateMeetingInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert({
        title: sanitizeText(body.title),
        scheduled_at: body.scheduled_at,
        team_id: body.team_id || null,
        agenda: sanitizeText(body.agenda || ''),
        notes_url: body.notes_url || '',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/meetings POST', error);
    return handleApiError(error);
  }
}
