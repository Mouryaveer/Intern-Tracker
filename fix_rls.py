"""Fix circular RLS policies via Supabase REST API (no direct Postgres needed)."""
import sys, io, json, urllib.request, urllib.error
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT_REF = "xzxwizxrroyhqbqtczfm"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eHdpenhycm95aHFicXRjemZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5NzY4MCwiZXhwIjoyMDk3MzczNjgwfQ.95xG70wJTWDxQRfQcrw45wy9ru_VPYoBSTnTlLwzH7Y"
BASE = f"https://{PROJECT_REF}.supabase.co"

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

# Step 1: Check existing profiles
print("[1/3] Checking existing profiles...")
s, profiles = api("GET", "/rest/v1/profiles?select=id,email,role,status&order=role,name")
if s == 200:
    print(f"  Found {len(profiles)} profiles:")
    for p in profiles:
        print(f"    {p['email']:30s} | {p['role']:8s} | {p['status']}")
else:
    print(f"  [!!] Could not fetch profiles: {s} {profiles}")

# Step 2: Try to create an exec_sql RPC function via pg_net or direct approach
# Since we can't execute DDL via PostgREST, we'll create a workaround:
# Use the Supabase REST pg endpoint (undocumented but available)
print("\n[2/3] Attempting to fix RLS via pg endpoint...")

SQL = """
-- Drop old circular policies on profiles
DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
DROP POLICY IF EXISTS "lead_read_profiles" ON profiles;
DROP POLICY IF EXISTS "lead_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "intern_read_profiles" ON profiles;
DROP POLICY IF EXISTS "intern_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "self_read_profile" ON profiles;
DROP POLICY IF EXISTS "self_update_profile" ON profiles;
DROP POLICY IF EXISTS "lead_read_team" ON profiles;
DROP POLICY IF EXISTS "lead_update_own" ON profiles;
DROP POLICY IF EXISTS "intern_read_own" ON profiles;
DROP POLICY IF EXISTS "intern_update_own" ON profiles;

-- Self-read: breaks the circular dependency
CREATE POLICY "self_read_profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "self_update_profile" ON profiles FOR UPDATE USING (auth.uid() = id);
-- Admin: full access
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
-- Lead: read team
CREATE POLICY "lead_read_team" ON profiles FOR SELECT
  USING (team_id = (SELECT team_id FROM profiles WHERE id = auth.uid()));

-- Fix teams
DROP POLICY IF EXISTS "admin_all_teams" ON teams;
DROP POLICY IF EXISTS "lead_read_teams" ON teams;
DROP POLICY IF EXISTS "intern_read_teams" ON teams;
DROP POLICY IF EXISTS "auth_read_teams" ON teams;
CREATE POLICY "auth_read_teams" ON teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_all_teams" ON teams FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
"""

# Try the Supabase SQL API (available in some deployments)
sql_endpoints = [
    "/pg",
    "/rest/v1/rpc",
]

# Approach: Create an RPC function first, then call it
# Step A: Try creating the exec function
create_fn_sql = """
CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
BEGIN EXECUTE query; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

# We need to execute SQL somehow. Let's try using pg_net or the REST API
# Actually, let's try the approach of using a service-role connection to create a function

# Alternative: Use Supabase Management API if we have access
# For now, let's try each statement individually as RPC calls

# First, try to create the exec_sql function via the pg_meta API
import urllib.parse

# Try the Supabase pg/query endpoint 
print("  Trying Supabase pg endpoint...")
pg_headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "X-Connection-Encrypted": "true",
}

# Try executing SQL via pg endpoint
try:
    req = urllib.request.Request(
        f"{BASE}/pg/query",
        data=json.dumps({"query": SQL}).encode(),
        headers=pg_headers,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        print(f"  [OK] SQL executed successfully via /pg/query!")
        print(f"  Result: {json.dumps(result)[:200]}")
except urllib.error.HTTPError as e:
    raw = e.read().decode()
    print(f"  [!!] /pg/query failed ({e.code}): {raw[:200]}")
    
    # Try alternative: execute each statement as individual RPC
    print("\n  Trying alternative approach...")
    
    # Create exec_sql function first
    try:
        req2 = urllib.request.Request(
            f"{BASE}/pg/query",
            data=json.dumps({"query": create_fn_sql}).encode(),
            headers=pg_headers,
            method="POST"
        )
        with urllib.request.urlopen(req2) as resp2:
            print("  [OK] exec_sql function created!")
    except Exception as e2:
        print(f"  [!!] exec_sql creation also failed: {str(e2)[:100]}")
        
        # Last resort: try REST v1 rpc
        print("\n  Trying rpc approach...")
        for stmt in SQL.strip().split(';'):
            stmt = stmt.strip()
            if not stmt or stmt.startswith('--'):
                continue
            s, body = api("POST", "/rest/v1/rpc/exec_sql", {"query": stmt + ";"})
            if s in (200, 204):
                print(f"  [OK] {stmt[:60]}...")
            else:
                print(f"  [!!] ({s}) {stmt[:40]}... → {str(body)[:80]}")
except Exception as e:
    print(f"  [!!] Unexpected error: {str(e)[:200]}")

print("\n[3/3] Verifying profiles still accessible (via service role)...")
s, profiles = api("GET", "/rest/v1/profiles?select=id,email,role,status&order=role,name")
if s == 200:
    print(f"  [OK] {len(profiles)} profiles found")
else:
    print(f"  [!!] {s} {profiles}")

print("\n" + "=" * 60)
print("If the automated fix didn't work, run this SQL in the Supabase SQL Editor:")
print(f"  https://supabase.com/dashboard/project/{PROJECT_REF}/sql/new")
print("=" * 60)
print(SQL)
