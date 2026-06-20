import subprocess, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

VERCEL = "C:\\nvm4w\\nodejs\\vercel.cmd"

vars = {
    "SMTP_USER": "mouryasreesailam@gmail.com",
    "SMTP_PASS": "cwpc uqgc ocqf xqrt",
    "SMTP_FROM": "Turn2Law Intern Tracker <mouryasreesailam@gmail.com>",
}

for key, val in vars.items():
    r = subprocess.run(
        [VERCEL, "env", "add", key, "production", "--force"],
        input=val, capture_output=True, encoding="utf-8"
    )
    out = (r.stdout + r.stderr).replace('\n', ' ').strip()
    print(f"[{'OK' if 'Added' in out or 'Overrode' in out else '!!'}] {key}: {out[:80]}")
