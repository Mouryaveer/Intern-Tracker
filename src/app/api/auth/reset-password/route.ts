// POST /api/auth/reset-password — Update password + clear must_reset flag
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Update password
    const { error: authError } = await supabase.auth.updateUser({ password });
    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    // Clear must_reset_password flag
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ must_reset_password: false })
      .eq('id', user.id);

    if (profileError) {
      logger.apiError('/api/auth/reset-password', profileError, user.id);
      // Password was changed but flag wasn't cleared — still success
    }

    logger.passwordReset(user.id);
    return Response.json({ message: 'Password updated successfully' });
  } catch (error) {
    logger.apiError('/api/auth/reset-password', error);
    return handleApiError(error);
  }
}
