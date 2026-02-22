-- get_monthly_calendar_with_patterns RPC関数（後半: 統合と優先順位）
-- パターン展開 + 個別アサイン + 例外処理を統合し、優先順位に基づいてマージ

-- 既存の関数を削除（戻り値の型が変わるため）
DROP FUNCTION IF EXISTS get_monthly_calendar_with_patterns(INTEGER, INTEGER, UUID);

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
  is_available BOOLEAN,
  student_id UUID,
  student_name VARCHAR(100),
  student_grade INTEGER,
  subject VARCHAR(50),
  "position" INTEGER,
  pattern_id UUID,
  data_source VARCHAR(20),
  exception_type VARCHAR(20)
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
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のデータは閲覧できません'
        USING HINT = 'Teachers can only view their own data';
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

  -- 4. 優先順位付きで統合データを返す
  RETURN QUERY
  WITH
  -- パターンから展開された授業
  pattern_data AS (
    SELECT
      d.date::DATE AS date,
      ra.teacher_id,
      t.name AS teacher_name,
      EXTRACT(DOW FROM d.date)::INTEGER AS day_of_week,
      ra.time_slot_id,
      ts.id AS time_slot_label,
      FALSE AS is_available,
      ra.student_id,
      s.name AS student_name,
      s.grade AS student_grade,
      ra.subject,
      0 AS position,
      ra.id AS pattern_id,
      'pattern'::VARCHAR(20) AS data_source,
      NULL::VARCHAR(20) AS exception_type,
      3 AS priority  -- 優先度: 最低
    FROM
      recurring_assignments ra
      INNER JOIN teachers t ON ra.teacher_id = t.id
      INNER JOIN students s ON ra.student_id = s.id
      INNER JOIN time_slots ts ON ra.time_slot_id = ts.id
      CROSS JOIN LATERAL (
        SELECT generate_series(
          v_month_start,
          v_month_end,
          '1 day'::INTERVAL
        )::DATE AS date
      ) d
    WHERE
      ra.active = TRUE
      AND ra.start_date <= v_month_end
      AND (ra.end_date IS NULL OR ra.end_date >= v_month_start)
      AND d.date >= ra.start_date
      AND (ra.end_date IS NULL OR d.date <= ra.end_date)
      AND EXTRACT(DOW FROM d.date)::INTEGER = ra.day_of_week
      AND (p_teacher_id IS NULL OR ra.teacher_id = p_teacher_id)
  ),

  -- 個別アサイン（assignmentsテーブル）
  assignment_data AS (
    SELECT
      a.date,
      a.teacher_id,
      t.name AS teacher_name,
      EXTRACT(DOW FROM a.date)::INTEGER AS day_of_week,
      a.time_slot_id,
      ts.id AS time_slot_label,
      FALSE AS is_available,
      a.student_id,
      s.name AS student_name,
      s.grade AS student_grade,
      a.subject,
      a.position,
      NULL::UUID AS pattern_id,
      'assignment'::VARCHAR(20) AS data_source,
      NULL::VARCHAR(20) AS exception_type,
      2 AS priority  -- 優先度: 中
    FROM
      assignments a
      INNER JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN students s ON a.student_id = s.id
      INNER JOIN time_slots ts ON a.time_slot_id = ts.id
    WHERE
      a.date >= v_month_start
      AND a.date <= v_month_end
      AND (p_teacher_id IS NULL OR a.teacher_id = p_teacher_id)
      AND a.student_id IS NOT NULL  -- 生徒アサインがあるもののみ
  ),

  -- 例外処理（休みなど）
  exception_data AS (
    SELECT
      ae.date,
      ra.teacher_id,
      t.name AS teacher_name,
      EXTRACT(DOW FROM ae.date)::INTEGER AS day_of_week,
      ra.time_slot_id,
      ts.id AS time_slot_label,
      CASE
        WHEN ae.exception_type = 'cancelled' THEN TRUE
        ELSE FALSE
      END AS is_available,
      NULL::UUID AS student_id,
      NULL::VARCHAR(100) AS student_name,
      NULL::INTEGER AS student_grade,
      NULL::VARCHAR(50) AS subject,
      0 AS position,
      ra.id AS pattern_id,
      'exception'::VARCHAR(20) AS data_source,
      ae.exception_type,
      1 AS priority  -- 優先度: 最高
    FROM
      assignment_exceptions ae
      INNER JOIN recurring_assignments ra ON ae.pattern_id = ra.id
      INNER JOIN teachers t ON ra.teacher_id = t.id
      INNER JOIN time_slots ts ON ra.time_slot_id = ts.id
    WHERE
      ae.date >= v_month_start
      AND ae.date <= v_month_end
      AND (p_teacher_id IS NULL OR ra.teacher_id = p_teacher_id)
  ),

  -- 3つのデータソースを統合
  combined_data AS (
    SELECT * FROM pattern_data
    UNION ALL
    SELECT * FROM assignment_data
    UNION ALL
    SELECT * FROM exception_data
  ),

  -- 優先順位に基づいて重複排除（同じ日付・コマ・講師の組み合わせで最優先のもののみ残す）
  ranked_data AS (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY combined_data.date, combined_data.time_slot_id, combined_data.teacher_id
        ORDER BY priority ASC  -- 優先度が低い値（1=最高）が先
      ) AS row_num
    FROM combined_data
  )

  SELECT
    ranked_data.date,
    ranked_data.teacher_id,
    ranked_data.teacher_name,
    ranked_data.day_of_week,
    ranked_data.time_slot_id,
    ranked_data.time_slot_label,
    ranked_data.is_available,
    ranked_data.student_id,
    ranked_data.student_name,
    ranked_data.student_grade,
    ranked_data.subject,
    ranked_data."position",
    ranked_data.pattern_id,
    ranked_data.data_source,
    ranked_data.exception_type
  FROM ranked_data
  WHERE row_num = 1  -- 各日付・コマ・講師の組み合わせで優先度が最も高いレコードのみ
  ORDER BY
    ranked_data.date ASC,
    ranked_data.time_slot_id ASC,
    ranked_data.teacher_name ASC;

END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION get_monthly_calendar_with_patterns IS '定期授業パターンを月内の日付に展開し、個別アサインと例外処理を統合する。優先順位: 例外処理 > 個別アサイン > パターン。講師は自分のデータのみ、管理者・viewerは全データを取得可能。';
