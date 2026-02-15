-- ============================================================================
-- Make password_hash Column Nullable
-- ============================================================================
-- Allow users table records to be created without password_hash.
-- This is necessary because teacher user accounts are created via RPC,
-- and actual Supabase Auth provisioning is done separately via Dashboard or Admin API.

ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

COMMENT ON COLUMN users.password_hash IS
'パスワードハッシュ（オプション）。Supabase Auth経由でアカウント作成された場合のみ使用される。';
