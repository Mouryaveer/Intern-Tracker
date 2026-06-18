// POST /api/auth/logout — Sign out
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      logger.logout(user.id);
    }

    await supabase.auth.signOut();
    return Response.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.apiError('/api/auth/logout', error);
    return handleApiError(error);
  }
}
