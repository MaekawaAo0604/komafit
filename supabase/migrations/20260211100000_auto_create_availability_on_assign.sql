-- ============================================================================
-- Auto-create Teacher Availability on Assignment
-- ============================================================================
-- アサイン時に空き枠が存在しない場合、自動的に作成するように修正

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

  -- Auto-create availability if it doesn't exist
  -- 空き枠が存在しない場合、自動的に作成する
  INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
  VALUES (p_teacher_id, p_date, p_time_slot_id, TRUE)
  ON CONFLICT (teacher_id, date, time_slot_id) DO NOTHING;

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
  VALUES (v_actor_id, 'ASSIGNMENT_CREATE_V2', jsonb_build_object(
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
'生徒をアサイン（日付ベース）。空き枠が存在しない場合は自動作成される。';
