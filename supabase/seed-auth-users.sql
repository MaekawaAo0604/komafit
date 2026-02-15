-- ============================================================================
-- Create Demo Users via Supabase Auth Admin API
-- ============================================================================
-- This script creates demo users using Supabase's built-in auth functions
--
-- Demo Users:
-- 1. Admin: admin@example.com / password123
-- 2. Teacher: teacher@example.com / password123
-- 3. Viewer: viewer@example.com / password123
-- ============================================================================

-- Create admin user
DO $$
DECLARE
  admin_uid UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = admin_uid) THEN
    -- Insert into auth.users with proper password hash
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
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
      admin_uid,
      'authenticated',
      'authenticated',
      'admin@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- Insert identity
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
      admin_uid,
      admin_uid,
      admin_uid,
      format('{"sub":"%s","email":"%s"}', admin_uid, 'admin@example.com')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    -- Insert into public.users
    INSERT INTO public.users (id, email, password_hash, name, role)
    VALUES (admin_uid, 'admin@example.com', crypt('password123', gen_salt('bf')), '管理者ユーザー', 'admin');

    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END $$;

-- Create teacher user
DO $$
DECLARE
  teacher_uid UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = teacher_uid) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
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
      teacher_uid,
      'authenticated',
      'authenticated',
      'teacher@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"teacher"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

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
      teacher_uid,
      teacher_uid,
      teacher_uid,
      format('{"sub":"%s","email":"%s"}', teacher_uid, 'teacher@example.com')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    INSERT INTO public.users (id, email, password_hash, name, role)
    VALUES (teacher_uid, 'teacher@example.com', crypt('password123', gen_salt('bf')), '講師ユーザー', 'teacher');

    RAISE NOTICE 'Teacher user created successfully';
  ELSE
    RAISE NOTICE 'Teacher user already exists';
  END IF;
END $$;

-- Create viewer user
DO $$
DECLARE
  viewer_uid UUID := '33333333-3333-3333-3333-333333333333';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = viewer_uid) THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
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
      viewer_uid,
      'authenticated',
      'authenticated',
      'viewer@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"viewer"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

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
      viewer_uid,
      viewer_uid,
      viewer_uid,
      format('{"sub":"%s","email":"%s"}', viewer_uid, 'viewer@example.com')::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );

    INSERT INTO public.users (id, email, password_hash, name, role)
    VALUES (viewer_uid, 'viewer@example.com', crypt('password123', gen_salt('bf')), '閲覧者ユーザー', 'viewer');

    RAISE NOTICE 'Viewer user created successfully';
  ELSE
    RAISE NOTICE 'Viewer user already exists';
  END IF;
END $$;
