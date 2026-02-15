# SQL変更ガイド

このガイドでは、KomaFitのデータベーススキーマやRPC関数を変更する際の手順とベストプラクティスを説明します。

## 目次

1. [マイグレーション作成の基本](#マイグレーション作成の基本)
2. [テーブル変更](#テーブル変更)
3. [RPC関数の変更](#rpc関数の変更)
4. [インデックスの追加](#インデックスの追加)
5. [RLSポリシーの変更](#rlsポリシーの変更)
6. [ドキュメント更新の必須事項](#ドキュメント更新の必須事項)
7. [テスト](#テスト)

---

## マイグレーション作成の基本

### 新しいマイグレーションファイルの作成

```bash
# Supabase CLIを使用
supabase migration new <description>

# 例: 新しいテーブルを追加
supabase migration new add_course_table

# 生成されるファイル名の例:
# supabase/migrations/20260215120000_add_course_table.sql
```

### マイグレーションファイルの構造

```sql
-- ============================================================================
-- <マイグレーションの説明>
-- ============================================================================
-- このマイグレーションでは、XXXを行います。
--
-- 作成されるテーブル/変更される内容:
-- 1. XXX
-- 2. YYY
--
-- 要件: REQ-XX
-- ============================================================================

-- ============================================================================
-- 1. テーブル作成/変更
-- ============================================================================

CREATE TABLE IF NOT EXISTS example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_example_name ON example_table(name);

-- コメント追加
COMMENT ON TABLE example_table IS 'テーブルの説明';
COMMENT ON COLUMN example_table.id IS 'カラムの説明';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- テーブルが存在するか確認
-- SELECT * FROM example_table LIMIT 5;
```

### マイグレーション実行

```bash
# ローカル環境で実行（開発中）
npm run supabase:reset  # 全マイグレーション再実行

# 新しいマイグレーションのみ適用
npm run supabase:migrate

# 本番環境へのデプロイ
supabase db push
```

---

## テーブル変更

### 新しいカラムの追加

```sql
-- ============================================================================
-- Add Column to Students Table
-- ============================================================================

ALTER TABLE students
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- NOT NULL制約を追加する場合は、既存データにデフォルト値を設定
ALTER TABLE students
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT '';

-- その後、NOT NULL制約を追加
ALTER TABLE students
ALTER COLUMN phone SET NOT NULL;

-- コメント追加
COMMENT ON COLUMN students.email IS '生徒のメールアドレス（任意）';
COMMENT ON COLUMN students.phone IS '生徒の電話番号';
```

### カラムの型変更

```sql
-- ============================================================================
-- Change Column Type
-- ============================================================================

-- 既存データを保持しながら型変更
ALTER TABLE students
ALTER COLUMN grade TYPE SMALLINT USING grade::SMALLINT;

-- 文字列の長さ制限を変更
ALTER TABLE teachers
ALTER COLUMN name TYPE VARCHAR(500);
```

### カラムの削除

```sql
-- ============================================================================
-- Remove Column
-- ============================================================================

-- 不要になったカラムを削除
ALTER TABLE students
DROP COLUMN IF EXISTS old_field;

-- 外部キー制約がある場合は先に削除
ALTER TABLE students
DROP CONSTRAINT IF EXISTS fk_old_constraint;

ALTER TABLE students
DROP COLUMN IF EXISTS old_field;
```

### テーブルの削除

```sql
-- ============================================================================
-- Drop Table
-- ============================================================================

-- 依存関係がないことを確認してから削除
DROP TABLE IF EXISTS old_table CASCADE;

-- 注意: CASCADEは関連する外部キー制約も削除する
```

---

## RPC関数の変更

### 既存RPC関数の変更

```sql
-- ============================================================================
-- Update Existing RPC Function
-- ============================================================================

-- 既存の関数を削除（OR REPLACEでも可）
DROP FUNCTION IF EXISTS assign_teacher(VARCHAR, UUID, UUID);

-- 新しい定義で再作成
CREATE OR REPLACE FUNCTION assign_teacher(
    p_slot_id VARCHAR(10),
    p_teacher_id UUID,
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL  -- 新しいパラメータを追加
) RETURNS TABLE(...) AS $$
DECLARE
    -- ...
BEGIN
    -- 新しいロジック
    -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント更新
COMMENT ON FUNCTION assign_teacher(VARCHAR, UUID, UUID, TEXT) IS
'スロットに講師を割り当てる（トランザクション処理、ノート追加対応）';
```

### 新しいRPC関数の追加

```sql
-- ============================================================================
-- Create New RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_teacher_load(
    p_teacher_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE(
    date DATE,
    slot_count INTEGER,
    student_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.date,
        COUNT(DISTINCT a.time_slot_id)::INTEGER AS slot_count,
        COUNT(DISTINCT a.student_id)::INTEGER AS student_count
    FROM assignments a
    WHERE a.teacher_id = p_teacher_id
      AND a.date >= p_start_date
      AND a.date <= p_end_date
    GROUP BY a.date
    ORDER BY a.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 権限付与
GRANT EXECUTE ON FUNCTION get_teacher_load(UUID, DATE, DATE) TO authenticated;

-- コメント追加
COMMENT ON FUNCTION get_teacher_load(UUID, DATE, DATE) IS
'講師の負荷（コマ数・生徒数）を日別で取得';
```

### RPC関数の削除

```sql
-- ============================================================================
-- Drop RPC Function
-- ============================================================================

-- 不要になった関数を削除
DROP FUNCTION IF EXISTS old_function(VARCHAR, UUID);

-- オーバーロードされている場合は、すべてのシグネチャを指定
DROP FUNCTION IF EXISTS old_function(VARCHAR);
DROP FUNCTION IF EXISTS old_function(VARCHAR, UUID);
DROP FUNCTION IF EXISTS old_function(VARCHAR, UUID, BOOLEAN);
```

---

## インデックスの追加

### パフォーマンス改善のためのインデックス

```sql
-- ============================================================================
-- Add Indexes for Performance
-- ============================================================================

-- 単一カラムインデックス
CREATE INDEX IF NOT EXISTS idx_assignments_date
ON assignments(date);

-- 複合インデックス（よく一緒に検索されるカラム）
CREATE INDEX IF NOT EXISTS idx_assignments_date_teacher
ON assignments(date, teacher_id);

-- 部分インデックス（条件付き）
CREATE INDEX IF NOT EXISTS idx_assignments_active
ON assignments(date, teacher_id)
WHERE date >= CURRENT_DATE;

-- JSONB カラムのインデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_payload
ON audit_logs USING GIN (payload);
```

### インデックスの削除

```sql
-- ============================================================================
-- Drop Unused Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_old_index;
```

### インデックスの分析

```sql
-- インデックスの使用状況を確認
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- 使われていないインデックスを見つける
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;
```

---

## RLSポリシーの変更

### 新しいRLSポリシーの追加

```sql
-- ============================================================================
-- Add RLS Policy
-- ============================================================================

-- RLSを有効化（まだの場合）
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- SELECTポリシー: 認証済みユーザーは全て閲覧可能
CREATE POLICY "Authenticated users can view assignments"
ON assignments
FOR SELECT
TO authenticated
USING (true);

-- INSERTポリシー: 管理者のみ作成可能
CREATE POLICY "Only admins can create assignments"
ON assignments
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- UPDATEポリシー: 管理者のみ更新可能
CREATE POLICY "Only admins can update assignments"
ON assignments
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- DELETEポリシー: 管理者のみ削除可能
CREATE POLICY "Only admins can delete assignments"
ON assignments
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);
```

### RLSポリシーの削除

```sql
-- ============================================================================
-- Drop RLS Policy
-- ============================================================================

DROP POLICY IF EXISTS "Old policy name" ON table_name;
```

---

## ドキュメント更新の必須事項

### SQLを変更したら、必ず以下のドキュメントを更新してください

#### 1. schema.md の更新

```markdown
## [変更したテーブル名]

\`\`\`sql
-- 最新のCREATE TABLE文を記載
CREATE TABLE example (
    ...
);
\`\`\`

**新しいカラムの説明:**
- `new_column`: 新しいカラムの説明
```

#### 2. migrations.md の更新

```markdown
### XX. new_migration_name.sql

**作成テーブル/変更内容:**
- `table_name`: XXXを追加

**目的:** XXXを実現するため
```

#### 3. rpc-functions.md の更新（RPC関数を変更した場合）

```markdown
### new_function_name

**用途:** XXX

**シグネチャ:**
\`\`\`sql
new_function_name(...)
\`\`\`

**パラメータ:**
- `p_xxx`: XXXの説明

**使用例:**
\`\`\`typescript
const { data } = await supabase.rpc('new_function_name', {...})
\`\`\`
```

#### 4. TypeScript型定義の更新

```typescript
// src/types/database.ts
export interface Database {
  public: {
    Tables: {
      example_table: {
        Row: {
          id: string
          new_column: string  // 新しいカラムを追加
          created_at: string
        }
        // ...
      }
    }
  }
}

// src/types/entities.ts
export interface ExampleEntity {
  id: string
  newColumn: string  // キャメルケースに変換
  createdAt: string
}
```

---

## テスト

### マイグレーションのテスト手順

```bash
# 1. ローカル環境をリセット
npm run supabase:reset

# 2. 新しいマイグレーションを適用
npm run supabase:migrate

# 3. データベース接続
supabase db connect

# 4. 検証クエリを実行
\d example_table  -- テーブル構造を確認
SELECT * FROM example_table LIMIT 5;

# 5. RPC関数をテスト
SELECT * FROM new_function_name('param1', 'param2');
```

### 自動テスト

```typescript
// tests/database/example.test.ts
import { supabase } from '@/lib/supabase'

describe('Example Table', () => {
  it('should create a new record', async () => {
    const { data, error } = await supabase
      .from('example_table')
      .insert({ name: 'Test' })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data.name).toBe('Test')
  })
})

describe('RPC Functions', () => {
  it('should call new_function_name', async () => {
    const { data, error } = await supabase.rpc('new_function_name', {
      p_param1: 'value1'
    })

    expect(error).toBeNull()
    expect(data).toBeDefined()
  })
})
```

---

## ベストプラクティス

### 1. マイグレーションは小さく保つ

- 1つのマイグレーションで1つの論理的な変更を行う
- 大きな変更は複数のマイグレーションに分割

### 2. ロールバック可能性を考慮

- `IF NOT EXISTS`や`IF EXISTS`を使用
- `DROP CASCADE`は慎重に使用
- データの削除前にバックアップ

### 3. コメントを充実させる

```sql
COMMENT ON TABLE example IS '詳細な説明';
COMMENT ON COLUMN example.field IS 'カラムの意味、制約、例';
```

### 4. トランザクションの境界を意識

```sql
-- Supabaseマイグレーションは自動的にトランザクション内で実行される
-- ただし、明示的に制御することも可能

BEGIN;

-- 変更内容

COMMIT;
```

### 5. パフォーマンスへの影響を考慮

- インデックスは必要な場所にのみ追加
- `CONCURRENTLY`オプションを使用してロックを避ける

```sql
CREATE INDEX CONCURRENTLY idx_example ON example_table(column);
```

### 6. セキュリティを常に考慮

- RLSポリシーを適切に設定
- RPC関数内で権限チェックを実装
- `SECURITY DEFINER`の使用は慎重に

---

## チェックリスト

SQL変更時のチェックリスト:

- [ ] マイグレーションファイルを作成した
- [ ] マイグレーションにコメントを記載した
- [ ] ローカル環境でテストした
- [ ] `schema.md`を更新した
- [ ] `migrations.md`を更新した
- [ ] `rpc-functions.md`を更新した（RPC関数変更の場合）
- [ ] TypeScript型定義を更新した
- [ ] 自動テストを追加/更新した
- [ ] パフォーマンスへの影響を確認した
- [ ] RLSポリシーを確認した
- [ ] インデックスが適切か確認した

---

## 参考

- [データベーススキーマ](./schema.md)
- [マイグレーションリファレンス](./migrations.md)
- [RPC関数リファレンス](./rpc-functions.md)
- [Supabase公式ドキュメント](https://supabase.com/docs)
