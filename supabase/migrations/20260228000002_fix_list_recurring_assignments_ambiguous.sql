-- ============================================================================
-- Fix ambiguous "id" column in list_recurring_assignments
-- ============================================================================
-- 問題: RETURNS TABLE の "id" カラムと、JOINしたテーブルの "id" が衝突し
--       "column reference 'id' is ambiguous" エラーが発生。
-- 修正: 全てのカラム参照にテーブルエイリアスを付与。

CREATE OR REPLACE FUNCTION list_recurring_assignments(
  p_teacher_id UUID DEFAULT NULL,
  p_active_only BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  id UUID,
  teacher_id UUID,
  teacher_name VARCHAR(100),
  day_of_week INTEGER,
  day_of_week_name VARCHAR(10),
  time_slot_id VARCHAR(10),
  time_slot_label VARCHAR(50),
  student_id UUID,
  student_name VARCHAR(100),
  student_grade INTEGER,
  subject VARCHAR(50),
  start_date DATE,
  end_date DATE,
  active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role VARCHAR(20);
  v_actor_teacher_id UUID;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: ログインが必要です'
      USING HINT = 'User must be authenticated';
  END IF;

  SELECT u.role INTO v_actor_role
  FROM users u
  WHERE u.id = v_actor_id;

  IF v_actor_role = 'teacher' THEN
    SELECT t.id INTO v_actor_teacher_id
    FROM teachers t
    WHERE t.user_id = v_actor_id;

    IF v_actor_teacher_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: 講師情報が見つかりません'
        USING HINT = 'Teacher record not found for this user';
    END IF;

    IF p_teacher_id IS NOT NULL AND p_teacher_id != v_actor_teacher_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは閲覧できません'
        USING HINT = 'Teachers can only view their own patterns';
    END IF;

    p_teacher_id := v_actor_teacher_id;
  ELSIF v_actor_role NOT IN ('admin', 'viewer') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを閲覧する権限がありません'
      USING HINT = 'Only teachers, admins, and viewers can list patterns';
  END IF;

  RETURN QUERY
  SELECT
    ra.id,
    ra.teacher_id,
    t.name AS teacher_name,
    ra.day_of_week,
    CASE ra.day_of_week
      WHEN 0 THEN '日曜日'::VARCHAR(10)
      WHEN 1 THEN '月曜日'::VARCHAR(10)
      WHEN 2 THEN '火曜日'::VARCHAR(10)
      WHEN 3 THEN '水曜日'::VARCHAR(10)
      WHEN 4 THEN '木曜日'::VARCHAR(10)
      WHEN 5 THEN '金曜日'::VARCHAR(10)
      WHEN 6 THEN '土曜日'::VARCHAR(10)
    END AS day_of_week_name,
    ra.time_slot_id,
    ts.id::VARCHAR(50) AS time_slot_label,
    ra.student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    ra.subject,
    ra.start_date,
    ra.end_date,
    ra.active,
    ra.created_at,
    ra.updated_at,
    ra.created_by
  FROM recurring_assignments ra
  INNER JOIN teachers t ON ra.teacher_id = t.id
  INNER JOIN students s ON ra.student_id = s.id
  INNER JOIN time_slots ts ON ra.time_slot_id = ts.id
  WHERE
    (p_teacher_id IS NULL OR ra.teacher_id = p_teacher_id)
    AND (NOT p_active_only OR ra.active = TRUE)
  ORDER BY
    ra.day_of_week ASC,
    ra.time_slot_id ASC,
    t.name ASC,
    s.name ASC;

END;
$$;
