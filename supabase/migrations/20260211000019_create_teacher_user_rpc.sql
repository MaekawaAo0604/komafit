-- ============================================================================
-- Create Teacher User RPC Function
-- ============================================================================
-- Create a function to create a teacher user account

CREATE OR REPLACE FUNCTION create_teacher_user(
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create user record in users table
  -- Note: The password parameter is accepted but not used in this implementation
  -- Actual Supabase Auth account provisioning should be done separately
  INSERT INTO users (email, name, role, active)
  VALUES (p_email, p_name, 'teacher', TRUE)
  RETURNING id INTO v_user_id;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_teacher_user(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION create_teacher_user(TEXT, TEXT, TEXT) IS
'管理者用：講師ユーザーアカウントを作成。実際のAuth認証は別途Supabase Dashboardまたは Admin APIで設定する必要があります。';
