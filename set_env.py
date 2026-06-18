import subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VERCEL = r"C:\nvm4w\nodejs\vercel.cmd"

vars = [
    ("NEXT_PUBLIC_SUPABASE_URL",      "https://xzxwizxrroyhqbqtczfm.supabase.co"),
    ("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eHdpenhycm95aHFicXRjemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTc2ODAsImV4cCI6MjA5NzM3MzY4MH0.FZsGzlWdw1pjaPh1l2AaaZv2NpkA7P6O-mMLzXjMkYo"),
    ("SUPABASE_SERVICE_ROLE_KEY",     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6eHdpenhycm95aHFicXRjemZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc5NzY4MCwiZXhwIjoyMDk3MzczNjgwfQ.95xG70wJTWDxQRfQcrw45wy9ru_VPYoBSTnTlLwzH7Y"),
]

for key, val in vars:
    result = subprocess.run(
        [VERCEL, "env", "add", key, "production"],
        input=val, capture_output=True, text=True, encoding="utf-8"
    )
    out = result.stdout + result.stderr
    if "Added" in out:
        print(f"[OK] {key}")
    else:
        print(f"[!!] {key}: {out.strip()[:120]}")
