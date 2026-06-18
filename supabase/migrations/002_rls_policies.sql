-- ============================================================
-- Turn2Law Intern Tracker — Row Level Security Policies
-- Run this AFTER 001_schema.sql in the Supabase SQL Editor
-- ============================================================

-- ── Helper: Get current user's role ──
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: Get current user's team_id ──
CREATE OR REPLACE FUNCTION get_user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: Check if current user is admin ──
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_profiles" ON profiles
  FOR ALL USING (is_admin());

-- Lead: read all profiles in their team + own profile
CREATE POLICY "lead_read_profiles" ON profiles
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND (
      team_id = get_user_team_id()
      OR id = auth.uid()
      OR role = 'admin'  -- leads can see admins for reference
    )
  );

-- Lead: update own profile only
CREATE POLICY "lead_update_own_profile" ON profiles
  FOR UPDATE USING (
    get_user_role() = 'lead' AND id = auth.uid()
  );

-- Intern: read own profile + team members
CREATE POLICY "intern_read_profiles" ON profiles
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND (
      id = auth.uid()
      OR team_id = get_user_team_id()
    )
  );

-- Intern: update own profile only (avatar, etc.)
CREATE POLICY "intern_update_own_profile" ON profiles
  FOR UPDATE USING (
    get_user_role() = 'intern' AND id = auth.uid()
  );

-- ============================================================
-- TEAMS POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_teams" ON teams
  FOR ALL USING (is_admin());

-- Lead: read all teams (for context), update own team
CREATE POLICY "lead_read_teams" ON teams
  FOR SELECT USING (get_user_role() = 'lead');

CREATE POLICY "lead_update_own_team" ON teams
  FOR UPDATE USING (
    get_user_role() = 'lead' AND lead_id = auth.uid()
  );

-- Intern: read all teams
CREATE POLICY "intern_read_teams" ON teams
  FOR SELECT USING (get_user_role() = 'intern');

-- ============================================================
-- TASKS POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_tasks" ON tasks
  FOR ALL USING (is_admin());

-- Lead: CRUD on team tasks
CREATE POLICY "lead_read_tasks" ON tasks
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

CREATE POLICY "lead_insert_tasks" ON tasks
  FOR INSERT WITH CHECK (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

CREATE POLICY "lead_update_tasks" ON tasks
  FOR UPDATE USING (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

CREATE POLICY "lead_delete_tasks" ON tasks
  FOR DELETE USING (
    get_user_role() = 'lead'
    AND team_id = get_user_team_id()
  );

-- Intern: read team tasks, update own assigned tasks
CREATE POLICY "intern_read_tasks" ON tasks
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND (
      assignee_id = auth.uid()
      OR team_id = get_user_team_id()
    )
  );

CREATE POLICY "intern_update_own_tasks" ON tasks
  FOR UPDATE USING (
    get_user_role() = 'intern'
    AND assignee_id = auth.uid()
  );

-- ============================================================
-- TASK ACTIVITY POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_task_activity" ON task_activity
  FOR ALL USING (is_admin());

-- Lead: read team task activity, insert for team tasks
CREATE POLICY "lead_read_task_activity" ON task_activity
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id = get_user_team_id() OR team_id IS NULL
    )
  );

CREATE POLICY "lead_insert_task_activity" ON task_activity
  FOR INSERT WITH CHECK (
    get_user_role() = 'lead'
    AND task_id IN (
      SELECT id FROM tasks WHERE team_id = get_user_team_id() OR team_id IS NULL
    )
  );

-- Intern: read activity for their tasks, insert for own tasks
CREATE POLICY "intern_read_task_activity" ON task_activity
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND task_id IN (
      SELECT id FROM tasks
      WHERE assignee_id = auth.uid() OR team_id = get_user_team_id()
    )
  );

