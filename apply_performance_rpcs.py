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

sql1 = """
CREATE OR REPLACE FUNCTION get_user_performance_metrics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_tasks_total INT;
    v_tasks_completed INT;
    v_on_time_completed INT;
    v_on_time_rate INT;
    v_standups_submitted INT;
    v_attendance_total INT;
    v_attendance_present INT;
    v_attendance_rate INT;
    v_streak INT := 0;
    v_check_date DATE := CURRENT_DATE;
    v_found BOOLEAN;
    v_day_of_week INT;
BEGIN
    -- Tasks
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE status = 'done'),
           COUNT(*) FILTER (WHERE status = 'done' AND (due_date IS NULL OR completed_at::date <= due_date::date))
    INTO v_tasks_total, v_tasks_completed, v_on_time_completed
    FROM tasks
    WHERE assignee_id = p_user_id;

    IF v_tasks_completed > 0 THEN
        v_on_time_rate := ROUND((v_on_time_completed::NUMERIC / v_tasks_completed) * 100);
    ELSE
        v_on_time_rate := 100;
    END IF;

    -- Standups Total
    SELECT COUNT(*) INTO v_standups_submitted
    FROM standups
    WHERE user_id = p_user_id;

    -- Standup Streak (ignoring weekends)
    FOR i IN 0..59 LOOP
        v_day_of_week := EXTRACT(DOW FROM v_check_date);
        
        IF v_day_of_week = 0 OR v_day_of_week = 6 THEN
            v_check_date := v_check_date - 1;
            CONTINUE;
        END IF;

        SELECT EXISTS(
            SELECT 1 FROM standups 
            WHERE user_id = p_user_id AND date = v_check_date
        ) INTO v_found;

        IF v_found THEN
            v_streak := v_streak + 1;
            v_check_date := v_check_date - 1;
        ELSE
            IF i = 0 THEN
                v_check_date := v_check_date - 1;
                CONTINUE;
            END IF;
            EXIT;
        END IF;
    END LOOP;

    -- Attendance
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('present', 'late'))
    INTO v_attendance_total, v_attendance_present
    FROM attendance
    WHERE user_id = p_user_id;

    IF v_attendance_total > 0 THEN
        v_attendance_rate := ROUND((v_attendance_present::NUMERIC / v_attendance_total) * 100);
    ELSE
        v_attendance_rate := 100;
    END IF;

    RETURN json_build_object(
        'user_id', p_user_id,
        'tasks_total', v_tasks_total,
        'tasks_completed', v_tasks_completed,
        'on_time_rate', v_on_time_rate,
        'standups_submitted', v_standups_submitted,
        'standups_expected', 0,
        'standup_streak', v_streak,
        'attendance_rate', v_attendance_rate
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

run(sql1, "Created get_user_performance_metrics")

sql2 = """
CREATE OR REPLACE FUNCTION get_team_performance_metrics(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_tasks INT;
    v_completed_tasks INT;
    v_completion_rate INT;
    v_active_members INT;
    v_total_interns INT;
    v_standups_today INT;
    v_standup_compliance INT;
BEGIN
    -- Tasks
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
    INTO v_total_tasks, v_completed_tasks
    FROM tasks
    WHERE team_id = p_team_id;

    IF v_total_tasks > 0 THEN
        v_completion_rate := ROUND((v_completed_tasks::NUMERIC / v_total_tasks) * 100);
    ELSE
        v_completion_rate := 0;
    END IF;

    -- Members
    SELECT COUNT(*) INTO v_active_members
    FROM profiles
    WHERE team_id = p_team_id AND status = 'active';

    SELECT COUNT(*) INTO v_total_interns
    FROM profiles
    WHERE team_id = p_team_id AND status = 'active' AND role = 'intern';

    -- Standups today
    SELECT COUNT(DISTINCT s.user_id) INTO v_standups_today
    FROM standups s
    JOIN profiles p ON s.user_id = p.id
    WHERE p.team_id = p_team_id 
      AND p.status = 'active' 
      AND p.role = 'intern'
      AND s.date = CURRENT_DATE;

    IF v_total_interns > 0 THEN
        v_standup_compliance := ROUND((v_standups_today::NUMERIC / v_total_interns) * 100);
    ELSE
        v_standup_compliance := 100;
    END IF;

    RETURN json_build_object(
        'team_id', p_team_id,
        'total_tasks', v_total_tasks,
        'completed_tasks', v_completed_tasks,
        'completion_rate', v_completion_rate,
        'active_members', v_active_members,
        'standup_compliance', v_standup_compliance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"""

run(sql2, "Created get_team_performance_metrics")

print("\nDone applying performance RPCs.")
