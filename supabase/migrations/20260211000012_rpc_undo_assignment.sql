-- Migration: Undo Assignment RPC Function
-- Requirements: REQ-12（Undo機能）
--
-- This migration creates the undo_assignment function that allows
-- administrators to undo the last assignment operation.

-- Drop function if exists
DROP FUNCTION IF EXISTS undo_assignment(VARCHAR, INTEGER, UUID, UUID);

-- Create undo_assignment function
CREATE OR REPLACE FUNCTION undo_assignment(
  p_slot_id VARCHAR(10),
  p_position INTEGER,
  p_prev_teacher_id UUID,
  p_actor_id UUID
) RETURNS slot_teacher AS $$
DECLARE
  v_result slot_teacher;
BEGIN
  -- Restore the assignment state
  IF p_prev_teacher_id IS NULL THEN
    -- If prev_teacher_id is NULL, remove the assignment
    DELETE FROM slot_teacher
    WHERE slot_id = p_slot_id AND "position" = p_position
    RETURNING * INTO v_result;

    -- Mark the slot as available again (no need to update teacher_availability)
  ELSE
    -- If prev_teacher_id is not NULL, restore the previous teacher
    UPDATE slot_teacher
    SET
      teacher_id = p_prev_teacher_id,
      assigned_by = p_actor_id,
      assigned_at = NOW()
    WHERE slot_id = p_slot_id AND "position" = p_position
    RETURNING * INTO v_result;

    -- Update teacher_availability: mark the previous teacher's slot as unavailable
    UPDATE teacher_availability
    SET is_available = FALSE, updated_at = NOW()
    WHERE teacher_id = p_prev_teacher_id AND slot_id = p_slot_id;
  END IF;

  -- Record the undo operation in audit_logs
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (p_actor_id, 'UNDO', jsonb_build_object(
    'slot_id', p_slot_id,
    'position', p_position,
    'prev_teacher_id', p_prev_teacher_id
  ));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION undo_assignment(VARCHAR, INTEGER, UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION undo_assignment(VARCHAR, INTEGER, UUID, UUID) IS
'Undo the last assignment operation by restoring the previous state. If prev_teacher_id is NULL, removes the assignment. Otherwise, restores the previous teacher.';
