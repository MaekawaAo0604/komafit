-- ============================================================================
-- Add Time Slot 0
-- ============================================================================
-- Add the missing time slot '0' to the calendar

INSERT INTO time_slots (id, start_time, end_time, display_order) VALUES
('0', '13:50:00', '15:20:00', 0)
ON CONFLICT (id) DO NOTHING;

-- Update display order for other slots if needed
UPDATE time_slots SET display_order = 1 WHERE id = '1';
UPDATE time_slots SET display_order = 2 WHERE id = 'A';
UPDATE time_slots SET display_order = 3 WHERE id = 'B';
UPDATE time_slots SET display_order = 4 WHERE id = 'C';
