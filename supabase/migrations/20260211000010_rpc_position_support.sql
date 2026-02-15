-- ============================================================================
-- RPC Functions: Position-based Teacher Assignment
-- ============================================================================
-- 既存のRPC関数をposition対応に更新
--
-- 関数:
-- 1. assign_teacher: スロットの特定ポジションに講師を割り当てる
-- 2. change_teacher: スロットの特定ポジションの講師を変更する
-- 3. unassign_teacher: スロットの特定ポジションの講師割当を解除する
-- ============================================================================

-- ============================================================================
-- DROP existing functions
-- ============================================================================
DROP FUNCTION IF EXISTS assign_teacher(VARCHAR, UUID, UUID);
DROP FUNCTION IF EXISTS change_teacher(VARCHAR, UUID, UUID);
DROP FUNCTION IF EXISTS unassign_teacher(VARCHAR, UUID);

-- ============================================================================
-- assign_teacher Function (with position)
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_teacher(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_teacher_id UUID,
    p_assigned_by UUID
)
RETURNS slot_teacher AS $$
DECLARE
    v_teacher_name VARCHAR(255);
    v_result slot_teacher;
BEGIN
    -- 講師名を取得（ログ用）
    SELECT name INTO v_teacher_name FROM teachers WHERE id = p_teacher_id;

    -- teacher_availabilityを消化（is_available = FALSE）
    UPDATE teacher_availability
    SET is_available = FALSE, updated_at = NOW()
    WHERE teacher_availability.teacher_id = p_teacher_id
      AND teacher_availability.slot_id = p_slot_id;

    -- teacher_availabilityに存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO teacher_availability (teacher_id, slot_id, is_available, updated_at)
        VALUES (p_teacher_id, p_slot_id, FALSE, NOW())
        ON CONFLICT (teacher_id, slot_id) DO NOTHING;
    END IF;

    -- slot_teacherを更新
    UPDATE slot_teacher
    SET
        teacher_id = p_teacher_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW()
    WHERE slot_teacher.slot_id = p_slot_id
      AND slot_teacher."position" = p_position
    RETURNING * INTO v_result;

    -- audit_logsに記録（action='ASSIGN'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'ASSIGN',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'position', p_position,
            'teacher_id', p_teacher_id,
            'teacher_name', v_teacher_name
        ),
        NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_teacher(VARCHAR, INT, UUID, UUID) IS 'スロットの特定ポジションに講師を割り当てる';
GRANT EXECUTE ON FUNCTION assign_teacher(VARCHAR, INT, UUID, UUID) TO authenticated;

-- ============================================================================
-- change_teacher Function (with position)
-- ============================================================================
CREATE OR REPLACE FUNCTION change_teacher(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_new_teacher_id UUID,
    p_assigned_by UUID
)
RETURNS slot_teacher AS $$
DECLARE
    v_old_teacher_id UUID;
    v_old_teacher_name VARCHAR(255);
    v_new_teacher_name VARCHAR(255);
    v_result slot_teacher;
