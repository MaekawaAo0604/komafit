-- ============================================================================
-- Seed Data - Demo Users and Initial Data
-- ============================================================================
-- このシードファイルでは、開発・テスト用のデモデータを投入します。
--
-- デモユーザー:
-- 1. 管理者: admin@example.com / password123
-- 2. 講師: teacher@example.com / password123
-- 3. 閲覧者: viewer@example.com / password123
--
-- ============================================================================

-- ============================================================================
-- Create Demo Users in Supabase Auth
-- ============================================================================

-- Admin User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@komafit.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Teacher User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000002',
  'authenticated',
  'authenticated',
  'teacher1@komafit.local',
  crypt('teacher123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"teacher"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Viewer User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '33333333-3333-3333-3333-333333333333',
  'authenticated',
  'authenticated',
  'viewer@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"viewer"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- Create identities for email login
INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@komafit.local"}',
  'email',
  NOW(),
  NOW(),
  NOW()
), (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"teacher1@komafit.local"}',
  'email',
  NOW(),
  NOW(),
  NOW()
), (
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333',
  '{"sub":"33333333-3333-3333-3333-333333333333","email":"viewer@example.com"}',
  'email',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create Users in Public Schema
-- ============================================================================

INSERT INTO public.users (id, email, password_hash, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@komafit.local', NULL, '管理者', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'teacher1@komafit.local', NULL, '講師A', 'teacher'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@example.com', NULL, '閲覧者ユーザー', 'viewer')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create Demo Teachers
-- ============================================================================
-- Note: Using UUIDs starting with '44444444', '55555555', etc. for teachers

INSERT INTO public.teachers (id, user_id, name, cap_week_slots, cap_students, allow_pair, active) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '講師A', 10, 5, TRUE, TRUE),
  ('55555555-5555-5555-5555-555555555555', NULL, '佐藤花子', 15, 4, TRUE, TRUE),
  ('66666666-6666-6666-6666-666666666666', NULL, '鈴木次郎', 25, 6, FALSE, TRUE),
  ('77777777-7777-7777-7777-777777777777', NULL, '田中美咲', 20, 5, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create Teacher Skills
-- ============================================================================
-- Grade ranges: Elementary 1-6, Middle 7-9, High 10-12

INSERT INTO public.teacher_skills (teacher_id, subject, grade_min, grade_max) VALUES
  ('10000000-0000-0000-0000-000000000001', '数学', 1, 6),
  ('10000000-0000-0000-0000-000000000001', '英語', 3, 6),
  ('55555555-5555-5555-5555-555555555555', '英語', 7, 12),
  ('66666666-6666-6666-6666-666666666666', '国語', 7, 12),
  ('77777777-7777-7777-7777-777777777777', '理科', 7, 12)
ON CONFLICT (teacher_id, subject) DO NOTHING;

-- ============================================================================
-- Create Demo Students
-- ============================================================================
-- Using UUIDs starting with 'a1111111', 'a2222222', etc.

-- Grade numbers: 1-6 elementary, 7-9 middle, 10-12 high
INSERT INTO public.students (id, name, grade) VALUES
  ('a1111111-1111-1111-1111-111111111111', '高橋一郎', 8),  -- middle_2
  ('a2222222-2222-2222-2222-222222222222', '伊藤二郎', 9),  -- middle_3
  ('a3333333-3333-3333-3333-333333333333', '渡辺三郎', 10), -- high_1
  ('a4444444-4444-4444-4444-444444444444', '中村四郎', 11), -- high_2
  ('a5555555-5555-5555-5555-555555555555', '小林五郎', 12), -- high_3
  ('a6666666-6666-6666-6666-666666666666', '加藤陽子', 7),  -- middle_1
  ('a7777777-7777-7777-7777-777777777777', '吉田春子', 8),  -- middle_2
  ('a8888888-8888-8888-8888-888888888888', '山本夏美', 9)   -- middle_3
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Create Student Subjects
-- ============================================================================

INSERT INTO public.student_subjects (student_id, subject) VALUES
  ('a1111111-1111-1111-1111-111111111111', '数学'),
  ('a1111111-1111-1111-1111-111111111111', '英語'),
  ('a2222222-2222-2222-2222-222222222222', '数学'),
  ('a2222222-2222-2222-2222-222222222222', '国語'),
  ('a3333333-3333-3333-3333-333333333333', '数学'),
  ('a3333333-3333-3333-3333-333333333333', '英語'),
  ('a3333333-3333-3333-3333-333333333333', '理科'),
  ('a4444444-4444-4444-4444-444444444444', '数学'),
  ('a4444444-4444-4444-4444-444444444444', '英語'),
  ('a5555555-5555-5555-5555-555555555555', '数学'),
  ('a5555555-5555-5555-5555-555555555555', '物理'),
  ('a6666666-6666-6666-6666-666666666666', '算数'),
  ('a6666666-6666-6666-6666-666666666666', '英語'),
  ('a7777777-7777-7777-7777-777777777777', '数学'),
  ('a7777777-7777-7777-7777-777777777777', '英語'),
  ('a8888888-8888-8888-8888-888888888888', '数学'),
  ('a8888888-8888-8888-8888-888888888888', '国語')
ON CONFLICT (student_id, subject) DO NOTHING;

-- ============================================================================
-- Create Sample Slots
-- ============================================================================
-- 月曜〜金曜、5コマ('0', '1', 'A', 'B', 'C')のスロットを作成

DO $$
DECLARE
  days TEXT[] := ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI'];
  koma_codes TEXT[] := ARRAY['0', '1', 'A', 'B', 'C'];
  day_code TEXT;
  koma_code TEXT;
  slot_id TEXT;
BEGIN
  FOREACH day_code IN ARRAY days LOOP
    FOREACH koma_code IN ARRAY koma_codes LOOP
      slot_id := day_code || '-' || koma_code;
      INSERT INTO public.slots (id, day, koma_code)
      VALUES (slot_id, day_code, koma_code)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Create Teacher Availability (V2 - Date-based)
-- ============================================================================
-- 今週の全ての日付・時間枠に対して、講師の空き枠を設定

DO $$
DECLARE
  teacher_rec RECORD;
  time_slot_rec RECORD;
  day_offset INT;
  target_date DATE;
  monday DATE;
BEGIN
  -- 今週の月曜日を計算
  monday := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INT + 6) % 7);

  FOR teacher_rec IN SELECT id FROM public.teachers LOOP
    FOR time_slot_rec IN SELECT id FROM public.time_slots WHERE is_active = TRUE LOOP
      -- 月〜金（5日分）の空き枠を作成
      FOR day_offset IN 0..4 LOOP
        target_date := monday + day_offset;

        -- 約80%の確率で空き枠として登録
        IF random() < 0.8 THEN
          INSERT INTO public.teacher_availability_v2 (teacher_id, date, time_slot_id, is_available)
          VALUES (teacher_rec.id, target_date, time_slot_rec.id, TRUE)
          ON CONFLICT (teacher_id, date, time_slot_id) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Settings
-- ============================================================================
-- Note: Settings table is a singleton and is already initialized in migration
-- No additional seed data needed

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Users created:' as message, COUNT(*) as count FROM public.users;
SELECT 'Teachers created:' as message, COUNT(*) as count FROM public.teachers;
SELECT 'Students created:' as message, COUNT(*) as count FROM public.students;
SELECT 'Slots created:' as message, COUNT(*) as count FROM public.slots;
SELECT 'Teacher availability (V2) created:' as message, COUNT(*) as count FROM public.teacher_availability_v2;
