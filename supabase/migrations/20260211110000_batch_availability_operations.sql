-- ============================================================================
-- Batch Availability Operations
-- ============================================================================
-- 空き枠の一括操作機能を追加
-- - 週全体の空き枠を一括設定
-- - 週のパターンを別の週にコピー

-- ============================================================================
-- 1. Batch Set Availability for Week
-- ============================================================================
-- 指定された週の全コマを一括で空き枠設定

CREATE OR REPLACE FUNCTION batch_set_week_availability(
  p_teacher_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_is_available BOOLEAN
) RETURNS TABLE(
  success_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_actor_id UUID;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_date DATE;
  v_time_slot_id VARCHAR(10);
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Loop through all dates in range
  FOR v_date IN
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE
  LOOP
    -- Loop through all time slots
    FOR v_time_slot_id IN
      SELECT id FROM time_slots ORDER BY id
    LOOP
      BEGIN
        -- Insert or update availability
        INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
        VALUES (p_teacher_id, v_date, v_time_slot_id, p_is_available)
        ON CONFLICT (teacher_id, date, time_slot_id)
        DO UPDATE SET
          is_available = p_is_available,
          updated_at = NOW();

        v_success_count := v_success_count + 1;
      EXCEPTION WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
      END;
    END LOOP;
  END LOOP;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'BATCH_SET_AVAILABILITY', jsonb_build_object(
    'teacher_id', p_teacher_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'is_available', p_is_available,
    'success_count', v_success_count,
    'error_count', v_error_count
  ));

  RETURN QUERY SELECT v_success_count, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION batch_set_week_availability(UUID, DATE, DATE, BOOLEAN) TO authenticated;

COMMENT ON FUNCTION batch_set_week_availability(UUID, DATE, DATE, BOOLEAN) IS
'指定された期間の全コマを一括で空き枠設定する';

-- ============================================================================
-- 2. Copy Week Availability Pattern
-- ============================================================================
-- ある週の空き枠パターンを別の週にコピー

CREATE OR REPLACE FUNCTION copy_week_availability(
  p_teacher_id UUID,
  p_source_start_date DATE,
  p_source_end_date DATE,
  p_target_start_date DATE
) RETURNS TABLE(
  success_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  v_actor_id UUID;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_source_date DATE;
  v_target_date DATE;
  v_days_offset INTEGER;
  v_availability RECORD;
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Calculate days offset
  v_days_offset := p_target_start_date - p_source_start_date;

  -- Loop through source availability records
  FOR v_availability IN
    SELECT date, time_slot_id, is_available
    FROM teacher_availability_v2
    WHERE teacher_id = p_teacher_id
      AND date >= p_source_start_date
      AND date <= p_source_end_date
    ORDER BY date, time_slot_id
  LOOP
    BEGIN
      -- Calculate target date
      v_target_date := v_availability.date + v_days_offset;

      -- Insert or update availability for target date
      INSERT INTO teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
      VALUES (p_teacher_id, v_target_date, v_availability.time_slot_id, v_availability.is_available)
      ON CONFLICT (teacher_id, date, time_slot_id)
      DO UPDATE SET
        is_available = v_availability.is_available,
        updated_at = NOW();

      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'COPY_WEEK_AVAILABILITY', jsonb_build_object(
    'teacher_id', p_teacher_id,
    'source_start_date', p_source_start_date,
    'source_end_date', p_source_end_date,
    'target_start_date', p_target_start_date,
    'success_count', v_success_count,
    'error_count', v_error_count
  ));

  RETURN QUERY SELECT v_success_count, v_error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION copy_week_availability(UUID, DATE, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION copy_week_availability(UUID, DATE, DATE, DATE) IS
'ある週の空き枠パターンを別の週にコピーする';

-- ============================================================================
-- 3. Clear Week Availability
-- ============================================================================
-- 指定された週の空き枠を全削除

CREATE OR REPLACE FUNCTION clear_week_availability(
  p_teacher_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS TABLE(
  deleted_count INTEGER
) AS $$
DECLARE
  v_actor_id UUID;
  v_deleted_count INTEGER;
BEGIN
  -- Get actor_id
  v_actor_id := auth.uid();

  -- Delete availability records (only if no assignments exist)
  DELETE FROM teacher_availability_v2
  WHERE teacher_id = p_teacher_id
    AND date >= p_start_date
    AND date <= p_end_date
    AND NOT EXISTS (
      SELECT 1 FROM assignments
      WHERE assignments.teacher_id = teacher_availability_v2.teacher_id
        AND assignments.date = teacher_availability_v2.date
        AND assignments.time_slot_id = teacher_availability_v2.time_slot_id
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Record in audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, 'CLEAR_WEEK_AVAILABILITY', jsonb_build_object(
    'teacher_id', p_teacher_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'deleted_count', v_deleted_count
  ));

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION clear_week_availability(UUID, DATE, DATE) TO authenticated;

COMMENT ON FUNCTION clear_week_availability(UUID, DATE, DATE) IS
'指定された週の空き枠を全削除する（アサイン済みの枠は削除しない）';
