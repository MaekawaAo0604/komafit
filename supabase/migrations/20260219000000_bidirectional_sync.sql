-- ============================================================================
-- Bidirectional Sync: 割り当てボード ↔ 月次カレンダー
-- ============================================================================
-- 割り当てボード（slots/slot_teacher/slot_students）と
-- 月次カレンダー（assignments/recurring_assignments）間の双方向同期
--
-- 同期方向:
-- 1. assign_student (ボード) → recurring_assignments (カレンダー)
-- 2. unassign_student (ボード) → recurring_assignments 無効化
-- 3. assign_student_v2 (カレンダー) → slot_students (ボード)
-- 4. unassign_student_v2 (カレンダー) → slot_students 削除
-- ============================================================================

-- ============================================================================
-- 1. ヘルパー関数: 曜日文字列 ↔ DOW番号 変換
-- ============================================================================

CREATE OR REPLACE FUNCTION day_to_dow(p_day VARCHAR(3))
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_day
    WHEN 'SUN' THEN 0
    WHEN 'MON' THEN 1
    WHEN 'TUE' THEN 2
    WHEN 'WED' THEN 3
    WHEN 'THU' THEN 4
    WHEN 'FRI' THEN 5
    WHEN 'SAT' THEN 6
    ELSE NULL
  END;
END;
$$;

CREATE OR REPLACE FUNCTION dow_to_day(p_dow INTEGER)
RETURNS VARCHAR(3)
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE p_dow
    WHEN 0 THEN 'SUN'
    WHEN 1 THEN 'MON'
    WHEN 2 THEN 'TUE'
    WHEN 3 THEN 'WED'
    WHEN 4 THEN 'THU'
    WHEN 5 THEN 'FRI'
    WHEN 6 THEN 'SAT'
    ELSE NULL
  END;
END;
$$;

COMMENT ON FUNCTION day_to_dow IS '曜日文字列(MON,TUE...)をDOW番号(0-6)に変換';
COMMENT ON FUNCTION dow_to_day IS 'DOW番号(0-6)を曜日文字列(MON,TUE...)に変換';

-- ============================================================================
-- 2. assign_student 修正（ボード → カレンダー同期付き）
-- ============================================================================

DROP FUNCTION IF EXISTS assign_student(VARCHAR, INT, INT, UUID, VARCHAR, INT);

CREATE OR REPLACE FUNCTION assign_student(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_seat INT,
    p_student_id UUID,
    p_subject VARCHAR(100),
    p_grade INT
)
RETURNS TABLE(
    slot_id VARCHAR(10),
    "position" INT,
    seat INT,
    student_id UUID,
    subject VARCHAR(100),
    grade INT
) AS $$
DECLARE
  v_day VARCHAR(3);
  v_koma VARCHAR(2);
  v_dow INTEGER;
  v_teacher_id UUID;
  v_actor_id UUID;
