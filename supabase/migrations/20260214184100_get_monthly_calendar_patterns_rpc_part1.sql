-- get_monthly_calendar_with_patterns RPC関数（前半: パターン展開ロジック）
-- 定期授業パターンを月内の具体的な日付に展開する

CREATE OR REPLACE FUNCTION get_monthly_calendar_with_patterns(
  p_year INTEGER,
  p_month INTEGER,
  p_teacher_id UUID DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  teacher_id UUID,
  teacher_name VARCHAR(100),
  day_of_week INTEGER,
  time_slot_id VARCHAR(10),
  time_slot_label VARCHAR(50),
  student_id UUID,
  student_name VARCHAR(100),
  student_grade INTEGER,
  subject VARCHAR(50),
  pattern_id UUID,
  data_source VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
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
    RAISE EXCEPTION 'PERMISSION_DENIED: カレンダーを閲覧する権限がありません'
      USING HINT = 'Only teachers, admins, and viewers can view calendar';
  END IF;

  -- 3. 月の日付範囲を計算
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- 4. パターンを展開して返す
  RETURN QUERY
  SELECT
    d.date::DATE AS date,
    ra.teacher_id,
    t.name AS teacher_name,
    ra.day_of_week,
    ra.time_slot_id,
    ts.label AS time_slot_label,
    ra.student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    ra.subject,
    ra.id AS pattern_id,
    'pattern'::VARCHAR(20) AS data_source
  FROM
    -- 該当月に有効なパターンを取得
    recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    INNER JOIN students s ON ra.student_id = s.id
    INNER JOIN time_slots ts ON ra.time_slot_id = ts.id
    -- 月内の全日付を生成し、曜日でマッピング
    CROSS JOIN LATERAL (
      SELECT generate_series(
        v_month_start,
        v_month_end,
        '1 day'::INTERVAL
      )::DATE AS date
    ) d
  WHERE
    -- パターンが有効であること
    ra.active = TRUE
    -- パターンの開始日が月末以前であること
    AND ra.start_date <= v_month_end
    -- パターンの終了日が月初以降であること（NULLの場合は無期限）
    AND (ra.end_date IS NULL OR ra.end_date >= v_month_start)
    -- 日付がパターンの有効期間内であること
    AND d.date >= ra.start_date
    AND (ra.end_date IS NULL OR d.date <= ra.end_date)
    -- 曜日が一致すること（0=日曜日, 1=月曜日, ..., 6=土曜日）
    AND EXTRACT(DOW FROM d.date)::INTEGER = ra.day_of_week
    -- teacher_idフィルタ（指定された場合のみ）
    AND (p_teacher_id IS NULL OR ra.teacher_id = p_teacher_id)
  ORDER BY
    d.date ASC,
    ra.time_slot_id ASC,
    t.name ASC;

END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION get_monthly_calendar_with_patterns IS '定期授業パターンを月内の具体的な日付に展開する。講師は自分のパターンのみ、管理者・viewerは全パターンを取得可能。個別アサインや例外処理との統合は後半で実装。';
