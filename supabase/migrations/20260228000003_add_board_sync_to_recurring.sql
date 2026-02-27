-- ============================================================================
-- Add board sync to create_recurring_assignment (v4 - assignments table sync)
-- ============================================================================
-- v1-v3: slot_students への同期 → ボードUIはassignmentsしか見ていないため表示されない
-- v4: assignments テーブルへの同期に変更。ボードUIに正しく反映される。

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
  -- ボード同期用変数
  v_day VARCHAR(3);
  v_slot_id VARCHAR(10);
  v_board_position INTEGER;
  -- assignments同期用変数
  v_target_date DATE;
  v_assignment_position INTEGER;
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

  -- ========================================
  -- 同期1: slot_teacher へ講師を配置
  -- ========================================
  v_day := dow_to_day(p_day_of_week);
  v_slot_id := v_day || '-' || p_time_slot_id;

  IF EXISTS (SELECT 1 FROM slots WHERE id = v_slot_id) THEN
    SELECT st."position" INTO v_board_position
    FROM slot_teacher st
    WHERE st.slot_id = v_slot_id AND st.teacher_id = p_teacher_id
    LIMIT 1;

    IF v_board_position IS NULL THEN
      SELECT st."position" INTO v_board_position
      FROM slot_teacher st
      WHERE st.slot_id = v_slot_id AND st.teacher_id IS NULL
      ORDER BY st."position" ASC
      LIMIT 1;

      IF v_board_position IS NOT NULL THEN
        UPDATE slot_teacher
        SET teacher_id = p_teacher_id
        WHERE slot_id = v_slot_id AND "position" = v_board_position;
      END IF;
    END IF;
  END IF;

  -- ========================================
  -- 同期2: assignments テーブルへ生徒を追加
  -- （ボードUIはこのテーブルから生徒を表示する）
  -- ========================================

  -- 今日から見て次の該当曜日の日付を算出
  -- EXTRACT(DOW FROM date): 0=Sun, 1=Mon, ..., 6=Sat
  v_target_date := CURRENT_DATE + ((p_day_of_week - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 7) % 7);

  -- start_dateより前なら start_date 以降の最初の該当曜日にする
  IF v_target_date < p_start_date THEN
    v_target_date := p_start_date + ((p_day_of_week - EXTRACT(DOW FROM p_start_date)::INTEGER + 7) % 7);
  END IF;

  -- end_dateを超えていなければ assignments に追加
  IF p_end_date IS NULL OR v_target_date <= p_end_date THEN
    -- 同じ日・コマ・講師・生徒の重複を避ける
    IF NOT EXISTS (
      SELECT 1 FROM assignments
      WHERE date = v_target_date
        AND time_slot_id = p_time_slot_id
        AND teacher_id = p_teacher_id
        AND student_id = p_student_id
    ) THEN
      -- position（座席番号）を自動計算
      SELECT COALESCE(MAX("position"), 0) + 1 INTO v_assignment_position
      FROM assignments
      WHERE date = v_target_date
        AND time_slot_id = p_time_slot_id
        AND teacher_id = p_teacher_id;

      -- 最大2席まで
      IF v_assignment_position <= 2 THEN
        INSERT INTO assignments (date, time_slot_id, teacher_id, student_id, subject, "position", assigned_by)
        VALUES (v_target_date, p_time_slot_id, p_teacher_id, p_student_id, p_subject, v_assignment_position, v_actor_id);

        -- teacher_availability_v2 が未作成なら自動作成
        IF NOT EXISTS (
          SELECT 1 FROM teacher_availability_v2
          WHERE teacher_id = p_teacher_id
            AND date = v_target_date
            AND time_slot_id = p_time_slot_id
        ) THEN
          INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
          VALUES (p_teacher_id, v_target_date, p_time_slot_id, TRUE);
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN v_new_pattern;
END;
$$;
