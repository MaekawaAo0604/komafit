-- assignment_exceptions テーブルのRLSポリシー設定
-- パターンのRLSと同じロジック（recurring_assignmentsを通じて権限チェック）

-- 1. RLSを有効化
ALTER TABLE assignment_exceptions ENABLE ROW LEVEL SECURITY;

-- 2. SELECT ポリシー: パターンの所有者、管理者、viewerが閲覧可能
CREATE POLICY assignment_exceptions_select_policy
ON assignment_exceptions
FOR SELECT
TO authenticated
USING (
  -- 管理者とviewerは全件閲覧可能
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'viewer')
  )
  OR
  -- パターンの所有者（講師）は自分のパターンの例外のみ閲覧可能
  EXISTS (
    SELECT 1
    FROM recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    WHERE ra.id = assignment_exceptions.pattern_id
      AND t.user_id = auth.uid()
  )
);

-- 3. INSERT ポリシー: パターンの所有者または管理者のみ
CREATE POLICY assignment_exceptions_insert_policy
ON assignment_exceptions
FOR INSERT
TO authenticated
WITH CHECK (
  -- 管理者は全件挿入可能
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
  OR
  -- パターンの所有者（講師）は自分のパターンの例外のみ挿入可能
  EXISTS (
    SELECT 1
    FROM recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    WHERE ra.id = assignment_exceptions.pattern_id
      AND t.user_id = auth.uid()
  )
);

-- 4. UPDATE ポリシー: パターンの所有者または管理者のみ
-- （現在のスキーマでは例外の更新は想定していないが、将来的な拡張のために設定）
CREATE POLICY assignment_exceptions_update_policy
ON assignment_exceptions
FOR UPDATE
TO authenticated
USING (
  -- 管理者は全件更新可能
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
  OR
  -- パターンの所有者（講師）は自分のパターンの例外のみ更新可能
  EXISTS (
    SELECT 1
    FROM recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    WHERE ra.id = assignment_exceptions.pattern_id
      AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  -- 更新後も同じ条件を満たす必要がある
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    WHERE ra.id = assignment_exceptions.pattern_id
      AND t.user_id = auth.uid()
  )
);

-- 5. DELETE ポリシー: パターンの所有者または管理者のみ
CREATE POLICY assignment_exceptions_delete_policy
ON assignment_exceptions
FOR DELETE
TO authenticated
USING (
  -- 管理者は全件削除可能
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
      AND users.role = 'admin'
  )
  OR
  -- パターンの所有者（講師）は自分のパターンの例外のみ削除可能
  EXISTS (
    SELECT 1
    FROM recurring_assignments ra
    INNER JOIN teachers t ON ra.teacher_id = t.id
    WHERE ra.id = assignment_exceptions.pattern_id
      AND t.user_id = auth.uid()
  )
);

-- ポリシーのコメント
COMMENT ON POLICY assignment_exceptions_select_policy ON assignment_exceptions IS '管理者・viewerは全件閲覧可能、講師は自分のパターンの例外のみ閲覧可能';
COMMENT ON POLICY assignment_exceptions_insert_policy ON assignment_exceptions IS '管理者は全件挿入可能、講師は自分のパターンの例外のみ挿入可能';
COMMENT ON POLICY assignment_exceptions_update_policy ON assignment_exceptions IS '管理者は全件更新可能、講師は自分のパターンの例外のみ更新可能';
COMMENT ON POLICY assignment_exceptions_delete_policy ON assignment_exceptions IS '管理者は全件削除可能、講師は自分のパターンの例外のみ削除可能';
