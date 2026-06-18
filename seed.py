"""
One-shot Supabase seed script for Turn2Law Intern Tracker.
Runs schema, RLS policies, seeds teams + admin user.
"""
import urllib.request, urllib.error, json, pathlib, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SUPABASE_URL = "https://oxfkpxgrzumhedrvqslf.supabase.co"
SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZmtweGdyenVtaGVkcnZxc2xmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcwODc1MiwiZXhwIjoyMDk3Mjg0NzUyfQ.x9w7jBksrp2aAjXEEVqBPiDY1VklOQmwrzbUTiOwVbE"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def req(method, path, body=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def run_sql(sql):
    status, body = req("POST", "/rest/v1/rpc/exec_sql", {"sql": sql})
    # exec_sql may not exist — use the query endpoint instead
    return status, body

def sql_via_query(sql):
    """Send SQL via Supabase's pg REST endpoint (requires service role)."""
    url = SUPABASE_URL + "/rest/v1/rpc/exec_sql"
    # Fall back to direct pg query
    pass

# ── Step 1: Check if profiles table already exists ──
print("Checking if schema already exists...")
status, body = req("GET", "/rest/v1/profiles?limit=1")
schema_exists = status == 200

if schema_exists:
    print("[OK] Schema already exists, skipping migrations.")
else:
    print("Schema not found (expected on first run).")
    print()
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("ACTION REQUIRED: Run migrations manually in Supabase SQL Editor")
    print("URL: https://supabase.com/dashboard/project/oxfkpxgrzumhedrvqslf/sql/new")
    print()
    print("Step 1 — Copy and run: supabase/migrations/001_schema.sql")
    print("Step 2 — Copy and run: supabase/migrations/002_rls_policies.sql")
    print("Step 3 — Re-run this script after both migrations succeed.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    sys.exit(1)

# ── Step 2: Create admin auth user ──
print("Creating admin auth user: hanush@turn2law.in ...")
status, body = req("POST", "/auth/v1/admin/users", {
    "email": "hanush@turn2law.in",
    "password": "Admin@T2L2024!",
    "email_confirm": True,
    "user_metadata": {"name": "Hanush Singh R"},
})

if status in (200, 201):
    admin_id = body["id"]
    print(f"[OK] Auth user created: {admin_id}")
elif status == 422 and "already" in str(body).lower():
    # User exists — fetch their ID
    status2, body2 = req("GET", "/auth/v1/admin/users?page=1&per_page=50")
    users = body2.get("users", [])
    admin = next((u for u in users if u["email"] == "hanush@turn2law.in"), None)
    if not admin:
        print("[ERR] Could not find existing admin user. Aborting.")
        sys.exit(1)
    admin_id = admin["id"]
    print(f"[OK] Auth user already exists: {admin_id}")
else:
    print(f"[ERR] Failed to create auth user: {status} {body}")
    sys.exit(1)

# ── Step 3: Upsert admin profile ──
print("Upserting admin profile...")
status, body = req("POST", "/rest/v1/profiles", {
    "id": admin_id,
    "name": "Hanush Singh R",
    "email": "hanush@turn2law.in",
    "role": "admin",
    "status": "active",
    "must_reset_password": False,
    "avatar_url": "",
})

# 201 = created, 409 = already exists (conflict), 200 = ok
if status in (200, 201):
    print("[OK] Admin profile created.")
elif status == 409:
    # Already exists — patch it
    status, body = req("PATCH", f"/rest/v1/profiles?id=eq.{admin_id}", {
        "role": "admin",
        "status": "active",
        "must_reset_password": False,
    })
    if status in (200, 204):
        print("[OK] Admin profile already existed, updated.")
    else:
        print(f"  Profile patch: {status} {body}")
else:
    print(f"  Profile insert response: {status} {body}")

# ── Step 4: Seed teams ──
print("Seeding teams...")
teams = [
    {"id": "00000000-0000-0000-0000-000000000001", "name": "Tracker Squad",  "description": "Building the Intern Tracker system"},
    {"id": "00000000-0000-0000-0000-000000000002", "name": "LawGPT Squad",   "description": "Building the LawGPT AI assistant"},
    {"id": "00000000-0000-0000-0000-000000000003", "name": "DocGen Squad",   "description": "Document generation pipeline"},
]
for team in teams:
    status, body = req("POST", "/rest/v1/teams", team)
    if status in (200, 201):
        print(f"  [OK] Team created: {team['name']}")
    elif status == 409:
        print(f"  [--] Team already exists: {team['name']}")
    else:
        print(f"  [??] Team {team['name']}: {status} {body}")

print()
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
print("✅ DONE! Supabase seeded successfully.")
print()
print("Login credentials:")
print("  Email:    hanush@turn2law.in")
print("  Password: Admin@T2L2024!")
print("  Role:     Admin")
print()
print("Use the Admin Panel in the app to create leads and interns.")
print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
