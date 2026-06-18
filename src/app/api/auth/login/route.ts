// POST /api/auth/login — Login via Supabase Auth
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.loginAttempt(email, false);
      return Response.json(
        { error: error.message === 'Invalid login credentials' ? 'Invalid email or password' : error.message },
        { status: 401 }
      );
    }

    if (data.user) {
      // Check profile status
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        logger.loginAttempt(email, false);
        return Response.json({ error: 'Account profile not found' }, { status: 404 });
      }

      if (profile.status !== 'active') {
        await supabase.auth.signOut();
        logger.loginAttempt(email, false);
        return Response.json({ error: 'Account is deactivated' }, { status: 403 });
      }

      logger.loginAttempt(email, true, data.user.id);
      return Response.json({
        data: {
          user: profile,
          mustReset: profile.must_reset_password,
          session: data.session,
        },
      });
    }

    return Response.json({ error: 'Login failed' }, { status: 401 });
  } catch (error) {
    logger.apiError('/api/auth/login', error);
    return handleApiError(error);
  }
}
