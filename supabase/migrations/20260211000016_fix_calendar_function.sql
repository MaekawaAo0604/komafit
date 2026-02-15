-- ============================================================================
-- Fix get_monthly_calendar function
-- ============================================================================
-- Fix the date alias conflict by renaming 'date' to 'calendar_date'

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
