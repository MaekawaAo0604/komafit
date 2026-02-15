-- update_recurring_assignment RPC関数
-- 定期授業パターンを更新する（生徒、科目、終了日、状態のみ変更可能）

CREATE OR REPLACE FUNCTION update_recurring_assignment(
  p_pattern_id UUID,
  p_student_id UUID DEFAULT NULL,
  p_subject VARCHAR(50) DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_active BOOLEAN DEFAULT NULL
)
RETURNS recurring_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role VARCHAR(20);
  v_existing_pattern recurring_assignments;
  v_teacher_user_id UUID;
  v_updated_pattern recurring_assignments;
  v_changes JSONB;
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

  -- 2. 既存パターンの取得
  SELECT * INTO v_existing_pattern
  FROM recurring_assignments
  WHERE id = p_pattern_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: 指定されたパターンが見つかりません'
      USING HINT = 'Pattern does not exist';
  END IF;

  -- 3. 権限チェック
  -- 講師の場合: 自分のパターンのみ更新可能
  -- 管理者の場合: 全てのパターンを更新可能
  IF v_actor_role = 'teacher' THEN
    -- パターンの所有者（講師のuser_id）を取得
    SELECT user_id INTO v_teacher_user_id
    FROM teachers
    WHERE id = v_existing_pattern.teacher_id;

    IF v_teacher_user_id != v_actor_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは更新できません'
        USING HINT = 'Teachers can only update their own patterns';
    END IF;
  ELSIF v_actor_role != 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを更新する権限がありません'
      USING HINT = 'Only teachers and admins can update patterns';
  END IF;

  -- 4. バリデーション
  -- 生徒IDが指定された場合、存在確認
  IF p_student_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id AND active = TRUE) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: 指定された生徒が存在しないか無効です'
        USING HINT = 'Student does not exist or is inactive';
    END IF;
  END IF;

  -- 終了日が指定された場合、開始日以降であることを確認
  IF p_end_date IS NOT NULL AND p_end_date < v_existing_pattern.start_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 終了日は開始日以降の日付を指定してください'
      USING HINT = 'End date must be on or after start date';
  END IF;

  -- 5. 変更内容の記録（監査ログ用）
  v_changes := jsonb_build_object();

  IF p_student_id IS NOT NULL AND p_student_id != v_existing_pattern.student_id THEN
    v_changes := v_changes || jsonb_build_object(
      'student_id', jsonb_build_object(
        'old', v_existing_pattern.student_id,
        'new', p_student_id
      )
    );
  END IF;

  IF p_subject IS NOT NULL AND p_subject != v_existing_pattern.subject THEN
    v_changes := v_changes || jsonb_build_object(
      'subject', jsonb_build_object(
        'old', v_existing_pattern.subject,
        'new', p_subject
      )
    );
  END IF;

  IF p_end_date IS NOT NULL AND (v_existing_pattern.end_date IS NULL OR p_end_date != v_existing_pattern.end_date) THEN
    v_changes := v_changes || jsonb_build_object(
      'end_date', jsonb_build_object(
        'old', v_existing_pattern.end_date,
        'new', p_end_date
      )
    );
  END IF;

  IF p_active IS NOT NULL AND p_active != v_existing_pattern.active THEN
    v_changes := v_changes || jsonb_build_object(
      'active', jsonb_build_object(
        'old', v_existing_pattern.active,
        'new', p_active
      )
    );
  END IF;

  -- 6. UPDATE処理（変更があるフィールドのみ更新）
  UPDATE recurring_assignments
  SET
    student_id = COALESCE(p_student_id, student_id),
    subject = COALESCE(p_subject, subject),
    end_date = CASE
      WHEN p_end_date IS NOT NULL THEN p_end_date
      ELSE end_date
    END,
    active = COALESCE(p_active, active),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_pattern_id
  RETURNING * INTO v_updated_pattern;

  -- 7. 監査ログ記録
  IF jsonb_typeof(v_changes) != 'null' AND v_changes != '{}'::jsonb THEN
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
      'RECURRING_PATTERN_UPDATE',
      'recurring_assignments',
      p_pattern_id,
      jsonb_build_object(
        'pattern_id', p_pattern_id,
        'changes', v_changes
      ),
      CURRENT_TIMESTAMP
    );
  END IF;

  -- 8. 結果を返す
  RETURN v_updated_pattern;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION update_recurring_assignment IS '定期授業パターンを更新する。講師は自分のパターンのみ更新可能、管理者は全パターンを更新可能。曜日・コマ・講師は変更不可（変更する場合は削除して再登録）。';
