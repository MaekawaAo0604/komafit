-- create_recurring_assignment RPC関数
-- 定期授業パターンを作成する

CREATE OR REPLACE FUNCTION create_recurring_assignment(
  p_teacher_id UUID,
  p_day_of_week INTEGER,
  p_time_slot_id VARCHAR(10),
  p_student_id UUID,
  p_subject VARCHAR(50),
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL,
  p_active BOOLEAN DEFAULT TRUE
)
RETURNS recurring_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role VARCHAR(20);
  v_teacher_user_id UUID;
  v_existing_pattern recurring_assignments;
  v_new_pattern recurring_assignments;
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
  -- 講師の場合: 自分のteacher_idのみ許可
  -- 管理者の場合: 全てのteacher_idを許可
  IF v_actor_role = 'teacher' THEN
    -- 講師のuser_idを取得
    SELECT user_id INTO v_teacher_user_id
    FROM teachers
    WHERE id = p_teacher_id;

    IF v_teacher_user_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: 指定された講師が存在しません'
        USING HINT = 'Teacher does not exist';
    END IF;

    IF v_teacher_user_id != v_actor_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは登録できません'
        USING HINT = 'Teachers can only create patterns for themselves';
    END IF;
  ELSIF v_actor_role != 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを登録する権限がありません'
      USING HINT = 'Only teachers and admins can create patterns';
  END IF;

  -- 3. 制約チェック
  -- 講師の存在確認
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = p_teacher_id AND active = TRUE) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された講師が存在しないか無効です'
      USING HINT = 'Teacher does not exist or is inactive';
  END IF;

  -- 生徒の存在確認
  IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id AND active = TRUE) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された生徒が存在しないか無効です'
      USING HINT = 'Student does not exist or is inactive';
  END IF;

  -- 時間帯の存在確認
  IF NOT EXISTS (SELECT 1 FROM time_slots WHERE id = p_time_slot_id) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された時間帯が無効です'
      USING HINT = 'Time slot does not exist';
  END IF;

  -- 曜日の範囲チェック（0-6）は既にCHECK制約で実装済み

  -- 終了日の妥当性チェック
  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 終了日は開始日以降の日付を指定してください'
      USING HINT = 'End date must be on or after start date';
  END IF;

  -- 4. 重複チェック
  -- 同じ曜日・コマ・講師・生徒・開始日の組み合わせが既に存在するか確認
  SELECT * INTO v_existing_pattern
  FROM recurring_assignments
  WHERE teacher_id = p_teacher_id
    AND day_of_week = p_day_of_week
    AND time_slot_id = p_time_slot_id
    AND student_id = p_student_id
    AND start_date = p_start_date
    AND active = TRUE;

  IF FOUND THEN
    RAISE EXCEPTION 'DUPLICATE_PATTERN: この組み合わせは既に登録されています'
      USING HINT = 'A pattern with the same combination already exists';
  END IF;

  -- 5. INSERT処理
  INSERT INTO recurring_assignments (
    teacher_id,
    day_of_week,
    time_slot_id,
    student_id,
    subject,
    start_date,
    end_date,
    active,
    created_by
  )
  VALUES (
    p_teacher_id,
    p_day_of_week,
    p_time_slot_id,
    p_student_id,
    p_subject,
    p_start_date,
    p_end_date,
    p_active,
    v_actor_id
  )
  RETURNING * INTO v_new_pattern;

  -- 6. 監査ログ記録
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
    'RECURRING_PATTERN_CREATE',
    'recurring_assignments',
    v_new_pattern.id,
    jsonb_build_object(
      'teacher_id', p_teacher_id,
      'day_of_week', p_day_of_week,
      'time_slot_id', p_time_slot_id,
      'student_id', p_student_id,
      'subject', p_subject,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'active', p_active
    ),
    CURRENT_TIMESTAMP
  );

  -- 7. 結果を返す
  RETURN v_new_pattern;

EXCEPTION
  WHEN OTHERS THEN
    -- エラーログ記録（オプション）
    -- その他のエラーは再スロー
    RAISE;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION create_recurring_assignment IS '定期授業パターンを作成する。講師は自分のパターンのみ作成可能、管理者は全講師のパターンを作成可能。';
