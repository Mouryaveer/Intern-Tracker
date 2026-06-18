// GET /api/standups — List standups
// POST /api/standups — Submit standup
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateStandupInput, sanitizeText } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const userId = url.searchParams.get('user_id');

    let query = supabase.from('standups').select('*');

    if (date) query = query.eq('date', date);
    if (userId) query = query.eq('user_id', userId);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/standups GET', error);
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

    const body = await request.json();
    const validation = validateStandupInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('standups')
      .upsert(
        {
          user_id: user.id,
          date: today,
          did_yesterday: sanitizeText(body.did_yesterday),
          doing_today: sanitizeText(body.doing_today),
          blockers: sanitizeText(body.blockers || ''),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single();

    if (error) throw error;

    logger.standupSubmitted(data.id, user.id);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/standups POST', error);
    return handleApiError(error);
  }
}
