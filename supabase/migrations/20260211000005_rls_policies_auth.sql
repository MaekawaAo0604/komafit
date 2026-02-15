-- ============================================================================
-- Row Level Security (RLS) Policies - Authentication & Authorization
-- ============================================================================
-- このマイグレーションでは、認証・認可に関するRLSポリシーを作成します。
--
-- 対象テーブル:
-- 1. users: 管理者は全権限、ユーザーは自分のデータのみ読取可能
-- 2. teachers: 管理者は全権限、認証済みユーザーは読取可能
-- 3. teacher_skills: 管理者は全権限、認証済みユーザーは読取可能
-- 4. teacher_availability: 講師は自分のデータのみ編集可能、管理者は全権限
--
-- 要件: REQ-1（ロール・権限管理）
-- ============================================================================

-- ============================================================================
-- Helper Function: Get User Role from JWT
-- ============================================================================
-- JWTからユーザーのロールを取得するヘルパー関数

CREATE OR REPLACE FUNCTION public.user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    (SELECT role FROM users WHERE id = auth.uid())
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.user_role() IS 'JWTまたはusersテーブルからユーザーのロールを取得';

-- ============================================================================
-- Enable RLS on Tables
-- ============================================================================
-- 全テーブルに対してRow Level Securityを有効化

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Users Table Policies
-- ============================================================================
-- 管理者: 全権限
-- ユーザー: 自分のデータのみ読取可能

-- Admin: Full access
CREATE POLICY "users_admin_all"
ON users
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Users: Read own data
CREATE POLICY "users_read_own"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

COMMENT ON POLICY "users_admin_all" ON users IS '管理者は全ユーザーの全操作が可能';
COMMENT ON POLICY "users_read_own" ON users IS 'ユーザーは自分のデータのみ読取可能';

-- ============================================================================
-- Teachers Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "teachers_admin_all"
ON teachers
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "teachers_read_authenticated"
ON teachers
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "teachers_admin_all" ON teachers IS '管理者は全講師の全操作が可能';
COMMENT ON POLICY "teachers_read_authenticated" ON teachers IS '認証済みユーザーは全講師を読取可能';

-- ============================================================================
-- Teacher Skills Table Policies
-- ============================================================================
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "teacher_skills_admin_all"
ON teacher_skills
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "teacher_skills_read_authenticated"
ON teacher_skills
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "teacher_skills_admin_all" ON teacher_skills IS '管理者は全スキルの全操作が可能';
COMMENT ON POLICY "teacher_skills_read_authenticated" ON teacher_skills IS '認証済みユーザーは全スキルを読取可能';

-- ============================================================================
-- Teacher Availability Table Policies
-- ============================================================================
-- 講師: 自分のデータのみ編集可能
-- 管理者: 全権限
-- 認証済みユーザー: 読取可能

-- Admin: Full access
CREATE POLICY "teacher_availability_admin_all"
ON teacher_availability
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Teachers: Manage own availability
CREATE POLICY "teacher_availability_teacher_own"
ON teacher_availability
FOR ALL
TO authenticated
USING (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  teacher_id IN (
    SELECT id FROM teachers WHERE user_id = auth.uid()
  )
);

-- Authenticated: Read access
CREATE POLICY "teacher_availability_read_authenticated"
ON teacher_availability
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

COMMENT ON POLICY "teacher_availability_admin_all" ON teacher_availability IS '管理者は全空き枠の全操作が可能';
COMMENT ON POLICY "teacher_availability_teacher_own" ON teacher_availability IS '講師は自分の空き枠のみ編集可能';
COMMENT ON POLICY "teacher_availability_read_authenticated" ON teacher_availability IS '認証済みユーザーは全空き枠を読取可能';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- RLSが有効化されているか確認
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('users', 'teachers', 'teacher_skills', 'teacher_availability');

-- ポリシー一覧を確認
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
