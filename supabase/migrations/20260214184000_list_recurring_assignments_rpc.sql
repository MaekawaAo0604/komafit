-- list_recurring_assignments RPC関数
-- 定期授業パターンの一覧を取得する（講師・生徒・時間帯情報を含む）

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
  -- 1. 現在のユーザーIDとロールを取得
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: ログインが必要です'
      USING HINT = 'User must be authenticated';
  END IF;

  -- ユーザーのロールを取得
  SELECT role INTO v_actor_role
  FROM users
  WHERE id = v_actor_id;

  -- 2. 権限チェック
  -- 講師の場合: 自分のパターンのみ取得可能
  -- 管理者・viewerの場合: 全パターン取得可能
  IF v_actor_role = 'teacher' THEN
    -- 講師のteacher_idを取得
    SELECT t.id INTO v_actor_teacher_id
    FROM teachers t
    WHERE t.user_id = v_actor_id;

    IF v_actor_teacher_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: 講師情報が見つかりません'
        USING HINT = 'Teacher record not found for this user';
    END IF;

    -- p_teacher_idが指定されている場合、自分のIDと一致するか確認
    IF p_teacher_id IS NOT NULL AND p_teacher_id != v_actor_teacher_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは閲覧できません'
        USING HINT = 'Teachers can only view their own patterns';
    END IF;

    -- 講師の場合は自動的に自分のteacher_idでフィルタ
    p_teacher_id := v_actor_teacher_id;
  ELSIF v_actor_role NOT IN ('admin', 'viewer') THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを閲覧する権限がありません'
      USING HINT = 'Only teachers, admins, and viewers can list patterns';
  END IF;

  -- 3. パターン一覧を取得（JOINで関連情報も取得）
  RETURN QUERY
  SELECT
    ra.id,
    ra.teacher_id,
    t.name AS teacher_name,
    ra.day_of_week,
    CASE ra.day_of_week
      WHEN 0 THEN '日曜日'
      WHEN 1 THEN '月曜日'
      WHEN 2 THEN '火曜日'
      WHEN 3 THEN '水曜日'
      WHEN 4 THEN '木曜日'
      WHEN 5 THEN '金曜日'
      WHEN 6 THEN '土曜日'
    END AS day_of_week_name,
    ra.time_slot_id,
    ts.id AS time_slot_label,
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
    -- teacher_idフィルタ（指定された場合のみ）
    (p_teacher_id IS NULL OR ra.teacher_id = p_teacher_id)
    -- activeフィルタ
    AND (NOT p_active_only OR ra.active = TRUE)
  ORDER BY
    ra.day_of_week ASC,
    ra.time_slot_id ASC,
    t.name ASC,
    s.name ASC;

END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION list_recurring_assignments IS '定期授業パターンの一覧を取得する。講師は自分のパターンのみ、管理者・viewerは全パターンを取得可能。講師・生徒・時間帯情報を含む。';
