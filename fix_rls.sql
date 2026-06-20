-- ============================================================
-- COMPLETE RLS FIX — Drop all recursive policies
-- Run in: https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new
-- ============================================================

-- Drop ALL existing policies on all tables
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
  END LOOP;
END $$;

-- Drop recursive helper functions
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_user_team_id() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- TEAMS
CREATE POLICY "teams_select" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_insert" ON teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "teams_update" ON teams FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "teams_delete" ON teams FOR DELETE USING (auth.uid() IS NOT NULL);

-- TASKS
CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- TASK ACTIVITY
CREATE POLICY "task_activity_select" ON task_activity FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "task_activity_insert" ON task_activity FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STANDUPS
CREATE POLICY "standups_select" ON standups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "standups_insert" ON standups FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "standups_update" ON standups FOR UPDATE USING (auth.uid() IS NOT NULL);

-- MEETINGS
CREATE POLICY "meetings_select" ON meetings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "meetings_insert" ON meetings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "meetings_update" ON meetings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "meetings_delete" ON meetings FOR DELETE USING (auth.uid() IS NOT NULL);

-- ATTENDANCE
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (auth.uid() IS NOT NULL);

-- WORK LOG
CREATE POLICY "work_log_select" ON work_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "work_log_all" ON work_log FOR ALL USING (auth.uid() IS NOT NULL);

-- AUDIT LOG
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
