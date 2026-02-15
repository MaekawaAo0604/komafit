-- ============================================================================
-- Row Level Security (RLS) Policies - Data Operations
-- ============================================================================
-- このマイグレーションでは、データ操作に関するRLSポリシーを作成します。
--
-- 対象テーブル:
-- 1. students: 管理者は全権限、認証済みユーザーは読取可能
-- 2. student_subjects: 管理者は全権限、認証済みユーザーは読取可能
-- 3. student_ng: 管理者は全権限、認証済みユーザーは読取可能
-- 4. slots: 管理者は全権限、認証済みユーザーは読取可能
-- 5. slot_students: 管理者は全権限、認証済みユーザーは読取可能
-- 6. slot_teacher: 管理者は全権限、認証済みユーザーは読取可能
-- 7. audit_logs: 管理者は読取可能、認証済みユーザーは挿入可能
-- 8. settings: 管理者は全権限、認証済みユーザーは読取可能
-- 9. koma_master: 全ユーザーが読取可能（認証不要）
--
-- 要件: REQ-1（ロール・権限管理）
-- ============================================================================

-- ============================================================================
-- Enable RLS on Tables
-- ============================================================================
-- 全テーブルに対してRow Level Securityを有効化

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ng ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE koma_master ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Students Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "students_admin_all"
ON students
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "students_read_authenticated"
ON students
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "students_admin_all" ON students IS '管理者は全生徒の全操作が可能';
COMMENT ON POLICY "students_read_authenticated" ON students IS '認証済みユーザーは全生徒を読取可能';

-- ============================================================================
-- Student Subjects Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "student_subjects_admin_all"
ON student_subjects
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "student_subjects_read_authenticated"
ON student_subjects
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "student_subjects_admin_all" ON student_subjects IS '管理者は全教科情報の全操作が可能';
COMMENT ON POLICY "student_subjects_read_authenticated" ON student_subjects IS '認証済みユーザーは全教科情報を読取可能';

-- ============================================================================
-- Student NG Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "student_ng_admin_all"
ON student_ng
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "student_ng_read_authenticated"
ON student_ng
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "student_ng_admin_all" ON student_ng IS '管理者は全NG講師情報の全操作が可能';
COMMENT ON POLICY "student_ng_read_authenticated" ON student_ng IS '認証済みユーザーは全NG講師情報を読取可能';

-- ============================================================================
-- Slots Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "slots_admin_all"
ON slots
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "slots_read_authenticated"
ON slots
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "slots_admin_all" ON slots IS '管理者は全スロットの全操作が可能';
COMMENT ON POLICY "slots_read_authenticated" ON slots IS '認証済みユーザーは全スロットを読取可能';

-- ============================================================================
-- Slot Students Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "slot_students_admin_all"
ON slot_students
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "slot_students_read_authenticated"
ON slot_students
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "slot_students_admin_all" ON slot_students IS '管理者は全スロット生徒配置の全操作が可能';
COMMENT ON POLICY "slot_students_read_authenticated" ON slot_students IS '認証済みユーザーは全スロット生徒配置を読取可能';

-- ============================================================================
-- Slot Teacher Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "slot_teacher_admin_all"
ON slot_teacher
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "slot_teacher_read_authenticated"
ON slot_teacher
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "slot_teacher_admin_all" ON slot_teacher IS '管理者は全講師割当の全操作が可能';
COMMENT ON POLICY "slot_teacher_read_authenticated" ON slot_teacher IS '認証済みユーザーは全講師割当を読取可能';

-- ============================================================================
-- Audit Logs Table Policies
-- ============================================================================
-- 管理者: 読取可能
-- 認証済みユーザー: 挿入可能（システムログ記録用）

-- Admin: Read access
CREATE POLICY "audit_logs_admin_read"
ON audit_logs
FOR SELECT
TO authenticated
USING (public.user_role() = 'admin');

-- Authenticated: Insert access (for system logging)
CREATE POLICY "audit_logs_insert_authenticated"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

COMMENT ON POLICY "audit_logs_admin_read" ON audit_logs IS '管理者は全ログを読取可能';
COMMENT ON POLICY "audit_logs_insert_authenticated" ON audit_logs IS '認証済みユーザーは自分のアクションを記録可能';

-- ============================================================================
-- Settings Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "settings_admin_all"
ON settings
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "settings_read_authenticated"
ON settings
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "settings_admin_all" ON settings IS '管理者は設定の全操作が可能';
COMMENT ON POLICY "settings_read_authenticated" ON settings IS '認証済みユーザーは設定を読取可能';

-- ============================================================================
-- Koma Master Table Policies
-- ============================================================================
-- 全ユーザー: 読取可能（認証不要）

-- Public: Read access (unauthenticated users can read)
CREATE POLICY "koma_master_public_read"
ON koma_master
FOR SELECT
TO public
USING (true);

COMMENT ON POLICY "koma_master_public_read" ON koma_master IS '全ユーザー（認証不要）がコママスタを読取可能';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- RLSが有効化されているか確認
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   'students', 'student_subjects', 'student_ng',
--   'slots', 'slot_students', 'slot_teacher',
--   'audit_logs', 'settings', 'koma_master'
-- );

-- ポリシー一覧を確認
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN (
--   'students', 'student_subjects', 'student_ng',
--   'slots', 'slot_students', 'slot_teacher',
--   'audit_logs', 'settings', 'koma_master'
-- )
-- ORDER BY tablename, policyname;
