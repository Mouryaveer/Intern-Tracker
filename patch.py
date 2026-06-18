"""
Patch existing Supabase schema — add missing columns and seed data.
Uses the Supabase pg REST endpoint which accepts raw SQL via service role.
"""
import urllib.request, urllib.error, json, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT_REF = "oxfkpxgrzumhedrvqslf"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZmtweGdyenVtaGVkcnZxc2xmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcwODc1MiwiZXhwIjoyMDk3Mjg0NzUyfQ.x9w7jBksrp2aAjXEEVqBPiDY1VklOQmwrzbUTiOwVbE"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def rest(method, path, body=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=H, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else []
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw) if raw else {}

# ── Check what columns profiles already has ──
print("Detecting current profiles columns...")
# We do this by trying specific selects
cols_to_check = ["id", "name", "email", "role", "status", "must_reset_password", "avatar_url", "team_id", "created_at"]
existing_cols = []
for col in cols_to_check:
    s, _ = rest("GET", f"/rest/v1/profiles?select={col}&limit=1")
    if s == 200:
        existing_cols.append(col)
    else:
        print(f"  [missing] {col}")

print(f"  [found] {existing_cols}")

missing = [c for c in cols_to_check if c not in existing_cols]
print(f"\nMissing columns: {missing}")

if not missing:
    print("[OK] All columns exist!")
else:
    print(f"\n[!!] Cannot add columns via REST API — Supabase REST doesn't support DDL.")
    print()
    print("="*60)
    print("MANUAL STEP REQUIRED")
    print("="*60)
    print()
    print("Open this URL and run the SQL below:")
    print("https://supabase.com/dashboard/project/oxfkpxgrzumhedrvqslf/sql/new")
    print()
    
    alter_statements = []
    col_defs = {
        "avatar_url":           "TEXT DEFAULT ''",
        "team_id":              "UUID",
        "must_reset_password":  "BOOLEAN NOT NULL DEFAULT true",
    }
    for col in missing:
        if col in col_defs:
            alter_statements.append(f"ALTER TABLE profiles ADD COLUMN IF NOT EXISTS {col} {col_defs[col]};")
    
    if alter_statements:
        print("-- Patch 1: Add missing columns to profiles")
        for s in alter_statements:
            print(s)
        print()
    
    # Check if teams table exists
    s_teams, _ = rest("GET", "/rest/v1/teams?limit=1")
    if s_teams != 200:
        print("-- Also create the teams table (it doesn't exist):")
        print("""CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);""")
        print()
    
    # Other missing tables
    for tbl in ["tasks", "task_activity", "standups", "meetings", "attendance", "work_log", "audit_log"]:
        s_tbl, _ = rest("GET", f"/rest/v1/{tbl}?limit=1")
        if s_tbl != 200:
            print(f"-- Table '{tbl}' is also missing — run 001_schema.sql in full.")
            break
    
    print()
    print("After running the SQL above, run: python patch.py")
    print()
    print("Or, if you want a completely fresh setup:")
    print("  1. Delete ALL tables in Supabase (Table Editor -> ... -> Delete)")
    print("  2. Run 001_schema.sql")
    print("  3. Run 002_rls_policies.sql")
    print("  4. Run seed.py")
    sys.exit(1)

# ── If schema is ready, create admin ──
print("\n[1] Creating admin auth user...")
s, b = rest("POST", "/auth/v1/admin/users", {
    "email": "hanush@turn2law.in",
    "password": "Admin@T2L2024!",
    "email_confirm": True,
})
if s in (200, 201):
    admin_id = b["id"]
    print(f"    [OK] Created: {admin_id}")
elif s == 422:
    s2, b2 = rest("GET", "/auth/v1/admin/users?page=1&per_page=100")
    users = b2.get("users", [])
    admin = next((u for u in users if u.get("email") == "hanush@turn2law.in"), None)
    if not admin:
        print(f"    [ERR] {s} {b}")
        sys.exit(1)
    admin_id = admin["id"]
    print(f"    [--] Already exists: {admin_id}")
else:
    print(f"    [ERR] {s} {b}")
    sys.exit(1)

print("\n[2] Upserting admin profile...")
s, b = rest("POST", "/rest/v1/profiles", {
    "id": admin_id, "name": "Hanush Singh R",
    "email": "hanush@turn2law.in", "role": "admin",
    "status": "active", "must_reset_password": False, "avatar_url": "",
})
if s in (200, 201):
    print("    [OK] Profile created.")
elif s == 409:
    rest("PATCH", f"/rest/v1/profiles?id=eq.{admin_id}", {
        "role": "admin", "must_reset_password": False
    })
    print("    [--] Already existed, updated.")
else:
    print(f"    [!!] {s} {b}")

print("\n[3] Seeding teams...")
for t in [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Tracker Squad", "description": "Building the Intern Tracker system"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "LawGPT Squad",  "description": "Building the LawGPT AI assistant"},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "DocGen Squad",  "description": "Document generation pipeline"},
]:
    s, b = rest("POST", "/rest/v1/teams", t)
    if s in (200, 201): print(f"    [OK] {t['name']}")
    elif s == 409:       print(f"    [--] {t['name']} (exists)")
    else:                print(f"    [!!] {t['name']}: {s} {b}")

print()
print("="*60)
print("[DONE]")
print("  Email:    hanush@turn2law.in")
print("  Password: Admin@T2L2024!")
print("  Role:     Admin")
print("="*60)
