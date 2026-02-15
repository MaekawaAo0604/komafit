-- ============================================================================
-- Date-Based Scheduling RPC Functions
-- ============================================================================
-- 日付ベースのスケジューリングシステム用のRPC関数を定義します。
--
-- 作成される関数:
-- 1. set_teacher_availability_v2: 講師の空き枠を設定
-- 2. assign_student_v2: 生徒をアサイン
-- 3. unassign_student_v2: 生徒のアサインを解除
-- 4. get_monthly_calendar: 月次カレンダーのデータを取得
-- ============================================================================

-- ============================================================================
-- 1. Set Teacher Availability V2
-- ============================================================================
-- 講師が自分の空き枠を設定する（または管理者が代理で設定する）

DROP FUNCTION IF EXISTS set_teacher_availability_v2(UUID, DATE, VARCHAR, BOOLEAN);

CREATE OR REPLACE FUNCTION set_teacher_availability_v2(
  p_teacher_id UUID,
  p_date DATE,
  p_time_slot_id VARCHAR(10),
  p_is_available BOOLEAN
) RETURNS teacher_availability_v2 AS $$
DECLARE
  v_result teacher_availability_v2;
  v_actor_id UUID;
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Insert or update availability
  INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
  VALUES (p_teacher_id, p_date, p_time_slot_id, p_is_available)
  ON CONFLICT (teacher_id, date, time_slot_id)
  DO UPDATE SET
    is_available = p_is_available,
    updated_at = NOW()
  RETURNING * INTO v_result;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'AVAILABILITY_UPDATE_V2', jsonb_build_object(
    'teacher_id', p_teacher_id,
    'date', p_date,
    'time_slot_id', p_time_slot_id,
    'is_available', p_is_available
  ));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_teacher_availability_v2(UUID, DATE, VARCHAR, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION set_teacher_availability_v2(UUID, DATE, VARCHAR, BOOLEAN) IS
'講師の空き枠を設定（日付ベース）。講師自身または管理者が実行可能。';

-- ============================================================================
-- 2. Assign Student V2
-- ============================================================================
-- 生徒を日付×時間帯×講師にアサインする

DROP FUNCTION IF EXISTS assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR, INTEGER);

CREATE OR REPLACE FUNCTION assign_student_v2(
  p_date DATE,
  p_time_slot_id VARCHAR(10),
  p_teacher_id UUID,
  p_student_id UUID,
  p_subject VARCHAR(50),
  p_position INTEGER DEFAULT 1
) RETURNS assignments AS $$
DECLARE
  v_result assignments;
  v_actor_id UUID;
  v_teacher_allows_pair BOOLEAN;
  v_student_requires_one_on_one BOOLEAN;
  v_existing_count INTEGER;
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Check if teacher allows pair teaching
  SELECT allow_pair INTO v_teacher_allows_pair
  FROM teachers
  WHERE id = p_teacher_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  -- Check if student requires one-on-one
  SELECT requires_one_on_one INTO v_student_requires_one_on_one
  FROM students
  WHERE id = p_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Check if teacher is available
  IF NOT EXISTS (
    SELECT 1 FROM teacher_availability_v2
    WHERE teacher_id = p_teacher_id
      AND date = p_date
      AND time_slot_id = p_time_slot_id
      AND is_available = TRUE
  ) THEN
    RAISE EXCEPTION 'Teacher is not available at this time';
  END IF;

  -- Count existing assignments in this slot
  SELECT COUNT(*) INTO v_existing_count
  FROM assignments
  WHERE date = p_date
    AND time_slot_id = p_time_slot_id
    AND teacher_id = p_teacher_id;

  -- Validate 1-on-1 constraints
  IF v_student_requires_one_on_one AND v_existing_count > 0 THEN
    RAISE EXCEPTION 'This student requires one-on-one teaching, but the slot already has an assignment';
  END IF;

  IF v_existing_count > 0 THEN
    -- Check if any existing student requires one-on-one
    IF EXISTS (
      SELECT 1 FROM assignments a
      JOIN students s ON a.student_id = s.id
      WHERE a.date = p_date
        AND a.time_slot_id = p_time_slot_id
        AND a.teacher_id = p_teacher_id
        AND s.requires_one_on_one = TRUE
    ) THEN
      RAISE EXCEPTION 'Cannot assign to this slot: existing student requires one-on-one teaching';
    END IF;
  END IF;

  -- Validate pair teaching constraints
  IF NOT v_teacher_allows_pair AND v_existing_count >= 1 THEN
    RAISE EXCEPTION 'Teacher does not allow pair teaching';
  END IF;

  IF v_existing_count >= 2 THEN
    RAISE EXCEPTION 'Cannot assign more than 2 students to the same slot';
  END IF;

  -- Insert assignment
  INSERT INTO assignments (date, time_slot_id, teacher_id, student_id, subject, position, assigned_by)
  VALUES (p_date, p_time_slot_id, p_teacher_id, p_student_id, p_subject, p_position, v_actor_id)
  RETURNING * INTO v_result;

  -- Mark teacher as unavailable (they're now busy)
  UPDATE teacher_availability_v2
  SET is_available = FALSE, updated_at = NOW()
  WHERE teacher_id = p_teacher_id
    AND date = p_date
    AND time_slot_id = p_time_slot_id;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'ASSIGN_V2', jsonb_build_object(
    'date', p_date,
    'time_slot_id', p_time_slot_id,
    'teacher_id', p_teacher_id,
    'student_id', p_student_id,
    'subject', p_subject,
    'position', p_position
  ));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR, INTEGER) TO authenticated;

