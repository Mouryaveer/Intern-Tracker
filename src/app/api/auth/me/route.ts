// GET /api/auth/me — Return current user's profile (bypasses RLS via admin client)
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get the current user from the session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch profile using admin client (bypasses RLS)
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { error: 'Profile not found', userId: user.id },
        { status: 404 }
      );
    }

    return Response.json({ profile });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
