-- recurring_assignments テーブルのRLSポリシー設定
-- 講師は自分のパターンのみ閲覧・編集可能、管理者は全件、viewerは全件閲覧のみ

-- 1. RLSを有効化
ALTER TABLE recurring_assignments ENABLE ROW LEVEL SECURITY;

-- 2. SELECT ポリシー: 管理者・viewerは全件、講師は自分のパターンのみ閲覧可能
CREATE POLICY recurring_assignments_select_policy
ON recurring_assignments
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
  -- 講師は自分のパターンのみ閲覧可能
  EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = recurring_assignments.teacher_id
      AND teachers.user_id = auth.uid()
  )
);

-- 3. INSERT ポリシー: 管理者と講師のみ可能、講師は自分のteacher_idのみ
CREATE POLICY recurring_assignments_insert_policy
ON recurring_assignments
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
  -- 講師は自分のteacher_idのみ挿入可能
  EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = recurring_assignments.teacher_id
      AND teachers.user_id = auth.uid()
  )
);

-- 4. UPDATE ポリシー: 管理者は全件、講師は自分のパターンのみ更新可能
CREATE POLICY recurring_assignments_update_policy
ON recurring_assignments
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
  -- 講師は自分のパターンのみ更新可能
  EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = recurring_assignments.teacher_id
      AND teachers.user_id = auth.uid()
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
    SELECT 1 FROM teachers
    WHERE teachers.id = recurring_assignments.teacher_id
      AND teachers.user_id = auth.uid()
  )
);

-- 5. DELETE ポリシー: 管理者は全件、講師は自分のパターンのみ削除可能
CREATE POLICY recurring_assignments_delete_policy
ON recurring_assignments
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
  -- 講師は自分のパターンのみ削除可能
  EXISTS (
    SELECT 1 FROM teachers
    WHERE teachers.id = recurring_assignments.teacher_id
      AND teachers.user_id = auth.uid()
  )
);

-- ポリシーのコメント
COMMENT ON POLICY recurring_assignments_select_policy ON recurring_assignments IS '管理者・viewerは全件閲覧可能、講師は自分のパターンのみ閲覧可能';
COMMENT ON POLICY recurring_assignments_insert_policy ON recurring_assignments IS '管理者は全件挿入可能、講師は自分のteacher_idのみ挿入可能';
COMMENT ON POLICY recurring_assignments_update_policy ON recurring_assignments IS '管理者は全件更新可能、講師は自分のパターンのみ更新可能';
COMMENT ON POLICY recurring_assignments_delete_policy ON recurring_assignments IS '管理者は全件削除可能、講師は自分のパターンのみ削除可能';