COMMENT ON FUNCTION assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR, INTEGER) IS
'生徒を日付×時間帯×講師にアサイン。1対1必須や講師の1対2可否などの制約をチェック。';

-- ============================================================================
-- 3. Unassign Student V2
-- ============================================================================
-- 生徒のアサインを解除する

DROP FUNCTION IF EXISTS unassign_student_v2(UUID);

CREATE OR REPLACE FUNCTION unassign_student_v2(
  p_assignment_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_actor_id UUID;
  v_assignment assignments;
  v_remaining_count INTEGER;
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Get assignment info before deletion
  SELECT * INTO v_assignment
  FROM assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Delete assignment
  DELETE FROM assignments WHERE id = p_assignment_id;

  -- Count remaining assignments in this slot
  SELECT COUNT(*) INTO v_remaining_count
  FROM assignments
  WHERE date = v_assignment.date
    AND time_slot_id = v_assignment.time_slot_id
    AND teacher_id = v_assignment.teacher_id;

  -- If no assignments remain, mark teacher as available again
  IF v_remaining_count = 0 THEN
    UPDATE teacher_availability_v2
    SET is_available = TRUE, updated_at = NOW()
    WHERE teacher_id = v_assignment.teacher_id
      AND date = v_assignment.date
      AND time_slot_id = v_assignment.time_slot_id;
  END IF;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'UNASSIGN_V2', jsonb_build_object(
    'assignment_id', p_assignment_id,
    'date', v_assignment.date,
    'time_slot_id', v_assignment.time_slot_id,
    'teacher_id', v_assignment.teacher_id,
    'student_id', v_assignment.student_id
  ));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unassign_student_v2(UUID) TO authenticated;

COMMENT ON FUNCTION unassign_student_v2(UUID) IS
'生徒のアサインを解除。アサインがなくなった場合、講師を再び利用可能にマーク。';

-- ============================================================================
-- 4. Get Monthly Calendar Data
-- ============================================================================
-- 月次カレンダー表示用のデータを取得する

DROP FUNCTION IF EXISTS get_monthly_calendar(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_monthly_calendar(
  p_year INTEGER,
  p_month INTEGER
) RETURNS TABLE (
  date DATE,
  time_slot_id VARCHAR(10),
  time_slot_order INTEGER,
  teacher_id UUID,
  teacher_name VARCHAR(100),
  is_available BOOLEAN,
  student_id UUID,
  student_name VARCHAR(100),
  student_grade INTEGER,
  student_requires_one_on_one BOOLEAN,
  student_lesson_label VARCHAR(10),
  subject VARCHAR(50),
  "position" INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(ta.date, a.date) AS date,
    COALESCE(ta.time_slot_id, a.time_slot_id) AS time_slot_id,
    ts.display_order AS time_slot_order,
    COALESCE(ta.teacher_id, a.teacher_id) AS teacher_id,
    t.name AS teacher_name,
    ta.is_available,
    a.student_id,
    s.name AS student_name,
    s.grade AS student_grade,
    s.requires_one_on_one AS student_requires_one_on_one,
    s.lesson_label AS student_lesson_label,
    a.subject,
    a."position"
  FROM time_slots ts
  CROSS JOIN generate_series(
    make_date(p_year, p_month, 1),
    make_date(p_year, p_month, 1) + INTERVAL '1 month' - INTERVAL '1 day',
    '1 day'::INTERVAL
  ) AS calendar_date
  LEFT JOIN teacher_availability_v2 ta ON ta.time_slot_id = ts.id AND ta.date = calendar_date
  LEFT JOIN teachers t ON ta.teacher_id = t.id
  LEFT JOIN assignments a ON a.time_slot_id = ts.id AND a.date = calendar_date AND a.teacher_id = ta.teacher_id
  LEFT JOIN students s ON a.student_id = s.id
  WHERE ts.is_active = TRUE
  ORDER BY calendar_date, ts.display_order, COALESCE(ta.teacher_id, a.teacher_id), a."position";
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_monthly_calendar(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION get_monthly_calendar(INTEGER, INTEGER) IS
'月次カレンダー表示用のデータを取得。講師の空き枠と生徒のアサインを統合して返す。';
