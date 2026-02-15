-- ============================================================================
-- RPC Function: assign_teacher
-- ============================================================================
-- このマイグレーションでは、講師割当のRPC関数を作成します。
--
-- 関数:
-- 1. assign_teacher: スロットに講師を割り当てる（トランザクション処理）
--
-- 要件: REQ-10（講師割当の確定）
-- ============================================================================

-- ============================================================================
-- assign_teacher Function
-- ============================================================================
-- スロットに講師を割り当てる
-- トランザクション内で以下を実行:
-- 1. slot_teacherにINSERT/UPDATE
-- 2. teacher_availabilityを更新（is_available = FALSE）
-- 3. audit_logsに記録

CREATE OR REPLACE FUNCTION assign_teacher(
    p_slot_id VARCHAR(10),
    p_teacher_id UUID,
    p_assigned_by UUID
)
RETURNS TABLE(
    slot_id VARCHAR(10),
    teacher_id UUID,
    assigned_by UUID,
    assigned_at TIMESTAMP
) AS $$
DECLARE
    v_result RECORD;
    v_teacher_name VARCHAR(255);
BEGIN
    -- 講師名を取得（ログ用）
    SELECT name INTO v_teacher_name FROM teachers WHERE id = p_teacher_id;

    -- 1. slot_teacherにINSERT/UPDATE（ON CONFLICT処理）
    INSERT INTO slot_teacher (slot_id, teacher_id, assigned_by, assigned_at)
    VALUES (p_slot_id, p_teacher_id, p_assigned_by, NOW())
    ON CONFLICT (slot_id)
    DO UPDATE SET
        teacher_id = EXCLUDED.teacher_id,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at
    RETURNING * INTO v_result;

    -- 2. teacher_availabilityを消化（is_available = FALSE）
    UPDATE teacher_availability
    SET is_available = FALSE, updated_at = NOW()
    WHERE teacher_id = p_teacher_id AND slot_id = p_slot_id;

    -- teacher_availabilityに存在しない場合は作成
    IF NOT FOUND THEN
        INSERT INTO teacher_availability (teacher_id, slot_id, is_available, updated_at)
        VALUES (p_teacher_id, p_slot_id, FALSE, NOW())
        ON CONFLICT (teacher_id, slot_id) DO NOTHING;
    END IF;

    -- 3. audit_logsに記録（action='ASSIGN'）
    INSERT INTO audit_logs (actor_id, action, payload, created_at)
    VALUES (
        p_assigned_by,
        'ASSIGN',
        jsonb_build_object(
            'slot_id', p_slot_id,
            'teacher_id', p_teacher_id,
            'teacher_name', v_teacher_name
        ),
        NOW()
    );

    -- 結果を返す
    RETURN QUERY
    SELECT
        v_result.slot_id,
        v_result.teacher_id,
        v_result.assigned_by,
        v_result.assigned_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION assign_teacher(VARCHAR, UUID, UUID) IS 'スロットに講師を割り当てる（トランザクション処理）';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- 関数が存在するか確認
-- SELECT proname, proargtypes, prorettype
-- FROM pg_proc
-- WHERE proname = 'assign_teacher';

-- 関数を実行してテスト（service role keyで実行）
-- SELECT * FROM assign_teacher(
--     'TUE-B',
--     '10000000-0000-0000-0000-000000000001'::UUID,
--     '00000000-0000-0000-0000-000000000001'::UUID
-- );

-- 割当結果を確認
-- SELECT * FROM slot_teacher WHERE slot_id = 'TUE-B';

-- 空き枠が消化されたか確認
-- SELECT * FROM teacher_availability
-- WHERE teacher_id = '10000000-0000-0000-0000-000000000001'
-- AND slot_id = 'TUE-B';

-- ログが記録されたか確認
-- SELECT * FROM audit_logs
-- WHERE action = 'ASSIGN'
-- ORDER BY created_at DESC
-- LIMIT 1;
