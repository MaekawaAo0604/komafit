-- ============================================================================
-- Fix create_teacher_user to register in Supabase Auth
-- + Add reset_teacher_password RPC
-- ============================================================================
-- 問題: 既存の create_teacher_user は public.users にのみ INSERT し、
--       auth.users には何も登録しないため、発行されたパスワードでログインできない。
-- 修正: auth.users + auth.identities にも INSERT するように変更。
-- 追加: reset_teacher_password RPC でパスワード再発行を Auth に反映。

-- ============================================================================
-- 1. create_teacher_user を書き換え
-- ============================================================================
CREATE OR REPLACE FUNCTION create_teacher_user(
  p_email TEXT,
  p_name TEXT,
  p_password TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. public.users にレコード作成
  INSERT INTO users (email, password_hash, name, role, active)
  VALUES (
    p_email,
    COALESCE(crypt(p_password, gen_salt('bf')), ''),
    p_name,
    'teacher',
    TRUE
  )
  RETURNING id INTO v_user_id;

  -- 2. auth.users にレコード作成（実際のログイン用）
  IF p_password IS NOT NULL THEN
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
      v_user_id,
      'authenticated',
      'authenticated',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      format('{"name":"%s","role":"teacher"}', p_name)::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    -- 3. auth.identities にレコード作成（email provider）
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
      v_user_id,
      v_user_id::text,
      v_user_id,
      format('{"sub":"%s","email":"%s"}', v_user_id, p_email)::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. reset_teacher_password RPC 新規作成
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_teacher_password(
  p_user_id UUID,
  p_new_password TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- auth.users のパスワードを更新
  UPDATE auth.users
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが auth.users に見つかりません: %', p_user_id;
  END IF;

  -- public.users の password_hash も更新
  UPDATE users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reset_teacher_password(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION reset_teacher_password(UUID, TEXT) IS
'管理者用：講師のパスワードを再発行。auth.users と public.users の両方を更新する。';
