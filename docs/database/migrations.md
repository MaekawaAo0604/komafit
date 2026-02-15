# マイグレーションファイルリファレンス

KomaFitシステムのデータベースマイグレーション履歴

## マイグレーション実行方法

```bash
# ローカルSupabaseリセット（全マイグレーション再実行）
npm run supabase:reset

# 最新マイグレーションのみ適用
npm run supabase:migrate
```

## マイグレーション一覧

### 基礎構造（初期セットアップ）

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000001_initial_schema.sql` | 1 | コママスタ、設定テーブル | REQ-2, REQ-17 |
| `20260211000002_users_teachers.sql` | 2 | ユーザー、講師、スキルテーブル | REQ-1, REQ-3 |
| `20260211000003_students_slots.sql` | 3 | 生徒、スロット、空き枠テーブル | REQ-4, REQ-5, REQ-6 |
| `20260211000004_audit_logs.sql` | 4 | 監査ログテーブル | REQ-18 |
| `20260211000013_audit_triggers.sql` | 13 | 監査ログトリガー | REQ-18 |

### RLS（Row Level Security）

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000005_rls_policies_auth.sql` | 5 | RLS: users, teachers | REQ-1 |
| `20260211000006_rls_policies_data.sql` | 6 | RLS: 生徒、スロット、設定 | REQ-1 |
| `20260211000020_rls_date_based_tables.sql` | 20 | RLS: V2テーブル | REQ-1 |

### RPC関数（レガシーシステム）

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000007_rpc_assign_teacher.sql` | 7 | 講師割当関数 | REQ-10 |
| `20260211000008_rpc_change_unassign.sql` | 8 | 講師変更・解除関数 | REQ-11 |
| `20260211000010_rpc_position_support.sql` | 10 | ポジション対応（1対2） | REQ-14 |
| `20260211000011_rpc_assign_student.sql` | 11 | 生徒アサイン関数 | REQ-12 |
| `20260211000012_rpc_undo_assignment.sql` | 12 | アサイン取消関数 | REQ-13 |

### 機能拡張（複数講師対応）

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000009_multiple_teachers_per_slot.sql` | 9 | 1スロット複数講師対応 | REQ-14 |

### V2システム（日付ベース）

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000014_date_based_scheduling.sql` | 14 | V2テーブル作成 | REQ-V2-1 |
| `20260211000015_rpc_date_based_functions.sql` | 15 | V2 RPC関数 | REQ-V2-2 |
| `20260211000016_fix_calendar_function.sql` | 16 | カレンダー関数修正 | REQ-V2-2 |
| `20260211000017_add_timeslot_0.sql` | 17 | コマ0追加 | REQ-V2-3 |

### 定期授業パターンシステム

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260214183500_create_recurring_assignments.sql` | 24 | 定期パターンテーブル作成 | REQ-RECUR-1 |
| `20260214183700_create_recurring_assignment_rpc.sql` | 25 | パターン作成RPC | REQ-RECUR-2 |
| `20260214183800_update_recurring_assignment_rpc.sql` | 26 | パターン更新RPC | REQ-RECUR-3 |
| `20260214183900_delete_recurring_assignment_rpc.sql` | 27 | パターン削除RPC | REQ-RECUR-4 |
| `20260214184000_list_recurring_assignments_rpc.sql` | 28 | パターン一覧RPC | REQ-RECUR-5 |
| `20260214184400_recurring_assignments_rls_policies.sql` | 29 | 定期パターンRLS | REQ-RECUR-6 |

### ユーザー管理

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211000019_create_teacher_user_rpc.sql` | 19 | 講師ユーザー作成RPC | REQ-19 |
| `20260211000021_make_password_hash_nullable.sql` | 21 | パスワードNULLABLE化 | REQ-20 |

### 最適化

| ファイル名 | 実行順 | 内容 | 関連要件 |
|-----------|-------|------|---------|
| `20260211100000_auto_create_availability_on_assign.sql` | 22 | 空き枠自動作成 | OPT-1 |
| `20260211110000_batch_availability_operations.sql` | 23 | 空き枠一括操作 | OPT-2 |

## マイグレーション詳細

### 1. initial_schema.sql

**作成テーブル:**
- `koma_master`: コマ定義（0, 1, A, B, C）
- `settings`: システム設定

**初期データ:**
```sql
-- コママスタ
INSERT INTO koma_master (code, koma_order) VALUES
    ('0', 0), ('1', 1), ('A', 2), ('B', 3), ('C', 4);

-- 設定
INSERT INTO settings (id, load_weight, continuity_weight, grade_diff_weight,
                      pair_same_subject_required, pair_max_grade_diff)
VALUES (1, 1.0, 0.5, 0.3, TRUE, 2);
```

### 2. users_teachers.sql

**作成テーブル:**
- `users`: ユーザー認証
- `teachers`: 講師マスタ
- `teacher_skills`: 講師スキル

**テストデータ:**
```sql
-- 管理者ユーザー
email: admin@komafit.local
password: admin123

