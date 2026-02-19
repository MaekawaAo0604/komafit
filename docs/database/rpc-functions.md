# RPC関数リファレンス

KomaFitシステムのデータベースRPC関数一覧

## 目次

1. [レガシーシステム（曜日ベース）](#レガシーシステム曜日ベース)
2. [V2システム（日付ベース）](#v2システム日付ベース)
3. [ユーザー管理](#ユーザー管理)
4. [最適化関数](#最適化関数)
5. [ヘルパー関数（双方向同期）](#ヘルパー関数双方向同期)

## レガシーシステム（曜日ベース）

### assign_teacher

**用途:** スロットに講師を割り当てる

**シグネチャ:**
```sql
assign_teacher(
    p_slot_id VARCHAR(10),
    p_teacher_id UUID,
    p_assigned_by UUID
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_slot_id`: スロットID（例: `MON-0`, `TUE-A`）
- `p_teacher_id`: 講師ID
- `p_assigned_by`: 割当実行ユーザーID

**処理内容:**
1. `slot_teacher`テーブルに講師を割当（INSERT or UPDATE）
2. `teacher_availability`の`is_available`をFALSEに更新
3. `audit_logs`にACTION='ASSIGN'として記録

**戻り値:**
```sql
{
  slot_id: VARCHAR(10),
  teacher_id: UUID,
  assigned_by: UUID,
  assigned_at: TIMESTAMP
}
```

**使用例:**
```typescript
const { data, error } = await supabase.rpc('assign_teacher', {
  p_slot_id: 'MON-A',
  p_teacher_id: '10000000-0000-0000-0000-000000000001',
  p_assigned_by: userId
})
```

**エラー条件:**
- スロットIDが存在しない
- 講師IDが存在しない
- ユーザーIDが存在しない

---

### change_teacher

**用途:** スロットの講師を変更する

**シグネチャ:**
```sql
change_teacher(
    p_slot_id VARCHAR(10),
    p_new_teacher_id UUID,
    p_assigned_by UUID
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_slot_id`: スロットID
- `p_new_teacher_id`: 新しい講師ID
- `p_assigned_by`: 変更実行ユーザーID

**処理内容:**
1. 既存の講師の`teacher_availability`を復元（is_available = TRUE）
2. 新しい講師を割当（`assign_teacher`と同様の処理）
3. `audit_logs`にACTION='CHANGE_TEACHER'として記録

**戻り値:**
```sql
{
  slot_id: VARCHAR(10),
  teacher_id: UUID,
  assigned_by: UUID,
  assigned_at: TIMESTAMP
}
```

**使用例:**
```typescript
const { data, error } = await supabase.rpc('change_teacher', {
  p_slot_id: 'MON-A',
  p_new_teacher_id: '20000000-0000-0000-0000-000000000001',
  p_assigned_by: userId
})
```

---

### unassign_teacher

**用途:** スロットの講師割当を解除する

**シグネチャ:**
```sql
unassign_teacher(
    p_slot_id VARCHAR(10),
    p_assigned_by UUID
) RETURNS BOOLEAN
```

**パラメータ:**
- `p_slot_id`: スロットID
- `p_assigned_by`: 解除実行ユーザーID

**処理内容:**
1. 既存の講師の`teacher_availability`を復元（is_available = TRUE）
2. `slot_teacher`から該当レコードを削除
3. `audit_logs`にACTION='UNASSIGN'として記録

**戻り値:**
```sql
BOOLEAN (成功: true, 失敗: false)
```

**使用例:**
```typescript
const { data, error } = await supabase.rpc('unassign_teacher', {
  p_slot_id: 'MON-A',
  p_assigned_by: userId
})
```

---

### assign_student

**用途:** スロットに生徒を配置する（レガシー）

**シグネチャ:**
```sql
assign_student(
    p_slot_id VARCHAR(10),
    p_position INTEGER,
    p_seat INTEGER,
    p_student_id UUID,
    p_subject VARCHAR(100),
    p_assigned_by UUID
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_slot_id`: スロットID
- `p_position`: ポジション（1〜6 or 1〜10）
- `p_seat`: 座席番号（1 or 2）
- `p_student_id`: 生徒ID
- `p_subject`: 受講科目
- `p_assigned_by`: 配置実行ユーザーID

**処理内容:**
1. `slot_students`テーブルにINSERT/UPDATE
2. **【同期】** `slot_id`を分解し、`slot_teacher`から講師IDを取得
3. **【同期】** `recurring_assignments`にパターンをINSERT（`ON CONFLICT DO NOTHING`）
   - `start_date = CURRENT_DATE`, `end_date = NULL`, `active = TRUE`

**同期条件（スキップケース）:**
- `slot_teacher`に講師が割り当てられていない場合
- `time_slots`テーブルに該当コマが存在しない場合

**制約:**
- コマ0/1: position 1〜6
- コマA/B/C: position 1〜10
- 各positionは最大2席（1対2指導）

---

### unassign_student

**用途:** 座席から生徒を削除する（レガシー）+ 定期パターン無効化

**シグネチャ:**
```sql
unassign_student(
    p_slot_id VARCHAR(10),
    p_position INTEGER,
    p_seat INTEGER
) RETURNS BOOLEAN
```

**パラメータ:**
- `p_slot_id`: スロットID
- `p_position`: ポジション
- `p_seat`: 座席番号

**処理内容:**
1. 削除前に`student_id`を保存
2. `slot_students`から該当レコードを削除
3. **【同期】** `recurring_assignments`の該当パターンを`active = FALSE`に更新

**同期条件（スキップケース）:**
- `slot_teacher`に講師が割り当てられていない場合
- 該当する有効な定期パターンが存在しない場合

---

### undo_assignment

**用途:** 生徒配置を取り消す（レガシー）

**シグネチャ:**
```sql
undo_assignment(
    p_slot_id VARCHAR(10),
    p_position INTEGER,
    p_seat INTEGER,
    p_assigned_by UUID
) RETURNS BOOLEAN
```

**パラメータ:**
- `p_slot_id`: スロットID
- `p_position`: ポジション
- `p_seat`: 座席番号
- `p_assigned_by`: 取消実行ユーザーID

**処理内容:**
1. `slot_students`から該当レコードを削除
2. `audit_logs`に記録

---

## V2システム（日付ベース）

### set_teacher_availability_v2

**用途:** 講師の空き枠を設定する（日付ベース）

**シグネチャ:**
```sql
set_teacher_availability_v2(
    p_teacher_id UUID,
    p_date DATE,
    p_time_slot_id VARCHAR(10),
    p_is_available BOOLEAN
) RETURNS teacher_availability_v2
```

**パラメータ:**
- `p_teacher_id`: 講師ID
- `p_date`: 日付（例: `2026-02-15`）
- `p_time_slot_id`: 時間帯ID（`1`, `A`, `B`, `C`）
- `p_is_available`: 空き状態（TRUE=来れる、FALSE=来れない）

**処理内容:**
1. `teacher_availability_v2`にINSERT or UPDATE
2. `audit_logs`にACTION='AVAILABILITY_UPDATE_V2'として記録

**戻り値:**
```sql
teacher_availability_v2 -- 作成/更新されたレコード
```

**使用例:**
```typescript
// 2026年2月15日のコマAを「来れる」に設定
const { data, error } = await supabase.rpc('set_teacher_availability_v2', {
  p_teacher_id: teacherId,
  p_date: '2026-02-15',
  p_time_slot_id: 'A',
  p_is_available: true
})
```

**権限:**
- 講師自身: 自分の空き枠のみ設定可能
- 管理者: 全講師の空き枠を設定可能

---

### assign_student_v2

**用途:** 生徒を日付×時間帯×講師にアサインする

**シグネチャ:**
```sql
assign_student_v2(
    p_date DATE,
    p_time_slot_id VARCHAR(10),
    p_teacher_id UUID,
    p_student_id UUID,
    p_subject VARCHAR(50)
) RETURNS assignments
```

**パラメータ:**
- `p_date`: 日付
- `p_time_slot_id`: 時間帯ID
- `p_teacher_id`: 講師ID
- `p_student_id`: 生徒ID
- `p_subject`: 科目

**注**: `position` は自動計算されます。同じ時間帯に既に生徒がいる場合は2になり、いない場合は1になります。

**制約チェック:**
1. **講師が空いているか**
   - `teacher_availability_v2`で`is_available=TRUE`か確認
2. **講師の1対2可否**
   - `teachers.allow_pair=FALSE`の場合、position=1のみ許可
3. **生徒の1対1必須**
   - `students.requires_one_on_one=TRUE`の場合、他の生徒がいてはいけない
4. **既存生徒の1対1必須**
   - 既存の生徒が1対1必須の場合、追加不可
5. **最大人数チェック**
   - 同じ(date, time_slot_id, teacher_id)に最大2人まで

**処理内容:**
1. 上記の制約チェック
2. `assignments`にINSERT（positionは自動計算）
3. `teacher_availability_v2`の`is_available`をFALSEに更新
4. `audit_logs`にACTION='ASSIGN_V2'として記録
5. **【同期】** 日付のDOWから`slot_id`を構築（例: 月曜日+コマA → `MON-A`）
6. **【同期】** `slot_teacher`で講師のpositionを検索、`slot_students`にINSERT

**同期条件（スキップケース）:**
- `slots`テーブルに該当スロットが存在しない場合
- `slot_teacher`に該当講師が割り当てられていない場合
- 座席(seat)が2つとも埋まっている場合

**戻り値:**
```sql
assignments -- 作成されたレコード
```

**使用例:**
```typescript
// 2026年2月15日のコマAに生徒をアサイン（positionは自動計算）
const { data, error } = await supabase.rpc('assign_student_v2', {
  p_date: '2026-02-15',
  p_time_slot_id: 'A',
  p_teacher_id: teacherId,
  p_student_id: studentId,
  p_subject: '数学'
})
```

**エラー例:**
```
ERROR: Teacher is not available at this time
ERROR: Teacher does not allow pair teaching
ERROR: This student requires one-on-one teaching, but the slot already has an assignment
ERROR: Cannot assign more than 2 students to the same slot
```

---

### unassign_student_v2

**用途:** 生徒のアサインを解除する

**シグネチャ:**
```sql
unassign_student_v2(
    p_assignment_id UUID
) RETURNS BOOLEAN
```

**パラメータ:**
- `p_assignment_id`: アサインメントID

**処理内容:**
1. `assignments`から該当レコードを削除
2. 同じ時間帯に他のアサインがない場合、`teacher_availability_v2`の`is_available`をTRUEに戻す
3. `audit_logs`にACTION='UNASSIGN_V2'として記録
4. **【同期】** 日付のDOWから`slot_id`を構築し、`slot_students`から該当生徒を削除

**同期条件（スキップケース）:**
- `slots`テーブルに該当スロットが存在しない場合
- `slot_teacher`に該当講師が割り当てられていない場合

**戻り値:**
```sql
BOOLEAN (成功: true)
```

**使用例:**
```typescript
const { data, error } = await supabase.rpc('unassign_student_v2', {
  p_assignment_id: assignmentId
})
```

---

### get_monthly_calendar

**用途:** 月次カレンダー表示用のデータを取得する

**シグネチャ:**
```sql
get_monthly_calendar(
    p_year INTEGER,
    p_month INTEGER
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_year`: 年（例: 2026）
- `p_month`: 月（1〜12）

**戻り値:**
```sql
{
  date: DATE,
  time_slot_id: VARCHAR(10),
  time_slot_order: INTEGER,
  teacher_id: UUID,
  teacher_name: VARCHAR(100),
  is_available: BOOLEAN,
  student_id: UUID,
  student_name: VARCHAR(100),
  student_grade: INTEGER,
  student_requires_one_on_one: BOOLEAN,
  student_lesson_label: VARCHAR(10),
  subject: VARCHAR(50),
  position: INTEGER
}[]
```

**使用例:**
```typescript
// 2026年2月のカレンダーデータを取得
const { data, error } = await supabase.rpc('get_monthly_calendar', {
  p_year: 2026,
  p_month: 2
})
```

**データ構造:**
- 各日付×時間帯の組み合わせごとに行を返す
- 講師の空き枠（`teacher_availability_v2`）と生徒のアサイン（`assignments`）を結合
- 1つの時間帯に複数の講師がいる場合、複数行返す
- 1対2の場合、position=1とposition=2で2行返す

---

## ユーザー管理

### create_teacher_user

**用途:** 講師ユーザーを作成する（users + teachers + teacher_skills）

**シグネチャ:**
```sql
create_teacher_user(
    p_email VARCHAR(255),
    p_name VARCHAR(255),
    p_password VARCHAR(255),
    p_teacher_data JSONB
) RETURNS JSONB
```

**パラメータ:**
- `p_email`: メールアドレス
- `p_name`: 名前
- `p_password`: パスワード（ハッシュ化される）
- `p_teacher_data`: 講師データ（JSON形式）

**p_teacher_dataの構造:**
```json
{
  "cap_week_slots": 10,
  "cap_students": 5,
  "allow_pair": true,
  "skills": [
    {
      "subject": "数学",
      "grade_min": 1,
      "grade_max": 6
    },
    {
      "subject": "英語",
      "grade_min": 3,
      "grade_max": 6
    }
  ]
}
```

**処理内容:**
1. `users`テーブルにユーザー作成（role='teacher'）
2. パスワードをbcryptでハッシュ化
3. `teachers`テーブルに講師データ作成（user_idを設定）
4. `teacher_skills`に各教科・学年範囲を登録
5. トランザクション内で一貫性保証

**戻り値:**
```json
{
  "user_id": "UUID",
  "teacher_id": "UUID",
  "email": "teacher@example.com",
  "name": "講師名"
}
```

**使用例:**
```typescript
const { data, error } = await supabase.rpc('create_teacher_user', {
  p_email: 'teacher@example.com',
  p_name: '山田太郎',
  p_password: 'SecurePassword123',
  p_teacher_data: {
    cap_week_slots: 10,
    cap_students: 5,
    allow_pair: true,
    skills: [
      { subject: '数学', grade_min: 1, grade_max: 6 },
      { subject: '英語', grade_min: 3, grade_max: 6 }
    ]
  }
})
```

---

## 最適化関数

### batch_set_teacher_availability

**用途:** 講師の空き枠を一括設定する

**シグネチャ:**
```sql
batch_set_teacher_availability(
    p_teacher_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_time_slot_ids VARCHAR(10)[],
    p_is_available BOOLEAN
) RETURNS INTEGER
```

**パラメータ:**
- `p_teacher_id`: 講師ID
- `p_start_date`: 開始日
- `p_end_date`: 終了日
- `p_time_slot_ids`: 時間帯IDの配列（例: `['A', 'B', 'C']`）
- `p_is_available`: 空き状態

**処理内容:**
1. 日付範囲と時間帯IDのすべての組み合わせに対して
2. `teacher_availability_v2`にINSERT or UPDATE

**戻り値:**
```sql
INTEGER -- 更新/作成された行数
```

**使用例:**
```typescript
// 2月1日〜2月7日の月・水・金のコマA, Bを「来れる」に設定
const { data, error } = await supabase.rpc('batch_set_teacher_availability', {
  p_teacher_id: teacherId,
  p_start_date: '2026-02-01',
  p_end_date: '2026-02-07',
  p_time_slot_ids: ['A', 'B'],
  p_is_available: true
})

// 戻り値例: 14 (7日 × 2コマ = 14行)
```

**メリット:**
- 個別に`set_teacher_availability_v2`を呼ぶよりも高速
- ネットワークラウンドトリップが削減される
- トランザクション内で一貫性保証

---

## エラーハンドリング

### 一般的なエラー

```typescript
const { data, error } = await supabase.rpc('assign_student_v2', {...})

if (error) {
  console.error('RPC Error:', error.message)
  // error.message には詳細なエラーメッセージが含まれる
}
```

### エラーメッセージ例

| エラー | 原因 |
|-------|------|
| `Teacher not found` | 講師IDが存在しない |
| `Student not found` | 生徒IDが存在しない |
| `Teacher is not available at this time` | 講師が空いていない |
| `Teacher does not allow pair teaching` | 講師が1対2不可 |
| `This student requires one-on-one teaching` | 生徒が1対1必須 |
| `Cannot assign more than 2 students to the same slot` | 定員超過 |

---

## セキュリティ

### SECURITY DEFINER

すべてのRPC関数は`SECURITY DEFINER`で定義されています。これにより:

- 関数は所有者（postgres）の権限で実行される
- RLSポリシーをバイパスできる
- 内部で適切な権限チェックを実装

### 権限チェック

```sql
-- 現在のユーザーIDを取得
v_actor_id := auth.uid();

-- 講師本人または管理者のみ許可
IF v_actor_id != p_teacher_id AND NOT is_admin(v_actor_id) THEN
  RAISE EXCEPTION 'Permission denied';
END IF;
```

---

## 定期授業パターンシステム

### create_recurring_assignment

**用途:** 新しい定期授業パターンを作成

**シグネチャ:**
```sql
create_recurring_assignment(
    p_teacher_id UUID,
    p_student_id UUID,
    p_subject VARCHAR(50),
    p_time_slot_id VARCHAR(10),
    p_day_of_week INT,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL,
    p_priority INT DEFAULT 5
) RETURNS UUID
```

**パラメータ:**
- `p_teacher_id`: 講師ID
- `p_student_id`: 生徒ID
- `p_subject`: 科目
- `p_time_slot_id`: 時間帯ID（例: `A`, `B`, `C`, `1`）
- `p_day_of_week`: 曜日（0=日曜日, 1=月曜日, ..., 6=土曜日）
- `p_start_date`: パターン開始日
- `p_end_date`: パターン終了日（NULL=無期限）
- `p_priority`: 優先順位（1=最高, 10=最低、デフォルト=5）

**処理内容:**
1. 入力バリデーション（講師・生徒の存在確認、曜日範囲チェック）
2. 重複チェック（同じ条件のパターンが既に存在しないか）
3. `recurring_assignments`テーブルにINSERT
4. 作成したパターンのIDを返却

**戻り値:**
```sql
UUID -- 作成されたパターンID
```

**使用例:**
```typescript
const { data: patternId, error } = await supabase.rpc('create_recurring_assignment', {
  p_teacher_id: 'teacher-uuid',
  p_student_id: 'student-uuid',
  p_subject: '数学',
  p_time_slot_id: 'A',
  p_day_of_week: 1, // 月曜日
  p_start_date: '2024-04-01',
  p_end_date: '2024-09-30',
  p_priority: 5,
})
```

**エラーコード:**
- `RESOURCE_NOT_FOUND`: 講師または生徒が見つからない
- `VALIDATION_ERROR`: 入力値が無効（例: 曜日が0-6の範囲外）
- `DUPLICATE_PATTERN`: 同じ条件のパターンが既に存在
- `PERMISSION_DENIED`: 権限がない

---

### update_recurring_assignment

**用途:** 既存の定期授業パターンを更新

**シグネチャ:**
```sql
update_recurring_assignment(
    p_pattern_id UUID,
    p_teacher_id UUID DEFAULT NULL,
    p_student_id UUID DEFAULT NULL,
    p_subject VARCHAR(50) DEFAULT NULL,
    p_time_slot_id VARCHAR(10) DEFAULT NULL,
    p_day_of_week INT DEFAULT NULL,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_priority INT DEFAULT NULL,
    p_active BOOLEAN DEFAULT NULL
) RETURNS VOID
```

**パラメータ:**
- `p_pattern_id`: 更新対象のパターンID
- その他のパラメータ: 更新する値（NULLの場合は更新しない）

**処理内容:**
1. パターンの存在確認
2. 権限チェック（管理者または講師本人のみ）
3. 更新可能なフィールドを動的にUPDATE
4. `updated_at`を自動更新

**使用例:**
```typescript
const { error } = await supabase.rpc('update_recurring_assignment', {
  p_pattern_id: 'pattern-uuid',
  p_end_date: '2024-12-31', // 終了日のみ更新
  p_priority: 3, // 優先度を変更
})
```

---

### delete_recurring_assignment

**用途:** 定期授業パターンを削除

**シグネチャ:**
```sql
delete_recurring_assignment(
    p_pattern_id UUID
) RETURNS VOID
```

**パラメータ:**
- `p_pattern_id`: 削除対象のパターンID

**処理内容:**
1. パターンの存在確認
2. 権限チェック（管理者または講師本人のみ）
3. 論理削除（`active=FALSE`に設定）または物理削除
4. 関連する例外処理も削除（CASCADE）

**使用例:**
```typescript
const { error } = await supabase.rpc('delete_recurring_assignment', {
  p_pattern_id: 'pattern-uuid',
})
```

---

### list_recurring_assignments

**用途:** 定期授業パターンの一覧を取得

**シグネチャ:**
```sql
list_recurring_assignments(
    p_teacher_id UUID DEFAULT NULL
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_teacher_id`: 講師ID（NULLの場合は全講師のパターンを返す）

**処理内容:**
1. 権限チェック
   - 管理者: 全パターン取得可能
   - 講師: 自分のパターンのみ取得可能
2. `recurring_assignments`テーブルから取得
3. 関連データ（講師名、生徒名など）をJOINして返却

**戻り値:**
```sql
TABLE(
  id UUID,
  teacher_id UUID,
  teacher_name VARCHAR(255),
  student_id UUID,
  student_name VARCHAR(255),
  subject VARCHAR(50),
  time_slot_id VARCHAR(10),
  day_of_week INT,
  start_date DATE,
  end_date DATE,
  priority INT,
  active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**使用例:**
```typescript
// 全パターン取得（管理者のみ）
const { data: allPatterns, error } = await supabase.rpc('list_recurring_assignments')

// 特定講師のパターン取得
const { data: teacherPatterns, error } = await supabase.rpc('list_recurring_assignments', {
  p_teacher_id: 'teacher-uuid',
})
```

---

### get_monthly_calendar_with_patterns

**用途:** 月次カレンダーデータをパターン展開付きで取得

**シグネチャ:**
```sql
get_monthly_calendar_with_patterns(
    p_year INT,
    p_month INT,
    p_teacher_id UUID DEFAULT NULL
) RETURNS TABLE(...)
```

**パラメータ:**
- `p_year`: 年（例: 2024）
- `p_month`: 月（1-12）
- `p_teacher_id`: 講師ID（NULLの場合は全講師のデータを返す）

**処理内容:**
1. 指定月の全日付を生成（1日〜月末）
2. 各日付・コマに対して以下の優先順位でデータを取得:
   - **最優先**: `assignments`テーブルの個別アサイン
   - **次**: `assignment_exceptions`テーブルの例外処理
   - **最後**: `recurring_assignments`から展開されたパターン
3. データソースを識別するフラグを付与（`data_source`フィールド）

**戻り値:**
```sql
TABLE(
  date DATE,
  time_slot_id VARCHAR(10),
  teacher_id UUID,
  teacher_name VARCHAR(255),
  student_id UUID,
  student_name VARCHAR(255),
  subject VARCHAR(50),
  data_source VARCHAR(20), -- 'pattern', 'assignment', 'exception'
  pattern_id UUID,          -- パターンIDまたはNULL
  exception_type VARCHAR(20), -- 'cancelled', 'modified' またはNULL
  priority INT
)
```

**使用例:**
```typescript
const { data: calendarData, error } = await supabase.rpc('get_monthly_calendar_with_patterns', {
  p_year: 2024,
  p_month: 4,
  p_teacher_id: null, // 全講師
})

// カレンダーデータの表示
calendarData.forEach((item) => {
  console.log(`${item.date} ${item.time_slot_id}: ${item.teacher_name} - ${item.student_name} (${item.subject})`)
  console.log(`  データソース: ${item.data_source}`)
})
```

---

### create_assignment_exception

**用途:** 定期パターンの例外処理を作成

**シグネチャ:**
```sql
create_assignment_exception(
    p_pattern_id UUID,
    p_date DATE,
    p_exception_type VARCHAR(20) -- 'cancelled' or 'modified'
) RETURNS UUID
```

**パラメータ:**
- `p_pattern_id`: 対象となる定期パターンID
- `p_date`: 例外処理を適用する日付
- `p_exception_type`: 例外タイプ（`cancelled`: 休み、`modified`: カスタマイズ）

**処理内容:**
1. パターンの存在確認
2. 日付がパターンの有効期間内かチェック
3. 重複チェック（同じ日付の例外が既に存在しないか）
4. `assignment_exceptions`テーブルにINSERT

**使用例:**
```typescript
// 特定の日を休みに設定
const { data: exceptionId, error } = await supabase.rpc('create_assignment_exception', {
  p_pattern_id: 'pattern-uuid',
  p_date: '2024-04-08',
  p_exception_type: 'cancelled',
})
```

**エラーコード:**
- `RESOURCE_NOT_FOUND`: パターンが見つからない
- `VALIDATION_ERROR`: 日付がパターンの有効期間外
- `DUPLICATE_EXCEPTION`: 同じ日付の例外が既に存在
- `PERMISSION_DENIED`: 権限がない

---

## ヘルパー関数（双方向同期）

### day_to_dow

**用途:** 曜日文字列をDOW番号に変換（IMMUTABLE）

**シグネチャ:**
```sql
day_to_dow(p_day VARCHAR(3)) RETURNS INTEGER
```

**マッピング:**
| 入力 | 出力 |
|------|------|
| `SUN` | 0 |
| `MON` | 1 |
| `TUE` | 2 |
| `WED` | 3 |
| `THU` | 4 |
| `FRI` | 5 |
| `SAT` | 6 |

---

### dow_to_day

**用途:** DOW番号を曜日文字列に変換（IMMUTABLE）

**シグネチャ:**
```sql
dow_to_day(p_dow INTEGER) RETURNS VARCHAR(3)
```

**マッピング:** `day_to_dow`の逆変換

---

## 双方向同期の仕組み

割り当てボード（レガシー）と月次カレンダー（V2）間の同期は、以下のRPC関数内で自動的に行われます。

| 操作 | 関数 | 同期先 |
|------|------|--------|
| ボードで生徒アサイン | `assign_student` | → `recurring_assignments` にパターン作成 |
| ボードで生徒解除 | `unassign_student` | → `recurring_assignments` を `active=FALSE` |
| カレンダーで生徒アサイン | `assign_student_v2` | → `slot_students` にレコード作成 |
| カレンダーで生徒解除 | `unassign_student_v2` | → `slot_students` からレコード削除 |

**設計方針:**
- トリガーではなくRPC関数内のSQL直接操作（循環更新のリスク回避）
- 同期先のデータが不整合な場合（講師未設定、スロット未存在など）はスキップ
- エラーにならずにメイン操作は正常完了

---

## 参考

- [データベーススキーマ](./schema.md)
- [マイグレーションリファレンス](./migrations.md)
- [SQL変更ガイド](./sql-modification-guide.md)
