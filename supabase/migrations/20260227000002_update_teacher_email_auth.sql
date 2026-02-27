-- ============================================================================
-- Add update_teacher_email RPC
-- ============================================================================
-- 問題: updateTeacherEmail は public.users のみ更新し、
--       auth.users + auth.identities の email は更新しないため、
--       管理画面でメアドを変更してもログイン用メアドは古いまま。
-- 修正: auth.users, auth.identities, public.users の3箇所を同時に更新するRPCを作成。

CREATE OR REPLACE FUNCTION update_teacher_email(
  p_user_id UUID,
  p_new_email TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- 1. auth.users のメールアドレスを更新
  UPDATE auth.users
  SET email = p_new_email,
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ユーザーが auth.users に見つかりません: %', p_user_id;
  END IF;

  -- 2. auth.identities の identity_data 内メールも更新
  UPDATE auth.identities
  SET identity_data = jsonb_set(identity_data, '{email}', to_jsonb(p_new_email)),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND provider = 'email';

  -- 3. public.users のメールアドレスを更新
  UPDATE users
  SET email = p_new_email,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_teacher_email(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_teacher_email(UUID, TEXT) IS
'管理者用：講師のメールアドレスを更新。auth.users, auth.identities, public.users の3箇所を同時に更新する。';
