import sys, io, psycopg2
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

PROJECT_REF = "xzxwizxrroyhqbqtczfm"
DB_PASS     = "oMpGfQTtSM6qsoqpraD?On2A"

attempts = [
    f"host=aws-0-ap-south-1.pooler.supabase.com port=5432  dbname=postgres user=postgres.{PROJECT_REF} password={DB_PASS} sslmode=require",
    f"host=aws-0-ap-south-1.pooler.supabase.com port=6543  dbname=postgres user=postgres.{PROJECT_REF} password={DB_PASS} sslmode=require",
    f"host=aws-0-us-east-1.pooler.supabase.com  port=5432  dbname=postgres user=postgres.{PROJECT_REF} password={DB_PASS} sslmode=require",
    f"host=aws-0-us-east-1.pooler.supabase.com  port=6543  dbname=postgres user=postgres.{PROJECT_REF} password={DB_PASS} sslmode=require",
    f"host=db.{PROJECT_REF}.supabase.co          port=5432  dbname=postgres user=postgres               password={DB_PASS} sslmode=require",
    f"host=db.{PROJECT_REF}.supabase.co          port=6543  dbname=postgres user=postgres               password={DB_PASS} sslmode=require",
    f"host={PROJECT_REF}.supabase.co             port=5432  dbname=postgres user=postgres               password={DB_PASS} sslmode=require",
]

for cs in attempts:
    host = cs.split("host=")[1].split()[0]
    port = cs.split("port=")[1].split()[0]
    try:
        print(f"Trying {host}:{port}...", end=" ")
        conn = psycopg2.connect(cs, connect_timeout=8)
        print("CONNECTED!")
        conn.close()
        break
    except Exception as e:
        print(f"FAIL: {str(e)[:60]}")
