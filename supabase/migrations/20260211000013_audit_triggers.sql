-- Migration: Audit Log Triggers
-- Requirements: REQ-14（監査ログ）
--
-- This migration creates triggers to automatically log changes to master data tables.

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS teachers_audit_trigger ON teachers;
DROP TRIGGER IF EXISTS students_audit_trigger ON students;
DROP TRIGGER IF EXISTS teacher_availability_audit_trigger ON teacher_availability;
DROP TRIGGER IF EXISTS settings_audit_trigger ON settings;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS log_data_changes();

-- Create trigger function for logging changes
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
  v_action TEXT;
  v_payload JSONB;
BEGIN
  -- Get actor_id from auth.uid() (current user)
  -- If no auth context (e.g., during seed or system trigger), set to NULL
  v_actor_id := auth.uid();

  -- Determine action type
  CASE TG_OP
    WHEN 'INSERT' THEN
      v_action := 'CREATE';
      v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', 'INSERT',
        'new_data', to_jsonb(NEW)
      );
    WHEN 'UPDATE' THEN
      v_action := 'UPDATE';
      v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', 'UPDATE',
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW)
      );
    WHEN 'DELETE' THEN
      v_action := 'DELETE';
      v_payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', 'DELETE',
        'old_data', to_jsonb(OLD)
      );
  END CASE;

  -- Insert audit log
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (v_actor_id, v_action, v_payload);

  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for teachers table
CREATE TRIGGER teachers_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON teachers
FOR EACH ROW EXECUTE FUNCTION log_data_changes();

-- Create triggers for students table
CREATE TRIGGER students_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON students
FOR EACH ROW EXECUTE FUNCTION log_data_changes();

-- Create triggers for teacher_availability table (UPDATE only)
CREATE TRIGGER teacher_availability_audit_trigger
AFTER UPDATE ON teacher_availability
FOR EACH ROW EXECUTE FUNCTION log_data_changes();

-- Create triggers for settings table
CREATE TRIGGER settings_audit_trigger
AFTER UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION log_data_changes();

-- Add comments
COMMENT ON FUNCTION log_data_changes() IS
'Trigger function that automatically logs INSERT, UPDATE, and DELETE operations to audit_logs table';

COMMENT ON TRIGGER teachers_audit_trigger ON teachers IS
'Automatically logs all changes to teachers table';

COMMENT ON TRIGGER students_audit_trigger ON students IS
'Automatically logs all changes to students table';

COMMENT ON TRIGGER teacher_availability_audit_trigger ON teacher_availability IS
'Automatically logs availability changes';

COMMENT ON TRIGGER settings_audit_trigger ON settings IS
'Automatically logs settings changes';