BEGIN
    -- 既存ロジック: slot_studentsにINSERT/UPDATE
    INSERT INTO slot_students (slot_id, "position", seat, student_id, subject, grade)
    VALUES (p_slot_id, p_position, p_seat, p_student_id, p_subject, p_grade)
    ON CONFLICT ON CONSTRAINT slot_students_pkey
    DO UPDATE SET
        student_id = EXCLUDED.student_id,
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade;

    -- ========================================
    -- 同期: ボード → カレンダー (recurring_assignments)
    -- ========================================
    v_day := split_part(p_slot_id, '-', 1);   -- 例: 'MON'
    v_koma := split_part(p_slot_id, '-', 2);  -- 例: 'A'
    v_dow := day_to_dow(v_day);

    -- slot_teacherから講師IDを取得
    SELECT st.teacher_id INTO v_teacher_id
    FROM slot_teacher st
    WHERE st.slot_id = p_slot_id AND st."position" = p_position;

    -- 講師がいて、time_slotsにコマが存在する場合のみ同期
    IF v_teacher_id IS NOT NULL AND EXISTS (SELECT 1 FROM time_slots WHERE id = v_koma AND is_active = TRUE) THEN
      v_actor_id := COALESCE(auth.uid(), (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

      INSERT INTO recurring_assignments (
        teacher_id, day_of_week, time_slot_id, student_id,
        subject, start_date, end_date, active, created_by
      ) VALUES (
        v_teacher_id, v_dow, v_koma, p_student_id,
        p_subject, CURRENT_DATE, NULL, TRUE, v_actor_id
      )
      ON CONFLICT (teacher_id, day_of_week, time_slot_id, student_id, start_date)
      DO NOTHING;
    END IF;

    -- 結果を返す
    RETURN QUERY
    SELECT
        slot_students.slot_id,
        slot_students."position",
        slot_students.seat,
        slot_students.student_id,
        slot_students.subject,
        slot_students.grade
    FROM slot_students
    WHERE slot_students.slot_id = p_slot_id
      AND slot_students."position" = p_position
      AND slot_students.seat = p_seat;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_student(VARCHAR, INT, INT, UUID, VARCHAR, INT) TO authenticated;
COMMENT ON FUNCTION assign_student(VARCHAR, INT, INT, UUID, VARCHAR, INT) IS '生徒をスロットの座席に割り当て、月次カレンダーの定期パターンにも同期する';

-- ============================================================================
-- 3. unassign_student 修正（ボード → カレンダー同期付き）
-- ============================================================================

DROP FUNCTION IF EXISTS unassign_student(VARCHAR, INT, INT);

CREATE OR REPLACE FUNCTION unassign_student(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_seat INT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_student_id UUID;
  v_day VARCHAR(3);
  v_koma VARCHAR(2);
  v_dow INTEGER;
  v_teacher_id UUID;
BEGIN
    -- 削除前にstudent_idを保存
    SELECT ss.student_id INTO v_student_id
    FROM slot_students ss
    WHERE ss.slot_id = p_slot_id AND ss."position" = p_position AND ss.seat = p_seat;

    IF v_student_id IS NULL THEN
      RETURN TRUE;  -- 何もない、早期リターン
    END IF;

    -- 既存ロジック: slot_studentsから削除
    DELETE FROM slot_students
    WHERE slot_students.slot_id = p_slot_id
      AND slot_students."position" = p_position
      AND slot_students.seat = p_seat;

    -- ========================================
    -- 同期: ボード → カレンダー (recurring_assignments 無効化)
    -- ========================================
    v_day := split_part(p_slot_id, '-', 1);
    v_koma := split_part(p_slot_id, '-', 2);
    v_dow := day_to_dow(v_day);

    SELECT st.teacher_id INTO v_teacher_id
    FROM slot_teacher st
    WHERE st.slot_id = p_slot_id AND st."position" = p_position;

    IF v_teacher_id IS NOT NULL THEN
      UPDATE recurring_assignments
      SET active = FALSE, updated_at = NOW()
      WHERE teacher_id = v_teacher_id
        AND day_of_week = v_dow
        AND time_slot_id = v_koma
        AND student_id = v_student_id
        AND active = TRUE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unassign_student(VARCHAR, INT, INT) TO authenticated;
COMMENT ON FUNCTION unassign_student(VARCHAR, INT, INT) IS '座席から生徒を削除し、月次カレンダーの定期パターンも無効化する';

-- ============================================================================
-- 4. assign_student_v2 修正（カレンダー → ボード同期付き）
-- ============================================================================

DROP FUNCTION IF EXISTS assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR);

CREATE OR REPLACE FUNCTION assign_student_v2(
  p_date DATE,
  p_time_slot_id VARCHAR(10),
  p_teacher_id UUID,
  p_student_id UUID,
  p_subject VARCHAR(50)
) RETURNS assignments AS $$
DECLARE
  v_result assignments;
  v_actor_id UUID;
  v_teacher_allows_pair BOOLEAN;
  v_student_requires_one_on_one BOOLEAN;
  v_existing_count INTEGER;
  v_calculated_position INTEGER;
  -- 同期用変数
  v_dow INTEGER;
  v_day VARCHAR(3);
  v_slot_id VARCHAR(10);
  v_board_position INTEGER;
  v_seat INTEGER;
  v_grade INTEGER;
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

  -- Check if teacher is available (auto-create availability if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM teacher_availability_v2
    WHERE teacher_id = p_teacher_id
      AND date = p_date
      AND time_slot_id = p_time_slot_id
  ) THEN
    -- 空き枠レコードが存在しない場合、自動作成
    INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
    VALUES (p_teacher_id, p_date, p_time_slot_id, TRUE);
  ELSIF EXISTS (
    SELECT 1 FROM teacher_availability_v2
    WHERE teacher_id = p_teacher_id
      AND date = p_date
      AND time_slot_id = p_time_slot_id
      AND is_available = FALSE
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

  -- Calculate next available position automatically
  SELECT COALESCE(MAX("position"), 0) + 1 INTO v_calculated_position
  FROM assignments
  WHERE date = p_date
    AND time_slot_id = p_time_slot_id
    AND teacher_id = p_teacher_id;

  -- Insert assignment with auto-calculated position
  INSERT INTO assignments (date, time_slot_id, teacher_id, student_id, subject, position, assigned_by)
  VALUES (p_date, p_time_slot_id, p_teacher_id, p_student_id, p_subject, v_calculated_position, v_actor_id)
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
    'position', v_calculated_position
  ));

  -- ========================================
  -- 同期: カレンダー → ボード (slot_students)
  -- ========================================
  v_dow := EXTRACT(DOW FROM p_date)::INTEGER;
  v_day := dow_to_day(v_dow);
  v_slot_id := v_day || '-' || p_time_slot_id;

  -- slotsテーブルに該当スロットが存在するか確認
  IF EXISTS (SELECT 1 FROM slots WHERE id = v_slot_id) THEN
    -- slot_teacherで講師のpositionを検索
    SELECT st."position" INTO v_board_position
    FROM slot_teacher st
    WHERE st.slot_id = v_slot_id AND st.teacher_id = p_teacher_id
    LIMIT 1;

    -- 講師がボードに未設定の場合、空きpositionに講師をセット
    IF v_board_position IS NULL THEN
      -- teacher_id IS NULL の最小positionを探す
      SELECT st."position" INTO v_board_position
      FROM slot_teacher st
      WHERE st.slot_id = v_slot_id AND st.teacher_id IS NULL
      ORDER BY st."position" ASC
      LIMIT 1;

      IF v_board_position IS NOT NULL THEN
        -- 既存のNULL行を更新
        UPDATE slot_teacher
        SET teacher_id = p_teacher_id
        WHERE slot_id = v_slot_id AND "position" = v_board_position;
      END IF;
    END IF;

    -- 次の空きseatを算出
    SELECT COALESCE(MAX(ss.seat), 0) + 1 INTO v_seat
    FROM slot_students ss
    WHERE ss.slot_id = v_slot_id AND ss."position" = v_board_position;

    IF v_seat <= 2 THEN
      -- 生徒のgradeを取得
      SELECT s.grade INTO v_grade FROM students s WHERE s.id = p_student_id;

      INSERT INTO slot_students (slot_id, "position", seat, student_id, subject, grade)
      VALUES (v_slot_id, v_board_position, v_seat, p_student_id, p_subject, v_grade)
      ON CONFLICT ON CONSTRAINT slot_students_pkey
      DO UPDATE SET
        student_id = EXCLUDED.student_id,
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade;
    END IF;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR) TO authenticated;