BEGIN
    -- 現在の講師IDを取得
    SELECT slot_teacher.teacher_id INTO v_old_teacher_id
    FROM slot_teacher
    WHERE slot_teacher.slot_id = p_slot_id AND slot_teacher."position" = p_position;

    IF v_old_teacher_id IS NULL THEN
        RAISE EXCEPTION 'No teacher assigned to slot % position %', p_slot_id, p_position;
    END IF;

    -- 講師名を取得（ログ用）
    SELECT name INTO v_old_teacher_name FROM teachers WHERE id = v_old_teacher_id;
    SELECT name INTO v_new_teacher_name FROM teachers WHERE id = p_new_teacher_id;

    -- 現在の講師の空き枠を復元（is_available = TRUE）
    -- ただし、同じslot_idの他のpositionにも割り当てられている場合は復元しない
    UPDATE teacher_availability
    SET is_available = TRUE, updated_at = NOW()
    WHERE teacher_availability.teacher_id = v_old_teacher_id
      AND teacher_availability.slot_id = p_slot_id
      AND NOT EXISTS (
        SELECT 1 FROM slot_teacher
        WHERE slot_teacher.teacher_id = v_old_teacher_id
          AND slot_teacher.slot_id = p_slot_id
          AND slot_teacher."position" != p_position
      );

    -- 新しい講師の空き枠を消化
    UPDATE teacher_availability
    SET is_available = FALSE, updated_at = NOW()
    WHERE teacher_availability.teacher_id = p_new_teacher_id
      AND teacher_availability.slot_id = p_slot_id;

    -- teacher_availabilityに存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO teacher_availability (teacher_id, slot_id, is_available, updated_at)
        VALUES (p_new_teacher_id, p_slot_id, FALSE, NOW())
        ON CONFLICT (teacher_id, slot_id) DO NOTHING;
    END IF;

    -- 新しい講師を割当
    UPDATE slot_teacher
    SET
        teacher_id = p_new_teacher_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW()
    WHERE slot_teacher.slot_id = p_slot_id
      AND slot_teacher."position" = p_position
    RETURNING * INTO v_result;

    -- audit_logsに記録（action='CHANGE'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'CHANGE',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'position', p_position,
            'old_teacher_id', v_old_teacher_id,
            'old_teacher_name', v_old_teacher_name,
            'new_teacher_id', p_new_teacher_id,
            'new_teacher_name', v_new_teacher_name
        ),
        NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION change_teacher(VARCHAR, INT, UUID, UUID) IS 'スロットの特定ポジションの講師を変更する';
GRANT EXECUTE ON FUNCTION change_teacher(VARCHAR, INT, UUID, UUID) TO authenticated;

-- ============================================================================
-- unassign_teacher Function (with position)
-- ============================================================================
CREATE OR REPLACE FUNCTION unassign_teacher(
    p_slot_id VARCHAR(10),
    p_position INT,
    p_assigned_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_teacher_id UUID;
    v_teacher_name VARCHAR(255);
BEGIN
    -- 現在の講師IDを取得
    SELECT st.teacher_id INTO v_teacher_id
    FROM slot_teacher st
    WHERE st.slot_id = p_slot_id AND st.position = p_position;

    IF v_teacher_id IS NULL THEN
        RAISE EXCEPTION 'No teacher assigned to slot % position %', p_slot_id, p_position;
    END IF;

    -- 講師名を取得（ログ用）
    SELECT name INTO v_teacher_name FROM teachers WHERE id = v_teacher_id;

    -- slot_studentsから削除（CASCADE制約により自動削除される）
    DELETE FROM slot_students
    WHERE slot_id = p_slot_id AND position = p_position;

    -- slot_teacherから講師をクリア（NULLに設定）
    UPDATE slot_teacher
    SET
        teacher_id = NULL,
        assigned_by = NULL,
        assigned_at = NULL
    WHERE slot_teacher.slot_id = p_slot_id AND slot_teacher."position" = p_position;

    -- teacher_availabilityを復元（is_available = TRUE）
    -- ただし、同じslot_idの他のpositionにも割り当てられている場合は復元しない
    UPDATE teacher_availability
    SET is_available = TRUE, updated_at = NOW()
    WHERE teacher_availability.teacher_id = v_teacher_id
      AND teacher_availability.slot_id = p_slot_id
      AND NOT EXISTS (
        SELECT 1 FROM slot_teacher
        WHERE slot_teacher.teacher_id = v_teacher_id
          AND slot_teacher.slot_id = p_slot_id
          AND slot_teacher.position != p_position
      );

    -- audit_logsに記録（action='UNASSIGN'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'UNASSIGN',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'position', p_position,
            'teacher_id', v_teacher_id,
            'teacher_name', v_teacher_name
        ),
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unassign_teacher(VARCHAR, INT, UUID) IS 'スロットの特定ポジションの講師割当を解除する';
