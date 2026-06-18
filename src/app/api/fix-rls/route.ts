// GET /api/fix-rls — Returns SQL to fix circular RLS on profiles table
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, email, role, status');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const fixSQL = `
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "lead_read_profiles" ON profiles;
DROP POLICY IF EXISTS "lead_read_team" ON profiles;
DROP POLICY IF EXISTS "lead_update_own" ON profiles;
DROP POLICY IF EXISTS "intern_read_profiles" ON profiles;
DROP POLICY IF EXISTS "intern_update_own" ON profiles;
DROP POLICY IF EXISTS "self_read_profile" ON profiles;
DROP POLICY IF EXISTS "self_update_profile" ON profiles;

CREATE POLICY "self_read_profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "self_update_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin_all_profiles"  ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "lead_read_team" ON profiles FOR SELECT
  USING (team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "admin_all_teams" ON teams;
DROP POLICY IF EXISTS "lead_read_teams" ON teams;
DROP POLICY IF EXISTS "intern_read_teams" ON teams;
DROP POLICY IF EXISTS "auth_read_teams" ON teams;
CREATE POLICY "auth_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_all_teams" ON teams FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
`;

  return Response.json({
    profiles_found: profiles.length,
    profiles,
    sql_editor_url: 'https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new',
    fix_sql: fixSQL,
  });
}
