-- ============================================================================
-- Remove position upper limit (10) from slot_teacher and slot_students
-- ============================================================================
-- コマ内の枠数上限を撤廃する。下限(>=1)は維持。

-- slot_teacher: CHECK制約を差し替え
ALTER TABLE slot_teacher DROP CONSTRAINT IF EXISTS slot_teacher_position_check;
ALTER TABLE slot_teacher ADD CONSTRAINT slot_teacher_position_check CHECK (position >= 1);

-- slot_students: CHECK制約を差し替え
ALTER TABLE slot_students DROP CONSTRAINT IF EXISTS slot_students_position_check;
ALTER TABLE slot_students ADD CONSTRAINT slot_students_position_check CHECK (position >= 1);

-- add_slot_position RPC: 上限チェックを削除
CREATE OR REPLACE FUNCTION add_slot_position(p_slot_id TEXT)
RETURNS INT AS $$
DECLARE
  v_next_position INT;
BEGIN
  -- 現在の最大 position + 1 を計算
  SELECT COALESCE(MAX(position), 0) + 1
  INTO v_next_position
  FROM slot_teacher
  WHERE slot_id = p_slot_id;

  -- 新しいポジションを追加（teacher_id は NULL = 空き枠）
  INSERT INTO slot_teacher (slot_id, position, teacher_id, assigned_by, assigned_at)
  VALUES (p_slot_id, v_next_position, NULL, NULL, NULL);

  RETURN v_next_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
