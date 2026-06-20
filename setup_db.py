"""
Full Supabase setup: schema + seed dummy data.
New project: xzxwizxrroyhqbqtczfm
"""
import sys, io, json, urllib.request, urllib.error
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2

PROJECT_REF = "xzxwizxrroyhqbqtczfm"
DB_PASS     = "oMpGfQTtSM6qsoqpraD?On2A"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eHdpenhycm95aHFicXRjemZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5NzY4MCwiZXhwIjoyMDk3MzczNjgwfQ.95xG70wJTWDxQRfQcrw45wy9ru_VPYoBSTnTlLwzH7Y"
BASE        = f"https://{PROJECT_REF}.supabase.co"

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=H, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, (json.loads(raw) if raw else [])
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else {})

# ── Connect to Postgres directly ──
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
        print(f"  Trying {host}...")
        conn = psycopg2.connect(cs, connect_timeout=10)
        print(f"  [OK] Connected!")
        break
    except Exception as e:
        print(f"  [!!] {str(e)[:80]}")

if not conn:
    print("\nAll connection attempts failed. Check DB password.")
    sys.exit(1)

cur = conn.cursor()

def run(sql, desc=""):
    try:
        cur.execute(sql)
        conn.commit()
        if desc: print(f"  [OK] {desc}")
        return True
    except Exception as e:
        conn.rollback()
        msg = str(e).strip()
        if any(x in msg.lower() for x in ["already exists", "duplicate"]):
            if desc: print(f"  [--] {desc} (already exists)")
            return True
        print(f"  [!!] {desc}: {msg[:120]}")
        return False

# ── 1. Schema ──
print("\n[1/5] Creating schema...")

run("CREATE TYPE user_role AS ENUM ('admin','lead','intern')", "enum: user_role")
run("CREATE TYPE user_status AS ENUM ('active','inactive')", "enum: user_status")
run("CREATE TYPE task_status AS ENUM ('todo','in_progress','review','done','blocked')", "enum: task_status")
run("CREATE TYPE task_priority AS ENUM ('low','medium','high')", "enum: task_priority")
run("CREATE TYPE attendance_status AS ENUM ('present','absent','late','excused')", "enum: attendance_status")

