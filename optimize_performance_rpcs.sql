-- ============================================================
-- Turn2Law Intern Tracker — Optimized Performance RPCs
-- Paste this in the Supabase SQL Editor to apply database optimizations:
-- https://supabase.com/dashboard/project/xzxwizxrroyhqbqtczfm/sql/new
-- ============================================================

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
    v_dates DATE[];
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

    -- Fetch standup dates for the last 90 days to calculate streak in memory
    SELECT COALESCE(ARRAY_AGG(date), '{}') INTO v_dates
    FROM standups
    WHERE user_id = p_user_id AND date >= CURRENT_DATE - 90;

    -- Standup Streak (ignoring weekends)
    FOR i IN 0..59 LOOP
        v_day_of_week := EXTRACT(DOW FROM v_check_date);
        
        IF v_day_of_week = 0 OR v_day_of_week = 6 THEN
            v_check_date := v_check_date - 1;
            CONTINUE;
        END IF;

        v_found := v_check_date = ANY(v_dates);

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
