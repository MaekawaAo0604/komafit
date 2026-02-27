-- ============================================================================
-- Fix audit_logs column mismatch in recurring assignment RPC functions
-- ============================================================================
-- 問題: create/update/delete_recurring_assignment の監査ログINSERTが
--       audit_logs に存在しないカラム (user_id, table_name, record_id) を使用。
-- 修正: 実際のカラム (actor_id, action, payload) に合わせる。

-- 1. create_recurring_assignment を修正
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
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: ログインが必要です'
      USING HINT = 'User must be authenticated';
  END IF;

  SELECT role INTO v_actor_role
  FROM users
  WHERE id = v_actor_id;

  IF v_actor_role = 'teacher' THEN
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

  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = p_teacher_id AND active = TRUE) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された講師が存在しないか無効です'
      USING HINT = 'Teacher does not exist or is inactive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id AND active = TRUE) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された生徒が存在しないか無効です'
      USING HINT = 'Student does not exist or is inactive';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM time_slots WHERE id = p_time_slot_id) THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 指定された時間帯が無効です'
      USING HINT = 'Time slot does not exist';
  END IF;

  IF p_end_date IS NOT NULL AND p_end_date < p_start_date THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: 終了日は開始日以降の日付を指定してください'
      USING HINT = 'End date must be on or after start date';
  END IF;

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

  INSERT INTO recurring_assignments (
    teacher_id, day_of_week, time_slot_id, student_id,
    subject, start_date, end_date, active, created_by
  )
  VALUES (
    p_teacher_id, p_day_of_week, p_time_slot_id, p_student_id,
    p_subject, p_start_date, p_end_date, p_active, v_actor_id
  )
  RETURNING * INTO v_new_pattern;

  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    v_actor_id,
    'RECURRING_PATTERN_CREATE',
    jsonb_build_object(
      'table_name', 'recurring_assignments',
      'record_id', v_new_pattern.id,
      'teacher_id', p_teacher_id,
      'day_of_week', p_day_of_week,
      'time_slot_id', p_time_slot_id,
      'student_id', p_student_id,
      'subject', p_subject,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'active', p_active
    )
  );

  RETURN v_new_pattern;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 2. update_recurring_assignment を修正
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
  v_teacher_user_id UUID;
  v_existing_pattern recurring_assignments;
  v_updated_pattern recurring_assignments;
  v_changes JSONB := '{}'::JSONB;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: ログインが必要です'
      USING HINT = 'User must be authenticated';
  END IF;

  SELECT * INTO v_existing_pattern
  FROM recurring_assignments
  WHERE id = p_pattern_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: 指定されたパターンが見つかりません'
      USING HINT = 'Pattern does not exist';
  END IF;

  SELECT role INTO v_actor_role
  FROM users
  WHERE id = v_actor_id;

  IF v_actor_role = 'teacher' THEN
    SELECT user_id INTO v_teacher_user_id
    FROM teachers
    WHERE id = v_existing_pattern.teacher_id;

    IF v_teacher_user_id != v_actor_id THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: 他の講師のパターンは編集できません'
        USING HINT = 'Teachers can only update their own patterns';
    END IF;
  ELSIF v_actor_role != 'admin' THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: パターンを編集する権限がありません'
      USING HINT = 'Only teachers and admins can update patterns';
  END IF;

  IF p_student_id IS NOT NULL AND p_student_id != v_existing_pattern.student_id THEN
    v_changes := v_changes || jsonb_build_object('student_id', jsonb_build_object('old', v_existing_pattern.student_id, 'new', p_student_id));
  END IF;
  IF p_subject IS NOT NULL AND p_subject != v_existing_pattern.subject THEN
    v_changes := v_changes || jsonb_build_object('subject', jsonb_build_object('old', v_existing_pattern.subject, 'new', p_subject));
  END IF;
  IF p_active IS NOT NULL AND p_active != v_existing_pattern.active THEN
    v_changes := v_changes || jsonb_build_object('active', jsonb_build_object('old', v_existing_pattern.active, 'new', p_active));
  END IF;

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

  IF jsonb_typeof(v_changes) != 'null' AND v_changes != '{}'::jsonb THEN
    INSERT INTO audit_logs (actor_id, action, payload)
    VALUES (
      v_actor_id,
      'RECURRING_PATTERN_UPDATE',
      jsonb_build_object(
        'table_name', 'recurring_assignments',
        'record_id', p_pattern_id,
        'changes', v_changes
      )
    );
  END IF;

  RETURN v_updated_pattern;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 3. delete_recurring_assignment を修正
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
  v_teacher_user_id UUID;
  v_existing_pattern recurring_assignments;
  v_deleted_count INTEGER;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: ログインが必要です'
      USING HINT = 'User must be authenticated';
  END IF;

  SELECT * INTO v_existing_pattern
  FROM recurring_assignments
  WHERE id = p_pattern_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RESOURCE_NOT_FOUND: 指定されたパターンが見つかりません'
      USING HINT = 'Pattern does not exist';
  END IF;

  SELECT role INTO v_actor_role
  FROM users
  WHERE id = v_actor_id;

  IF v_actor_role = 'teacher' THEN
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

  DELETE FROM assignment_exceptions
  WHERE pattern_id = p_pattern_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  DELETE FROM recurring_assignments
  WHERE id = p_pattern_id;

  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    v_actor_id,
    'RECURRING_PATTERN_DELETE',
    jsonb_build_object(
      'table_name', 'recurring_assignments',
      'record_id', p_pattern_id,
      'teacher_id', v_existing_pattern.teacher_id,
      'day_of_week', v_existing_pattern.day_of_week,
      'time_slot_id', v_existing_pattern.time_slot_id,
      'student_id', v_existing_pattern.student_id,
      'subject', v_existing_pattern.subject,
      'deleted_exceptions', v_deleted_count
    )
  );

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;
