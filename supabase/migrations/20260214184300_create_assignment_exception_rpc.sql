-- create_assignment_exception RPC関数
-- 定期パターンの特定日付に例外処理（休み、変更）を登録する

CREATE OR REPLACE FUNCTION create_assignment_exception(
  p_pattern_id UUID,
  p_date DATE,
  p_exception_type VARCHAR(20)
)
RETURNS assignment_exceptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role VARCHAR(20);
  v_existing_pattern recurring_assignments;
  v_teacher_user_id UUID;
  v_new_exception assignment_exceptions;
  v_day_of_week INTEGER;
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

  -- 2. パターンの存在確認
  SELECT * INTO v_existing_pattern
  FROM recurring_assignments
  WHERE id = p_pattern_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: 指定されたパターンが見つかりません'
      USING HINT = 'Pattern does not exist';
  END IF;

  -- 3. 権限チェック
  -- 講師の場合: 自分のパターンのみ例外処理可能
  -- 管理者の場合: 全てのパターンに例外処理可能
  IF v_actor_role = 'teacher' THEN
    -- パターンの所有者（講師のuser_id）を取得
    SELECT user_id INTO v_teacher_user_id
    FROM teachers
    WHERE id = v_existing_pattern.teacher_id;

    IF v_teacher_user_id != v_actor_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンには例外処理を登録できません'
        USING HINT = 'Teachers can only create exceptions for their own patterns';
    END IF;
  ELSIF v_actor_role != 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: 例外処理を登録する権限がありません'
      USING HINT = 'Only teachers and admins can create exceptions';
  END IF;

  -- 4. バリデーション
  -- 例外タイプのチェック（CHECK制約もあるが明示的にチェック）
  IF p_exception_type NOT IN ('cancelled', 'modified') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 例外タイプは cancelled または modified のみ指定可能です'
      USING HINT = 'Exception type must be cancelled or modified';
  END IF;

  -- 日付がパターンの開始日以降であることを確認
  IF p_date < v_existing_pattern.start_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 例外処理の日付はパターンの開始日以降である必要があります'
      USING HINT = 'Exception date must be on or after pattern start date';
  END IF;

  -- 日付がパターンの終了日以前であることを確認（終了日がNULLの場合は無期限）
  IF v_existing_pattern.end_date IS NOT NULL AND p_date > v_existing_pattern.end_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 例外処理の日付はパターンの終了日以前である必要があります'
      USING HINT = 'Exception date must be on or before pattern end date';
  END IF;

  -- 指定日付の曜日がパターンの曜日と一致するか確認
  v_day_of_week := EXTRACT(DOW FROM p_date)::INTEGER;
  IF v_day_of_week != v_existing_pattern.day_of_week THEN
    RAISE EXCEPTION '%',
      format('VALIDATION_ERROR: 例外処理の日付の曜日がパターンの曜日と一致しません（パターン: %s、指定日: %s）',
             v_existing_pattern.day_of_week, v_day_of_week)
      USING HINT = 'Exception date day of week must match pattern day of week';
  END IF;

  -- 5. 重複チェック
  -- 同じpattern_id, dateの例外が既に存在するか確認
  IF EXISTS (
    SELECT 1
    FROM assignment_exceptions
    WHERE pattern_id = p_pattern_id
      AND date = p_date
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_EXCEPTION: この日付の例外処理は既に登録されています'
      USING HINT = 'An exception for this date already exists';
  END IF;

  -- 6. INSERT処理
  INSERT INTO assignment_exceptions (
    pattern_id,
    date,
    exception_type,
    created_by
  )
  VALUES (
    p_pattern_id,
    p_date,
    p_exception_type,
    v_actor_id
  )
  RETURNING * INTO v_new_exception;

  -- 7. 監査ログ記録
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    payload,
    created_at
  )
  VALUES (
    v_actor_id,
    'ASSIGNMENT_EXCEPTION_CREATE',
    'assignment_exceptions',
    v_new_exception.id,
    jsonb_build_object(
      'pattern_id', p_pattern_id,
      'date', p_date,
      'exception_type', p_exception_type,
      'pattern_teacher_id', v_existing_pattern.teacher_id,
      'pattern_student_id', v_existing_pattern.student_id,
      'pattern_day_of_week', v_existing_pattern.day_of_week,
      'pattern_time_slot_id', v_existing_pattern.time_slot_id
    ),
    CURRENT_TIMESTAMP
  );

  -- 8. 結果を返す
  RETURN v_new_exception;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION create_assignment_exception IS '定期パターンの特定日付に例外処理（休み、変更）を登録する。講師は自分のパターンのみ、管理者は全パターンに対して例外処理を登録可能。日付はパターンの有効期間内かつ曜日が一致している必要がある。';
