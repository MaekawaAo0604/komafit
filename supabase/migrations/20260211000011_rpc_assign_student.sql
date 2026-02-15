-- ============================================================================
-- RPC Function: assign_student
-- ============================================================================
-- 生徒をスロットの座席に割り当てる

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
BEGIN
    -- slot_studentsにINSERT/UPDATE（ON CONFLICT処理）
    INSERT INTO slot_students (slot_id, "position", seat, student_id, subject, grade)
    VALUES (p_slot_id, p_position, p_seat, p_student_id, p_subject, p_grade)
    ON CONFLICT ON CONSTRAINT slot_students_pkey
    DO UPDATE SET
        student_id = EXCLUDED.student_id,
        subject = EXCLUDED.subject,
        grade = EXCLUDED.grade;

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

COMMENT ON FUNCTION assign_student(VARCHAR, INT, INT, UUID, VARCHAR, INT) IS '生徒をスロットの座席に割り当てる';

-- ============================================================================
-- unassign_student Function
-- ============================================================================
-- 座席から生徒を削除する

CREATE OR REPLACE FUNCTION unassign_student(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_seat INT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- slot_studentsから削除
    DELETE FROM slot_students
    WHERE slot_id = p_slot_id AND "position" = p_position AND seat = p_seat;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unassign_student(VARCHAR, INT, INT) IS '座席から生徒を削除する';
