-- ============================================================================
-- RLS Policies for Date-Based Scheduling Tables
-- ============================================================================
-- Enable RLS and add policies for time_slots, teacher_availability_v2, assignments

-- Enable RLS on time_slots
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

-- time_slots: Everyone can read
CREATE POLICY "time_slots_read_all" ON time_slots
  FOR SELECT
  TO authenticated
  USING (true);

-- time_slots: Only admins can insert/update/delete
CREATE POLICY "time_slots_admin_all" ON time_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.active = TRUE
    )
  );

-- Enable RLS on teacher_availability_v2
ALTER TABLE teacher_availability_v2 ENABLE ROW LEVEL SECURITY;

-- teacher_availability_v2: All authenticated users can read
CREATE POLICY "teacher_availability_v2_read_all" ON teacher_availability_v2
  FOR SELECT
  TO authenticated
  USING (true);

-- teacher_availability_v2: Teachers can manage their own availability
CREATE POLICY "teacher_availability_v2_teacher_own" ON teacher_availability_v2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = teacher_availability_v2.teacher_id
      AND teachers.user_id = auth.uid()
      AND teachers.active = TRUE
    )
  );

-- teacher_availability_v2: Admins can manage all availability
CREATE POLICY "teacher_availability_v2_admin_all" ON teacher_availability_v2
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.active = TRUE
    )
  );

-- Enable RLS on assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- assignments: All authenticated users can read
CREATE POLICY "assignments_read_all" ON assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- assignments: Admins can manage all assignments
CREATE POLICY "assignments_admin_all" ON assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.active = TRUE
    )
  );

-- assignments: Teachers can view their own assignments
CREATE POLICY "assignments_teacher_read_own" ON assignments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.id = assignments.teacher_id
      AND teachers.user_id = auth.uid()
      AND teachers.active = TRUE
    )
  );

COMMENT ON POLICY "time_slots_read_all" ON time_slots IS
'全認証ユーザーがコマ情報を読み取り可能';

COMMENT ON POLICY "time_slots_admin_all" ON time_slots IS
'管理者のみがコマ情報を作成・更新・削除可能';

COMMENT ON POLICY "teacher_availability_v2_read_all" ON teacher_availability_v2 IS
'全認証ユーザーが講師空き枠を読み取り可能';

COMMENT ON POLICY "teacher_availability_v2_teacher_own" ON teacher_availability_v2 IS
'講師が自分の空き枠を管理可能';

COMMENT ON POLICY "teacher_availability_v2_admin_all" ON teacher_availability_v2 IS
'管理者が全講師の空き枠を管理可能';

COMMENT ON POLICY "assignments_read_all" ON assignments IS
'全認証ユーザーがアサインメントを読み取り可能';

COMMENT ON POLICY "assignments_admin_all" ON assignments IS
'管理者が全アサインメントを管理可能';

COMMENT ON POLICY "assignments_teacher_read_own" ON assignments IS
'講師が自分のアサインメントを読み取り可能';