CREATE POLICY "intern_insert_task_activity" ON task_activity
  FOR INSERT WITH CHECK (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

-- ============================================================
-- STANDUPS POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_standups" ON standups
  FOR ALL USING (is_admin());

-- Lead: read team standups
CREATE POLICY "lead_read_standups" ON standups
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND user_id IN (
      SELECT id FROM profiles WHERE team_id = get_user_team_id()
    )
  );

-- Intern: read own standups, insert/update own standups
CREATE POLICY "intern_read_own_standups" ON standups
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

-- Intern: read team standups (for team view)
CREATE POLICY "intern_read_team_standups" ON standups
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND user_id IN (
      SELECT id FROM profiles WHERE team_id = get_user_team_id()
    )
  );

CREATE POLICY "intern_insert_standups" ON standups
  FOR INSERT WITH CHECK (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

CREATE POLICY "intern_update_own_standups" ON standups
  FOR UPDATE USING (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

-- ============================================================
-- MEETINGS POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_meetings" ON meetings
  FOR ALL USING (is_admin());

-- Lead: CRUD on team meetings + read org-wide
CREATE POLICY "lead_read_meetings" ON meetings
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

CREATE POLICY "lead_insert_meetings" ON meetings
  FOR INSERT WITH CHECK (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

CREATE POLICY "lead_update_meetings" ON meetings
  FOR UPDATE USING (
    get_user_role() = 'lead'
    AND (team_id = get_user_team_id() OR created_by = auth.uid())
  );

CREATE POLICY "lead_delete_meetings" ON meetings
  FOR DELETE USING (
    get_user_role() = 'lead'
    AND created_by = auth.uid()
  );

-- Intern: read team meetings + org-wide
CREATE POLICY "intern_read_meetings" ON meetings
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND (team_id = get_user_team_id() OR team_id IS NULL)
  );

-- ============================================================
-- ATTENDANCE POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_attendance" ON attendance
  FOR ALL USING (is_admin());

-- Lead: read/write attendance for team meetings
CREATE POLICY "lead_read_attendance" ON attendance
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND meeting_id IN (
      SELECT id FROM meetings WHERE team_id = get_user_team_id() OR team_id IS NULL
    )
  );

CREATE POLICY "lead_insert_attendance" ON attendance
  FOR INSERT WITH CHECK (
    get_user_role() = 'lead'
    AND meeting_id IN (
      SELECT id FROM meetings WHERE team_id = get_user_team_id() OR team_id IS NULL
    )
  );

CREATE POLICY "lead_update_attendance" ON attendance
  FOR UPDATE USING (
    get_user_role() = 'lead'
    AND meeting_id IN (
      SELECT id FROM meetings WHERE team_id = get_user_team_id() OR team_id IS NULL
    )
  );

-- Intern: read own attendance, mark own attendance
CREATE POLICY "intern_read_attendance" ON attendance
  FOR SELECT USING (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

CREATE POLICY "intern_insert_own_attendance" ON attendance
  FOR INSERT WITH CHECK (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

-- ============================================================
-- WORK LOG POLICIES
-- ============================================================

-- Admin: full access
CREATE POLICY "admin_all_work_log" ON work_log
  FOR ALL USING (is_admin());

-- Lead: read team work logs
CREATE POLICY "lead_read_work_log" ON work_log
  FOR SELECT USING (
    get_user_role() = 'lead'
    AND user_id IN (
      SELECT id FROM profiles WHERE team_id = get_user_team_id()
    )
  );

-- Intern: CRUD own work logs
CREATE POLICY "intern_all_own_work_log" ON work_log
  FOR ALL USING (
    get_user_role() = 'intern'
    AND user_id = auth.uid()
  );

-- ============================================================
-- AUDIT LOG POLICIES
-- ============================================================

-- Admin only: read audit logs
CREATE POLICY "admin_all_audit_log" ON audit_log
  FOR ALL USING (is_admin());

-- Service role can always insert (used by API routes)
-- This is handled by using the service role key server-side
