// GET /api/migrate — Run schema migrations via service role
// Visit this URL once after deploy to set up the database
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function runSQL(client: ReturnType<typeof createAdminClient>, sql: string, label: string) {
  // Use rpc if available, otherwise try direct table operations
  const { error } = await client.rpc('exec_sql', { query: sql }).single();
  if (error && error.code !== 'PGRST202') {
    return `[!!] ${label}: ${error.message}`;
  }
  if (error?.code === 'PGRST202') {
    // exec_sql not available — return instruction
    return `[NEED_SQL] ${label}`;
  }
  return `[OK] ${label}`;
}

export async function GET() {
  const admin = createAdminClient();
  const log: string[] = [];

  // ── Try creating exec_sql function first via a known trick ──
  // Supabase doesn't expose raw SQL via REST, but we can check if tables exist
  // and use upsert/insert patterns for data, and report what DDL needs to run.

  const checks: Record<string, boolean> = {};
  const tables = ['profiles','teams','tasks','task_activity','standups','meetings','attendance','work_log','audit_log'];

  for (const tbl of tables) {
    const { error } = await admin.from(tbl).select('id').limit(1);
    checks[tbl] = !error;
  }

  const missing = tables.filter(t => !checks[t]);
  const existing = tables.filter(t => checks[t]);

  log.push(`Existing tables: ${existing.join(', ') || 'none'}`);
  log.push(`Missing tables: ${missing.join(', ') || 'none'}`);

  if (missing.length === 0) {
    log.push('[OK] All tables exist — schema is ready!');
    return Response.json({ success: true, schema_ready: true, log });
  }

  // Return the exact SQL to run
  const ddl = `
-- ============================================================
-- Run this in: https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new
-- ============================================================

CREATE TYPE IF NOT EXISTS user_role AS ENUM ('admin','lead','intern');
CREATE TYPE IF NOT EXISTS user_status AS ENUM ('active','inactive');
CREATE TYPE IF NOT EXISTS task_status AS ENUM ('todo','in_progress','review','done','blocked');
CREATE TYPE IF NOT EXISTS task_priority AS ENUM ('low','medium','high');
CREATE TYPE IF NOT EXISTS attendance_status AS ENUM ('present','absent','late','excused');

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'intern',
  team_id UUID, avatar_url TEXT DEFAULT '',
  status user_status NOT NULL DEFAULT 'active',
  must_reset_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, lead_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT DEFAULT '',
  acceptance_criteria TEXT DEFAULT '',
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, from_status task_status, to_status task_status,
  note TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_yesterday TEXT NOT NULL DEFAULT '',
  doing_today TEXT NOT NULL DEFAULT '',
  blockers TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  agenda TEXT DEFAULT '', notes_url TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
);
CREATE TABLE IF NOT EXISTS work_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '', link TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL, entity_type TEXT, entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE standups;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activity;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_team_id() RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "admin_all_profiles"    ON profiles FOR ALL USING (is_admin());
CREATE POLICY "lead_read_profiles"    ON profiles FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR id=auth.uid()));
CREATE POLICY "lead_update_own"       ON profiles FOR UPDATE USING (get_user_role()='lead' AND id=auth.uid());
CREATE POLICY "intern_read_profiles"  ON profiles FOR SELECT USING (get_user_role()='intern' AND (id=auth.uid() OR team_id=get_user_team_id()));
CREATE POLICY "intern_update_own"     ON profiles FOR UPDATE USING (get_user_role()='intern' AND id=auth.uid());
CREATE POLICY "admin_all_teams"       ON teams FOR ALL USING (is_admin());
CREATE POLICY "lead_read_teams"       ON teams FOR SELECT USING (get_user_role()='lead');
CREATE POLICY "intern_read_teams"     ON teams FOR SELECT USING (get_user_role()='intern');
CREATE POLICY "admin_all_tasks"       ON tasks FOR ALL USING (is_admin());
CREATE POLICY "lead_read_tasks"       ON tasks FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "lead_insert_tasks"     ON tasks FOR INSERT WITH CHECK (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "lead_update_tasks"     ON tasks FOR UPDATE USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "lead_delete_tasks"     ON tasks FOR DELETE USING (get_user_role()='lead' AND team_id=get_user_team_id());
CREATE POLICY "intern_read_tasks"     ON tasks FOR SELECT USING (get_user_role()='intern' AND (assignee_id=auth.uid() OR team_id=get_user_team_id()));
CREATE POLICY "intern_update_own_tasks" ON tasks FOR UPDATE USING (get_user_role()='intern' AND assignee_id=auth.uid());
CREATE POLICY "admin_all_standups"    ON standups FOR ALL USING (is_admin());
CREATE POLICY "lead_read_standups"    ON standups FOR SELECT USING (get_user_role()='lead' AND user_id IN (SELECT id FROM profiles WHERE team_id=get_user_team_id()));
CREATE POLICY "intern_read_own_standups" ON standups FOR SELECT USING (get_user_role()='intern' AND user_id=auth.uid());
CREATE POLICY "intern_insert_standups" ON standups FOR INSERT WITH CHECK (get_user_role()='intern' AND user_id=auth.uid());
CREATE POLICY "intern_update_standups" ON standups FOR UPDATE USING (get_user_role()='intern' AND user_id=auth.uid());
CREATE POLICY "admin_all_meetings"    ON meetings FOR ALL USING (is_admin());
CREATE POLICY "lead_read_meetings"    ON meetings FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "lead_insert_meetings"  ON meetings FOR INSERT WITH CHECK (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "intern_read_meetings"  ON meetings FOR SELECT USING (get_user_role()='intern' AND (team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "admin_all_attendance"  ON attendance FOR ALL USING (is_admin());
CREATE POLICY "lead_all_attendance"   ON attendance FOR ALL USING (get_user_role()='lead' AND meeting_id IN (SELECT id FROM meetings WHERE team_id=get_user_team_id() OR team_id IS NULL));
CREATE POLICY "intern_read_own_attendance" ON attendance FOR SELECT USING (get_user_role()='intern' AND user_id=auth.uid());
CREATE POLICY "intern_insert_own_attendance" ON attendance FOR INSERT WITH CHECK (get_user_role()='intern' AND user_id=auth.uid());
CREATE POLICY "admin_all_audit"       ON audit_log FOR ALL USING (is_admin());
`;

  return Response.json({
    success: false,
    schema_ready: false,
    missing_tables: missing,
    message: 'Run the SQL below in the Supabase SQL Editor, then visit /api/seed',
    sql_editor_url: 'https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new',
    ddl,
    log,
  });
}
