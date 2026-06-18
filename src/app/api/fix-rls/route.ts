// GET /api/fix-rls — Fix circular RLS on profiles + teams table
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = createAdminClient();
  const log: string[] = [];

  const statements = [
    // Drop old circular policies on profiles
    `DROP POLICY IF EXISTS "admin_all_profiles" ON profiles`,
    `DROP POLICY IF EXISTS "lead_read_profiles" ON profiles`,
    `DROP POLICY IF EXISTS "lead_update_own_profile" ON profiles`,
    `DROP POLICY IF EXISTS "intern_read_profiles" ON profiles`,
    `DROP POLICY IF EXISTS "intern_update_own_profile" ON profiles`,
    `DROP POLICY IF EXISTS "self_read_profile" ON profiles`,
    `DROP POLICY IF EXISTS "self_update_profile" ON profiles`,
    `DROP POLICY IF EXISTS "lead_read_team" ON profiles`,
    `DROP POLICY IF EXISTS "lead_update_own" ON profiles`,
    `DROP POLICY IF EXISTS "intern_read_own" ON profiles`,
    `DROP POLICY IF EXISTS "intern_update_own" ON profiles`,

    // Foundational: every logged-in user can read their OWN profile
    `CREATE POLICY "self_read_profile" ON profiles FOR SELECT USING (auth.uid() = id)`,
    // Every logged-in user can update their OWN profile
    `CREATE POLICY "self_update_profile" ON profiles FOR UPDATE USING (auth.uid() = id)`,
    // Admin: full access (uses sub-select to avoid circular dep)
    `CREATE POLICY "admin_all_profiles" ON profiles FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))`,
    // Lead: read team profiles
    `CREATE POLICY "lead_read_team" ON profiles FOR SELECT USING (team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))`,

    // Fix teams table — any authenticated user can read teams
    `DROP POLICY IF EXISTS "admin_all_teams" ON teams`,
    `DROP POLICY IF EXISTS "lead_read_teams" ON teams`,
    `DROP POLICY IF EXISTS "intern_read_teams" ON teams`,
    `DROP POLICY IF EXISTS "auth_read_teams" ON teams`,

    `CREATE POLICY "auth_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL)`,
    `CREATE POLICY "admin_all_teams" ON teams FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))`,
  ];

  for (const sql of statements) {
    const { error } = await admin.rpc('exec_sql', { query: sql }).maybeSingle();
    if (error) {
      // Try raw REST — fallback: just log it
      log.push(`[WARN] ${sql.slice(0, 60)}... → ${error.message}`);
    } else {
      log.push(`[OK] ${sql.slice(0, 60)}...`);
    }
  }

  // Verify: can admin profile be fetched?
  const { data: profiles, error: verifyErr } = await admin
    .from('profiles')
    .select('id, email, role, status');

  return Response.json({
    success: !verifyErr,
    profiles_found: profiles?.length ?? 0,
    profiles,
    log,
    note: 'If [WARN] messages appear, run the SQL manually in the Supabase SQL Editor.',
    manual_sql: statements.join(';\n') + ';',
    sql_editor_url: 'https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new',
  });
}
