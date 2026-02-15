-- delete_recurring_assignment RPC関数
-- 定期授業パターンを削除する（例外レコードも削除、個別アサインは保持）

CREATE OR REPLACE FUNCTION delete_recurring_assignment(
  p_pattern_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role VARCHAR(20);
  v_existing_pattern recurring_assignments;
  v_teacher_user_id UUID;
  v_deleted_count INTEGER;
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
  -- 講師の場合: 自分のパターンのみ削除可能
  -- 管理者の場合: 全てのパターンを削除可能
  IF v_actor_role = 'teacher' THEN
    -- パターンの所有者（講師のuser_id）を取得
    SELECT user_id INTO v_teacher_user_id
    FROM teachers
    WHERE id = v_existing_pattern.teacher_id;

    IF v_teacher_user_id != v_actor_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは削除できません'
        USING HINT = 'Teachers can only delete their own patterns';
    END IF;
  ELSIF v_actor_role != 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを削除する権限がありません'
      USING HINT = 'Only teachers and admins can delete patterns';
  END IF;

  -- 4. トランザクション開始（BEGIN...ENDで自動的にトランザクション）

  -- 5. 例外レコードの削除
  -- ON DELETE CASCADEが設定されているため、パターン削除時に自動的に削除される
  -- しかし、明示的に削除して件数を記録
  DELETE FROM assignment_exceptions
  WHERE pattern_id = p_pattern_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 6. パターンの削除
  -- 注: 個別アサイン（assignmentsテーブル）は削除しない
  DELETE FROM recurring_assignments
  WHERE id = p_pattern_id;

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
    'RECURRING_PATTERN_DELETE',
    'recurring_assignments',
    p_pattern_id,
    jsonb_build_object(
      'pattern_id', p_pattern_id,
      'teacher_id', v_existing_pattern.teacher_id,
      'day_of_week', v_existing_pattern.day_of_week,
      'time_slot_id', v_existing_pattern.time_slot_id,
      'student_id', v_existing_pattern.student_id,
      'subject', v_existing_pattern.subject,
      'deleted_exceptions_count', v_deleted_count
    ),
    CURRENT_TIMESTAMP
  );

  -- 8. 成功を返す
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    -- エラーが発生した場合、トランザクションはロールバックされる
    RAISE;
END;
$$;

-- 関数のコメント
COMMENT ON FUNCTION delete_recurring_assignment IS '定期授業パターンを削除する。例外レコード（assignment_exceptions）も削除されるが、個別アサイン（assignments）は保持される。講師は自分のパターンのみ削除可能、管理者は全パターンを削除可能。';