run("""CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'intern',
  team_id UUID,
  avatar_url TEXT DEFAULT '',
  status user_status NOT NULL DEFAULT 'active',
  must_reset_password BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: profiles")

run("""CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: teams")

run("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL", "fk: profiles.team_id")
run("ALTER TABLE teams ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL", "fk: teams.lead_id")

run("""CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  acceptance_criteria TEXT DEFAULT '',
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
)""", "table: tasks")

run("""CREATE TABLE IF NOT EXISTS task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_status task_status,
  to_status task_status,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: task_activity")

run("""CREATE TABLE IF NOT EXISTS standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  did_yesterday TEXT NOT NULL DEFAULT '',
  doing_today TEXT NOT NULL DEFAULT '',
  blockers TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
)""", "table: standups")

run("""CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  agenda TEXT DEFAULT '',
  notes_url TEXT DEFAULT '',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: meetings")

run("""CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ,
  UNIQUE(meeting_id, user_id)
)""", "table: attendance")

run("""CREATE TABLE IF NOT EXISTS work_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL DEFAULT '',
  link TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: work_log")

run("""CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)""", "table: audit_log")

# RLS
for tbl in ["profiles","teams","tasks","task_activity","standups","meetings","attendance","work_log","audit_log"]:
    run(f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY", f"RLS: {tbl}")

# Realtime
for tbl in ["tasks","standups","attendance","task_activity"]:
    run(f"ALTER PUBLICATION supabase_realtime ADD TABLE {tbl}", f"realtime: {tbl}")

# ── 2. RLS helper functions + policies ──
print("\n[2/5] Creating RLS functions and policies...")

run("""CREATE OR REPLACE FUNCTION get_user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE""", "fn: get_user_role")

run("""CREATE OR REPLACE FUNCTION get_user_team_id() RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE""", "fn: get_user_team_id")

run("""CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE""", "fn: is_admin")

policies = [
    ("profiles", "admin_all_profiles",      "FOR ALL USING (is_admin())"),
    ("profiles", "lead_read_profiles",       "FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR id=auth.uid()))"),
    ("profiles", "lead_update_own",          "FOR UPDATE USING (get_user_role()='lead' AND id=auth.uid())"),
    ("profiles", "intern_read_profiles",     "FOR SELECT USING (get_user_role()='intern' AND (id=auth.uid() OR team_id=get_user_team_id()))"),
    ("profiles", "intern_update_own",        "FOR UPDATE USING (get_user_role()='intern' AND id=auth.uid())"),
    ("teams",    "admin_all_teams",          "FOR ALL USING (is_admin())"),
    ("teams",    "lead_read_teams",          "FOR SELECT USING (get_user_role()='lead')"),
    ("teams",    "intern_read_teams",        "FOR SELECT USING (get_user_role()='intern')"),
    ("tasks",    "admin_all_tasks",          "FOR ALL USING (is_admin())"),
    ("tasks",    "lead_read_tasks",          "FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("tasks",    "lead_insert_tasks",        "FOR INSERT WITH CHECK (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("tasks",    "lead_update_tasks",        "FOR UPDATE USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("tasks",    "lead_delete_tasks",        "FOR DELETE USING (get_user_role()='lead' AND team_id=get_user_team_id())"),
    ("tasks",    "intern_read_tasks",        "FOR SELECT USING (get_user_role()='intern' AND (assignee_id=auth.uid() OR team_id=get_user_team_id()))"),
    ("tasks",    "intern_update_own_tasks",  "FOR UPDATE USING (get_user_role()='intern' AND assignee_id=auth.uid())"),
    ("standups", "admin_all_standups",       "FOR ALL USING (is_admin())"),
    ("standups", "lead_read_standups",       "FOR SELECT USING (get_user_role()='lead' AND user_id IN (SELECT id FROM profiles WHERE team_id=get_user_team_id()))"),
    ("standups", "intern_read_own",          "FOR SELECT USING (get_user_role()='intern' AND user_id=auth.uid())"),
    ("standups", "intern_insert",            "FOR INSERT WITH CHECK (get_user_role()='intern' AND user_id=auth.uid())"),
    ("standups", "intern_update_own",        "FOR UPDATE USING (get_user_role()='intern' AND user_id=auth.uid())"),
    ("meetings", "admin_all_meetings",       "FOR ALL USING (is_admin())"),
    ("meetings", "lead_read_meetings",       "FOR SELECT USING (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("meetings", "lead_insert_meetings",     "FOR INSERT WITH CHECK (get_user_role()='lead' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("meetings", "intern_read_meetings",     "FOR SELECT USING (get_user_role()='intern' AND (team_id=get_user_team_id() OR team_id IS NULL))"),
    ("attendance","admin_all_attendance",    "FOR ALL USING (is_admin())"),
    ("attendance","lead_all_attendance",     "FOR ALL USING (get_user_role()='lead' AND meeting_id IN (SELECT id FROM meetings WHERE team_id=get_user_team_id() OR team_id IS NULL))"),
    ("attendance","intern_read_own",         "FOR SELECT USING (get_user_role()='intern' AND user_id=auth.uid())"),
    ("attendance","intern_insert_own",       "FOR INSERT WITH CHECK (get_user_role()='intern' AND user_id=auth.uid())"),
    ("audit_log", "admin_all_audit",         "FOR ALL USING (is_admin())"),
]
for tbl, name, rule in policies:
    run(f'CREATE POLICY "{name}" ON {tbl} {rule}', f"policy: {name}")

# ── 3. Auth users ──
print("\n[3/5] Creating auth users...")

users_spec = [
    {"email": "hanush@turn2law.in",  "password": "Admin@T2L2024!",  "name": "Hanush Singh R",  "role": "admin",  "must_reset": False, "team": None},
    {"email": "priya@turn2law.in",   "password": "Lead@T2L2024!",   "name": "Priya Sharma",    "role": "lead",   "must_reset": False, "team": "00000000-0000-0000-0000-000000000001"},
    {"email": "arjun@turn2law.in",   "password": "Lead@T2L2024!",   "name": "Arjun Mehta",     "role": "lead",   "must_reset": False, "team": "00000000-0000-0000-0000-000000000002"},
    {"email": "kavya@turn2law.in",   "password": "Intern@2024!",    "name": "Kavya Reddy",     "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000001"},
    {"email": "rahul@turn2law.in",   "password": "Intern@2024!",    "name": "Rahul Verma",     "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000001"},
    {"email": "sneha@turn2law.in",   "password": "Intern@2024!",    "name": "Sneha Nair",      "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000001"},
    {"email": "vikram@turn2law.in",  "password": "Intern@2024!",    "name": "Vikram Iyer",     "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000002"},
    {"email": "ananya@turn2law.in",  "password": "Intern@2024!",    "name": "Ananya Pillai",   "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000002"},
    {"email": "karan@turn2law.in",   "password": "Intern@2024!",    "name": "Karan Singhania", "role": "intern", "must_reset": True,  "team": "00000000-0000-0000-0000-000000000003"},
]

s, body = api("GET", "/auth/v1/admin/users?page=1&per_page=100")
existing = {u["email"]: u["id"] for u in body.get("users", [])} if s == 200 else {}

ids = {}
for u in users_spec:
    email = u["email"]
    if email in existing:
        ids[email] = existing[email]
        print(f"  [--] {email} (exists)")
        continue
    s, body = api("POST", "/auth/v1/admin/users", {"email": email, "password": u["password"], "email_confirm": True})
    if s in (200, 201):
        ids[email] = body["id"]
        print(f"  [OK] {email}")
    else:
        print(f"  [!!] {email}: {s} {body}")

# ── 4. Teams + Profiles ──
print("\n[4/5] Seeding teams and profiles...")

T1 = "00000000-0000-0000-0000-000000000001"
T2 = "00000000-0000-0000-0000-000000000002"
T3 = "00000000-0000-0000-0000-000000000003"

for tid, name, desc in [
    (T1, "Tracker Squad", "Building the Intern Tracker system"),
    (T2, "LawGPT Squad",  "Building the LawGPT AI assistant"),
    (T3, "DocGen Squad",  "Document generation pipeline"),
]:
    run(f"INSERT INTO teams (id,name,description) VALUES ('{tid}','{name}','{desc}') ON CONFLICT (id) DO NOTHING", f"team: {name}")

for u in users_spec:
    uid = ids.get(u["email"])
    if not uid: continue
    team = f"'{u['team']}'" if u["team"] else "NULL"
    cur.execute(f"""
        INSERT INTO profiles (id,name,email,role,team_id,avatar_url,status,must_reset_password)
        VALUES (%s,%s,%s,%s,{team},'','active',%s)
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name, role=EXCLUDED.role,
          team_id=EXCLUDED.team_id, must_reset_password=EXCLUDED.must_reset_password
    """, (uid, u["name"], u["email"], u["role"], u["must_reset"]))
    conn.commit()
    print(f"  [OK] profile: {u['name']} ({u['role']})")

priya_id = ids.get("priya@turn2law.in")
arjun_id = ids.get("arjun@turn2law.in")
if priya_id: cur.execute(f"UPDATE teams SET lead_id='{priya_id}' WHERE id='{T1}'")
if arjun_id: cur.execute(f"UPDATE teams SET lead_id='{arjun_id}' WHERE id='{T2}'")
conn.commit()
print("  [OK] team leads assigned")

# ── 5. Dummy data ──
print("\n[5/5] Seeding tasks, standups, meetings...")
from datetime import date, timedelta
today = date.today()

admin_id  = ids.get("hanush@turn2law.in")
kavya_id  = ids.get("kavya@turn2law.in")
rahul_id  = ids.get("rahul@turn2law.in")
sneha_id  = ids.get("sneha@turn2law.in")
vikram_id = ids.get("vikram@turn2law.in")
ananya_id = ids.get("ananya@turn2law.in")
karan_id  = ids.get("karan@turn2law.in")

tasks = [
    ("Set up Next.js project structure",  "done",        "high",   kavya_id,  T1, priya_id,  today-timedelta(days=10)),
    ("Build authentication flow",         "done",        "high",   rahul_id,  T1, priya_id,  today-timedelta(days=8)),
    ("Design dashboard UI components",    "in_progress", "medium", sneha_id,  T1, priya_id,  today+timedelta(days=2)),
    ("Integrate Supabase realtime",       "in_progress", "high",   kavya_id,  T1, priya_id,  today+timedelta(days=4)),
    ("Write unit tests for task module",  "todo",        "medium", rahul_id,  T1, priya_id,  today+timedelta(days=7)),
    ("Write onboarding documentation",    "blocked",     "low",    sneha_id,  T1, priya_id,  today-timedelta(days=1)),
    ("LawGPT prompt engineering v2",      "in_progress", "high",   vikram_id, T2, arjun_id,  today+timedelta(days=1)),
    ("API rate limiting implementation",  "review",      "medium", vikram_id, T2, arjun_id,  today-timedelta(days=2)),
    ("Train classification model",        "todo",        "high",   ananya_id, T2, arjun_id,  today+timedelta(days=10)),
    ("Deploy staging environment",        "todo",        "low",    karan_id,  T3, admin_id,  today+timedelta(days=12)),
]
for title, status, priority, assignee, team, creator, due in tasks:
    cur.execute("""
        INSERT INTO tasks (title,status,priority,assignee_id,team_id,created_by,due_date)
        VALUES (%s,%s,%s,%s,%s,%s,%s)
    """, (title, status, priority, assignee, team, creator, due))
conn.commit()
print(f"  [OK] {len(tasks)} tasks")

standups = [
    (kavya_id,  today-timedelta(days=1), "Finished auth flow integration",    "Working on realtime sync",       ""),
    (rahul_id,  today-timedelta(days=1), "Wrote login unit tests",             "Continuing task module tests",   "Blocked on API docs"),
    (sneha_id,  today-timedelta(days=1), "Completed dashboard mockups",        "Building sidebar component",     ""),
    (vikram_id, today-timedelta(days=1), "LawGPT prompt v2 drafted",           "Testing prompt accuracy",        "Need more test cases"),
    (ananya_id, today-timedelta(days=1), "Research on classification done",    "Starting training pipeline",     ""),
    (kavya_id,  today,                   "Integrated Supabase client",          "Realtime subscriptions",         ""),
    (rahul_id,  today,                   "Fixed login edge cases",              "Task module tests",              ""),
    (vikram_id, today,                   "Prompt accuracy improved to 87pct",   "Rate limiting impl",             ""),
]
for uid, d, yesterday, today_w, blockers in standups:
    if not uid: continue
    cur.execute("""
        INSERT INTO standups (user_id,date,did_yesterday,doing_today,blockers)
        VALUES (%s,%s,%s,%s,%s) ON CONFLICT (user_id,date) DO NOTHING
    """, (uid, d, yesterday, today_w, blockers))
conn.commit()
print(f"  [OK] {len(standups)} standups")

meetings_data = [
    ("Weekly All-Hands",       today-timedelta(days=3), None, "Sprint review and blockers",  admin_id),
    ("Tracker Squad Standup",  today-timedelta(days=1), T1,   "Daily sync",                 priya_id),
    ("LawGPT Sprint Planning", today,                   T2,   "Plan next sprint tasks",      arjun_id),
    ("Admin-Lead 1:1 Sync",    today+timedelta(days=2), None, "Performance check-in",        admin_id),
]
meeting_ids = []
for title, dt, team, agenda, creator in meetings_data:
    cur.execute("""
        INSERT INTO meetings (title,scheduled_at,team_id,agenda,created_by)
        VALUES (%s,%s,%s,%s,%s) RETURNING id
    """, (title, dt, team, agenda, creator))
    meeting_ids.append(cur.fetchone()[0])
conn.commit()
print(f"  [OK] {len(meetings_data)} meetings")

# Attendance for all-hands
if meeting_ids:
    for uid, status in [(admin_id,"present"),(priya_id,"present"),(arjun_id,"present"),
                        (kavya_id,"present"),(rahul_id,"present"),(sneha_id,"late"),
                        (vikram_id,"present"),(ananya_id,"absent"),(karan_id,"absent")]:
        if uid:
            cur.execute("INSERT INTO attendance (meeting_id,user_id,status) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                        (meeting_ids[0], uid, status))
    conn.commit()
    print("  [OK] attendance seeded")

cur.close()
conn.close()

print()
print("=" * 60)
print("[DONE] Database fully set up!")
print()
print("Credentials:")
print("  Admin:  hanush@turn2law.in  /  Admin@T2L2024!")
print("  Lead:   priya@turn2law.in   /  Lead@T2L2024!")
print("  Lead:   arjun@turn2law.in   /  Lead@T2L2024!")
print("  Intern: kavya@turn2law.in   /  Intern@2024!")
print("  Intern: rahul@turn2law.in   /  Intern@2024!")
print("  Intern: sneha@turn2law.in   /  Intern@2024!")
print("  Intern: vikram@turn2law.in  /  Intern@2024!")
print("  Intern: ananya@turn2law.in  /  Intern@2024!")
print("  Intern: karan@turn2law.in   /  Intern@2024!")
print("=" * 60)