COMMENT ON FUNCTION assign_student_v2(DATE, VARCHAR, UUID, UUID, VARCHAR) IS
'生徒を日付×時間帯×講師にアサイン。position自動計算、割り当てボードにも同期。';

-- ============================================================================
-- 5. unassign_student_v2 修正（カレンダー → ボード同期付き）
-- ============================================================================

DROP FUNCTION IF EXISTS unassign_student_v2(UUID);

CREATE OR REPLACE FUNCTION unassign_student_v2(
  p_assignment_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_actor_id UUID;
  v_assignment assignments;
  v_remaining_count INTEGER;
  -- 同期用変数
  v_dow INTEGER;
  v_day VARCHAR(3);
  v_slot_id VARCHAR(10);
  v_board_position INTEGER;
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

  -- ========================================
  -- 同期: カレンダー → ボード (slot_students 削除)
  -- ========================================
  v_dow := EXTRACT(DOW FROM v_assignment.date)::INTEGER;
  v_day := dow_to_day(v_dow);
  v_slot_id := v_day || '-' || v_assignment.time_slot_id;

  IF EXISTS (SELECT 1 FROM slots WHERE id = v_slot_id) THEN
    SELECT st."position" INTO v_board_position
    FROM slot_teacher st
    WHERE st.slot_id = v_slot_id AND st.teacher_id = v_assignment.teacher_id
    LIMIT 1;

    IF v_board_position IS NOT NULL THEN
      DELETE FROM slot_students
      WHERE slot_students.slot_id = v_slot_id
        AND slot_students."position" = v_board_position
        AND slot_students.student_id = v_assignment.student_id;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION unassign_student_v2(UUID) TO authenticated;
COMMENT ON FUNCTION unassign_student_v2(UUID) IS
'生徒のアサインを解除し、割り当てボードからも削除。アサインがなくなった場合、講師を再び利用可能にマーク。';

-- スキーマリロード
NOTIFY pgrst, 'reload schema';
