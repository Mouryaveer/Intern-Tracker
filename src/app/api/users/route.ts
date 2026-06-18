// GET /api/users — List users
// POST /api/users — Create user (admin only, via service role)
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { handleApiError } from '@/lib/error-handler';
import { validateUserInput, sanitizeText } from '@/lib/validators';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // RLS handles visibility — just fetch all visible profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    logger.apiError('/api/users', error);
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return Response.json({ error: 'Only admins can create users' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateUserInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { name, email, role, team_id, password } = body;
    const tempPassword = password || 'temp' + Math.random().toString(36).substring(2, 8);

    // Create auth user via admin client (bypasses email confirmation)
    const adminClient = createAdminClient();
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Skip email confirmation
    });

    if (authError) {
      return Response.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return Response.json({ error: 'Failed to create auth user' }, { status: 500 });
    }

    // Create profile
    const { data: newProfile, error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: sanitizeText(name),
        email,
        role,
        team_id: team_id || null,
        avatar_url: '',
        status: 'active',
        must_reset_password: true,
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup: delete auth user if profile creation failed
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return Response.json({ error: 'Failed to create user profile: ' + profileError.message }, { status: 500 });
    }

    logger.userCreated(authData.user.id, currentUser.id, email, role);
    return Response.json({ data: newProfile, tempPassword }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/users POST', error);
    return handleApiError(error);
  }
}
