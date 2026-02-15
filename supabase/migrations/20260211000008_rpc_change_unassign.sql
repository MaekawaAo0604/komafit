-- ============================================================================
-- RPC Functions: change_teacher, unassign_teacher
-- ============================================================================
-- このマイグレーションでは、講師変更と割当解除のRPC関数を作成します。
--
-- 関数:
-- 1. change_teacher: スロットの講師を変更する（トランザクション処理）
-- 2. unassign_teacher: スロットの講師割当を解除する（トランザクション処理）
--
-- 要件: REQ-10（講師割当の確定）、REQ-11（割当の変更・削除）
-- ============================================================================

-- ============================================================================
-- change_teacher Function
-- ============================================================================
-- スロットの講師を変更する
-- トランザクション内で以下を実行:
-- 1. 現在の講師の空き枠を復元（is_available = TRUE）
-- 2. 新しい講師を割当
-- 3. audit_logsに記録（action='CHANGE'）

CREATE OR REPLACE FUNCTION change_teacher(
    p_slot_id VARCHAR(10),
    p_new_teacher_id UUID,
    p_assigned_by UUID
)
RETURNS TABLE(
    slot_id VARCHAR(10),
    teacher_id UUID,
    assigned_by UUID,
    assigned_at TIMESTAMP
) AS $$
DECLARE
    v_old_teacher_id UUID;
    v_old_teacher_name VARCHAR(255);
    v_new_teacher_name VARCHAR(255);
BEGIN
    -- 現在の講師IDを取得
    SELECT st.teacher_id INTO v_old_teacher_id
    FROM slot_teacher st
    WHERE st.slot_id = p_slot_id;

    IF v_old_teacher_id IS NULL THEN
        RAISE EXCEPTION 'No teacher assigned to slot %', p_slot_id;
    END IF;

    -- 講師名を取得（ログ用）
    SELECT name INTO v_old_teacher_name FROM teachers WHERE id = v_old_teacher_id;
    SELECT name INTO v_new_teacher_name FROM teachers WHERE id = p_new_teacher_id;

    -- 1. 現在の講師の空き枠を復元（is_available = TRUE）
    UPDATE teacher_availability
    SET is_available = TRUE, updated_at = NOW()
    WHERE teacher_id = v_old_teacher_id AND slot_id = p_slot_id;

    -- 2. 新しい講師を割当（assign_teacherのロジックを再利用）
    UPDATE slot_teacher
    SET
        teacher_id = p_new_teacher_id,
        assigned_by = p_assigned_by,
        assigned_at = NOW()
    WHERE slot_id = p_slot_id;

    -- 新しい講師の空き枠を消化
    UPDATE teacher_availability
    SET is_available = FALSE, updated_at = NOW()
    WHERE teacher_id = p_new_teacher_id AND slot_id = p_slot_id;

    -- teacher_availabilityに存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO teacher_availability (teacher_id, slot_id, is_available, updated_at)
        VALUES (p_new_teacher_id, p_slot_id, FALSE, NOW())
        ON CONFLICT (teacher_id, slot_id) DO NOTHING;
    END IF;

    -- 3. audit_logsに記録（action='CHANGE'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'CHANGE',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'old_teacher_id', v_old_teacher_id,
            'old_teacher_name', v_old_teacher_name,
            'new_teacher_id', p_new_teacher_id,
            'new_teacher_name', v_new_teacher_name
        ),
        NOW()
    );

    -- 結果を返す
    RETURN QUERY
    SELECT
        st.slot_id,
        st.teacher_id,
        st.assigned_by,
        st.assigned_at
    FROM slot_teacher st
    WHERE st.slot_id = p_slot_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION change_teacher(VARCHAR, UUID, UUID) IS 'スロットの講師を変更する（トランザクション処理）';

-- ============================================================================
-- unassign_teacher Function
-- ============================================================================
-- スロットの講師割当を解除する
-- トランザクション内で以下を実行:
-- 1. slot_teacherから削除
-- 2. teacher_availabilityを復元（is_available = TRUE）
-- 3. audit_logsに記録（action='UNASSIGN'）

CREATE OR REPLACE FUNCTION unassign_teacher(
    p_slot_id VARCHAR(10),
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
    WHERE st.slot_id = p_slot_id;

    IF v_teacher_id IS NULL THEN
        RAISE EXCEPTION 'No teacher assigned to slot %', p_slot_id;
    END IF;

    -- 講師名を取得（ログ用）
    SELECT name INTO v_teacher_name FROM teachers WHERE id = v_teacher_id;

    -- 1. slot_teacherから削除
    DELETE FROM slot_teacher WHERE slot_id = p_slot_id;

    -- 2. teacher_availabilityを復元（is_available = TRUE）
    UPDATE teacher_availability
    SET is_available = TRUE, updated_at = NOW()
    WHERE teacher_id = v_teacher_id AND slot_id = p_slot_id;

    -- 3. audit_logsに記録（action='UNASSIGN'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'UNASSIGN',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'teacher_id', v_teacher_id,
            'teacher_name', v_teacher_name
        ),
        NOW()
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unassign_teacher(VARCHAR, UUID) IS 'スロットの講師割当を解除する（トランザクション処理）';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- 関数が存在するか確認
-- SELECT proname FROM pg_proc WHERE proname IN ('change_teacher', 'unassign_teacher');

-- change_teacher関数をテスト
-- SELECT * FROM change_teacher(
--     'TUE-B',
--     '10000000-0000-0000-0000-000000000002'::UUID,
--     '00000000-0000-0000-0000-000000000001'::UUID
-- );

-- unassign_teacher関数をテスト
-- SELECT unassign_teacher(
--     'TUE-B',
--     '00000000-0000-0000-0000-000000000001'::UUID
-- );

-- ログを確認
-- SELECT * FROM audit_logs
-- WHERE action IN ('CHANGE', 'UNASSIGN')
-- ORDER BY created_at DESC
-- LIMIT 5;