-- 講師ユーザー
email: teacher1@komafit.local
password: teacher123
```

### 3. students_slots.sql

**作成テーブル:**
- `students`: 生徒マスタ
- `student_subjects`: 受講科目
- `student_ng`: NG講師リスト
- `slots`: 授業枠（35スロット = 7日 × 5コマ）
- `slot_students`: 生徒配置
- `slot_teacher`: 講師割当
- `teacher_availability`: 講師空き枠

**スロット生成:**
- MON-0, MON-1, MON-A, MON-B, MON-C
- TUE-0, TUE-1, TUE-A, TUE-B, TUE-C
- ... (全35スロット)

### 4. audit_logs.sql

**作成テーブル:**
- `audit_logs`: 全操作の監査ログ

**記録される情報:**
- `actor_id`: 操作実行ユーザー
- `action`: 操作種別（ASSIGN, UNASSIGN, etc.）
- `payload`: JSON形式の詳細データ
- `created_at`: 操作日時

### 7. rpc_assign_teacher.sql

**RPC関数:**
```sql
assign_teacher(p_slot_id, p_teacher_id, p_assigned_by)
```

**処理内容:**
1. `slot_teacher`にINSERT/UPDATE
2. `teacher_availability`を更新（is_available = FALSE）
3. `audit_logs`に記録

### 8. rpc_change_unassign.sql

**RPC関数:**
```sql
change_teacher(p_slot_id, p_new_teacher_id, p_assigned_by)
unassign_teacher(p_slot_id, p_assigned_by)
```

**処理内容:**
- `change_teacher`: 既存講師の空き枠を復元 → 新講師を割当
- `unassign_teacher`: 講師割当を解除 → 空き枠を復元

### 9. multiple_teachers_per_slot.sql

**テーブル変更:**
- `slot_teacher`にPOSITIONカラム追加
- PRIMARY KEY変更: `(slot_id)` → `(slot_id, position)`

**目的:** 1スロットに複数講師を配置可能にする（1対2指導対応）

### 14. date_based_scheduling.sql

**V2システムの導入:**

**作成テーブル:**
- `time_slots`: 時間帯マスタ
- `teacher_availability_v2`: 日付ベース空き枠
- `assignments`: 日付ベース生徒アサイン

**students拡張:**
- `requires_one_on_one`: 1対1必須フラグ
- `lesson_label`: 表示ラベル

### 15. rpc_date_based_functions.sql

**V2 RPC関数:**
```sql
set_teacher_availability_v2(teacher_id, date, time_slot_id, is_available)
assign_student_v2(date, time_slot_id, teacher_id, student_id, subject, position)
unassign_student_v2(assignment_id)
get_monthly_calendar(year, month)
```

**制約チェック:**
- 講師の1対2可否
- 生徒の1対1必須
- 講師の空き状況

### 19. create_teacher_user_rpc.sql

**RPC関数:**
```sql
create_teacher_user(email, name, password, teacher_data)
```

**処理内容:**
1. `users`テーブルにユーザー作成（role='teacher'）
2. `teachers`テーブルに講師データ作成
3. `teacher_skills`に教科・学年範囲登録
4. トランザクション内で一貫性保証

### 21. make_password_hash_nullable.sql

**変更内容:**
```sql
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
```

**理由:** 外部認証（Supabase Auth）を使う場合、password_hashは不要

### 22. auto_create_availability_on_assign.sql

**最適化内容:**
- 講師割当時に空き枠レコードが存在しない場合、自動作成
- 手動で空き枠を事前登録する必要がなくなる

### 23. batch_availability_operations.sql

**RPC関数:**
```sql
batch_set_teacher_availability(teacher_id, date_range, time_slot_ids, is_available)
```

**最適化内容:**
- 複数の空き枠を一括で設定可能
- 例: 1週間分の空き枠を1回のRPC呼び出しで登録

## データシード

### seed.sql

本番環境用の初期データを投入するスクリプト

### seed-auth-users.sql

Supabase Authユーザーのシードデータ

## マイグレーション作成時の注意事項

### 命名規則

```
YYYYMMDDHHMMSS_description.sql
```

例: `20260211000001_initial_schema.sql`

### トランザクション

マイグレーションは自動的にトランザクション内で実行されます。

### ロールバック

```bash
# マイグレーションのロールバックは非推奨
# 代わりに新しいマイグレーションで修正を適用
```

### テスト

```bash
# ローカル環境でテスト
npm run supabase:reset

# マイグレーション適用確認
SELECT * FROM migrations;
```

## 参考

- [データベーススキーマ](./schema.md)
- [RPC関数リファレンス](./rpc-functions.md)
- [SQL変更ガイド](./sql-modification-guide.md)
