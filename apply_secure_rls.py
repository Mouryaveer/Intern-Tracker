import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import psycopg2

PROJECT_REF = "xzxwizxrroyhqbqtczfm"
DB_PASS     = "oMpGfQTtSM6qsoqpraD?On2A"

print("Connecting to Supabase Postgres...")
conn = None
for host in [
    f"aws-0-ap-south-1.pooler.supabase.com",
    f"aws-0-us-east-1.pooler.supabase.com",
    f"db.{PROJECT_REF}.supabase.co",
]:
    user = f"postgres.{PROJECT_REF}" if "pooler" in host else "postgres"
    cs = f"host={host} port=5432 dbname=postgres user={user} password={DB_PASS} sslmode=require"
    try:
        conn = psycopg2.connect(cs, connect_timeout=10)
        print(f"  [OK] Connected to {host}")
        break
    except Exception as e:
        pass

if not conn:
    print("Failed to connect.")
    sys.exit(1)

cur = conn.cursor()

def run(sql, desc=""):
    try:
        cur.execute(sql)
        conn.commit()
        if desc: print(f"  [OK] {desc}")
    except Exception as e:
        conn.rollback()
        print(f"  [!!] {desc} Failed: {str(e)[:100]}")

print("\n1. Dropping existing overly-permissive policies...")
drop_sql = """
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
  END LOOP;
END $$;
"""
run(drop_sql, "Dropped all existing policies")

print("\n2. Creating robust, recursion-free RLS policies...")

policies = [
    # Profiles (SELECT is open so queries don't recurse)
    ("profiles", "profiles_select", "FOR SELECT USING (auth.uid() IS NOT NULL)"),
    ("profiles", "profiles_update", "FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    ("profiles", "profiles_insert", "FOR INSERT WITH CHECK (auth.uid() = id OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    
    # Teams
    ("teams", "teams_select", "FOR SELECT USING (auth.uid() IS NOT NULL)"),
    ("teams", "teams_modify", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    
    # Tasks
    ("tasks", "tasks_admin", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    ("tasks", "tasks_lead", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lead' AND team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))"),
    ("tasks", "tasks_intern_select", "FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'intern' AND (team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()) OR assignee_id = auth.uid()))"),
    ("tasks", "tasks_intern_update", "FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'intern' AND assignee_id = auth.uid())"),
    
    # Task Activity
    ("task_activity", "activity_select", "FOR SELECT USING (auth.uid() IS NOT NULL)"),
    ("task_activity", "activity_insert", "FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)"),
    ("task_activity", "activity_modify", "FOR UPDATE USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    
    # Standups
    ("standups", "standups_admin", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    ("standups", "standups_lead_select", "FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lead' AND user_id IN (SELECT id FROM profiles WHERE team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())))"),
    ("standups", "standups_intern_all", "FOR ALL USING (user_id = auth.uid())"),

    # Meetings
    ("meetings", "meetings_admin", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    ("meetings", "meetings_lead", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lead' AND team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))"),
    ("meetings", "meetings_intern", "FOR SELECT USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'intern' AND team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()))"),
    
    # Attendance
    ("attendance", "attendance_admin", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')"),
    ("attendance", "attendance_lead", "FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'lead' AND meeting_id IN (SELECT id FROM meetings WHERE team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())))"),
    ("attendance", "attendance_intern", "FOR ALL USING (user_id = auth.uid())"),
]

for tbl, name, rule in policies:
    run(f'CREATE POLICY "{name}" ON {tbl} {rule}', f"Policy: {name}")

print("\n3. Creating automated Task Activity trigger...")

trigger_sql = """
CREATE OR REPLACE FUNCTION log_task_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO task_activity (task_id, user_id, action, from_status, to_status)
    VALUES (NEW.id, auth.uid(), 'Changed status', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS task_status_trigger ON tasks;
CREATE TRIGGER task_status_trigger
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION log_task_status_change();
"""

run(trigger_sql, "Created Task Activity Postgres Trigger")

print("\n[DONE] RLS policies and triggers successfully applied!")
cur.close()
conn.close()
