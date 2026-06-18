"""
Run SQL migrations via Supabase Management API.
"""
import urllib.request, urllib.error, json, sys, io, pathlib

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT_REF = "oxfkpxgrzumhedrvqslf"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94ZmtweGdyenVtaGVkcnZxc2xmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcwODc1MiwiZXhwIjoyMDk3Mjg0NzUyfQ.x9w7jBksrp2aAjXEEVqBPiDY1VklOQmwrzbUTiOwVbE"
SUPABASE_URL = f"https://{PROJECT_REF}.supabase.co"

HEADERS_REST = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def rest(method, path, body=None):
    url = SUPABASE_URL + path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=HEADERS_REST, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read() or b"[]")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

# ── Check what tables exist ──
print("Checking existing tables in Supabase...")
status, body = rest("GET", "/rest/v1/profiles?select=id&limit=1")
print(f"  profiles table: status={status}")
if status == 200:
    print("  -> profiles table exists with correct schema!")
elif status == 400:
    print(f"  -> Table exists but wrong schema: {body.get('message','')}")
elif status == 404:
    print("  -> Table does not exist yet")
else:
    print(f"  -> {body}")

# Check if profiles has the right columns by trying a select
status2, body2 = rest("GET", "/rest/v1/profiles?select=id,name,email,role,status,must_reset_password,avatar_url,team_id&limit=1")
print(f"\n  Full column check: status={status2}")
if status2 == 200:
    print("  [OK] All expected columns exist in profiles!")
    schema_ready = True
else:
    print(f"  [!!] Schema missing or incomplete: {body2.get('message','')}")
    schema_ready = False

if not schema_ready:
    print()
    print("="*60)
    print("SCHEMA NEEDS TO BE CREATED/UPDATED")
    print("="*60)
    print()
    print("The existing 'profiles' table is missing columns from our schema.")
    print("This likely means a different/older schema is installed.")
    print()
    print("Please go to the Supabase SQL Editor and run these files:")
    print()
    print("1. https://supabase.com/dashboard/project/oxfkpxgrzumhedrvqslf/sql/new")
    print()
    
    base = pathlib.Path(r"c:\Users\moury\Coding\Turn2Law\Intern-Tracker\supabase\migrations")
    for fname in ["001_schema.sql", "002_rls_policies.sql"]:
        fpath = base / fname
        print(f"--- FILE: {fname} ---")
        print(fpath.read_text(encoding='utf-8')[:500] + "...\n")
    
    print("After running both SQL files, re-run seed.py")
    sys.exit(1)
else:
    print()
    print("Schema is ready! Proceeding with user creation...")
    
    # Create admin user
    admin_id = None
    print("\n[1] Creating admin auth user...")
    status, body = rest("POST", "/auth/v1/admin/users", {
        "email": "hanush@turn2law.in",
        "password": "Admin@T2L2024!",
        "email_confirm": True,
        "user_metadata": {"name": "Hanush Singh R"},
    })
    if status in (200, 201):
        admin_id = body["id"]
        print(f"    [OK] Created: {admin_id}")
    elif status == 422:
        # fetch existing
        status2, body2 = rest("GET", "/auth/v1/admin/users?page=1&per_page=100")
        users = body2.get("users", [])
        admin = next((u for u in users if u["email"] == "hanush@turn2law.in"), None)
        if admin:
            admin_id = admin["id"]
            print(f"    [--] Already exists: {admin_id}")
        else:
            print(f"    [ERR] {status} {body}")
            sys.exit(1)
    else:
        print(f"    [ERR] {status} {body}")
        sys.exit(1)

    # Upsert profile
    print("\n[2] Upserting admin profile...")
    status, body = rest("POST", "/rest/v1/profiles", {
        "id": admin_id,
        "name": "Hanush Singh R",
        "email": "hanush@turn2law.in",
        "role": "admin",
        "status": "active",
        "must_reset_password": False,
        "avatar_url": "",
    })
    if status in (200, 201):
        print("    [OK] Profile created.")
    elif status == 409:
        status, _ = rest("PATCH", f"/rest/v1/profiles?id=eq.{admin_id}", {
            "role": "admin", "status": "active", "must_reset_password": False
        })
        print(f"    [--] Already existed, patched. ({status})")
    else:
        print(f"    [!!] {status} {body}")

    # Seed teams
    print("\n[3] Seeding teams...")
    teams = [
        {"id": "00000000-0000-0000-0000-000000000001", "name": "Tracker Squad", "description": "Building the Intern Tracker system"},
        {"id": "00000000-0000-0000-0000-000000000002", "name": "LawGPT Squad",  "description": "Building the LawGPT AI assistant"},
        {"id": "00000000-0000-0000-0000-000000000003", "name": "DocGen Squad",  "description": "Document generation pipeline"},
    ]
    for t in teams:
        s, b = rest("POST", "/rest/v1/teams", t)
        if s in (200, 201):
            print(f"    [OK] {t['name']}")
        elif s == 409:
            print(f"    [--] {t['name']} (already exists)")
        else:
            print(f"    [!!] {t['name']}: {s} {b}")

    print()
    print("="*60)
    print("[DONE] Supabase seeded!")
    print()
    print("Admin credentials:")
    print("  Email:    hanush@turn2law.in")
    print("  Password: Admin@T2L2024!")
    print()
    print("Use the Admin Panel in the app to create leads & interns.")
    print("="*60)
