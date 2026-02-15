# データベーススキーマ全体像

KomaFit入塾割当システムのデータベース設計書

## 目次

1. [概要](#概要)
2. [テーブル一覧](#テーブル一覧)
3. [テーブル詳細](#テーブル詳細)
4. [ER図](#er図)
5. [インデックス](#インデックス)

## 概要

KomaFitシステムは2つのスケジューリング方式を併用しています:

- **レガシーシステム**: 曜日ベース (`slots`, `slot_students`, `slot_teacher`)
- **V2システム**: 日付ベース (`time_slots`, `teacher_availability_v2`, `assignments`)

現在はV2システムへの移行中で、両方のテーブルが存在します。

## テーブル一覧

### マスタデータ

| テーブル名 | 用途 | システム |
|-----------|------|---------|
| `koma_master` | コマ定義（0, 1, A, B, C） | レガシー |
| `time_slots` | 時間帯マスタ（1, A, B, C） | V2 |
| `settings` | システム設定（重み、1:2ルール） | 共通 |

### ユーザー・講師

| テーブル名 | 用途 | システム |
|-----------|------|---------|
| `users` | ユーザー認証・権限管理 | 共通 |
| `teachers` | 講師マスタ | 共通 |
| `teacher_skills` | 講師のスキル（教科・学年範囲） | 共通 |
| `teacher_availability` | 講師の空き枠（曜日ベース） | レガシー |
| `teacher_availability_v2` | 講師の空き枠（日付ベース） | V2 |

### 生徒

| テーブル名 | 用途 | システム |
|-----------|------|---------|
| `students` | 生徒マスタ | 共通 |
| `student_subjects` | 生徒の受講科目 | 共通 |
| `student_ng` | 生徒のNG講師リスト | 共通 |

### スケジュール

| テーブル名 | 用途 | システム |
|-----------|------|---------|
| `slots` | 授業枠（曜日×コマ） | レガシー |
| `slot_students` | スロットの生徒配置 | レガシー |
| `slot_teacher` | スロットの講師割当 | レガシー |
| `assignments` | 生徒アサイン（日付ベース） | V2 |
| `recurring_assignments` | 定期授業パターン（曜日ベース） | V2 |
| `assignment_exceptions` | パターンの例外処理（休み・振替） | V2 |

### 監査

| テーブル名 | 用途 | システム |
|-----------|------|---------|
| `audit_logs` | 操作ログ | 共通 |

## テーブル詳細

### users (ユーザー認証)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULLABLEに変更済み
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**役割:**
- `admin`: 全機能アクセス可能
- `teacher`: 自分の空き枠登録、割当確認
- `viewer`: 閲覧のみ

### teachers (講師マスタ)

```sql
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cap_week_slots INT NOT NULL CHECK (cap_week_slots > 0),
    cap_students INT NOT NULL CHECK (cap_students > 0),
    allow_pair BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**キャパシティ制約:**
- `cap_week_slots`: 週あたりの最大コマ数
- `cap_students`: 同時受け持ち可能な生徒数上限
- `allow_pair`: 1対2指導が可能かどうか

### teacher_skills (講師スキル)

```sql
CREATE TABLE teacher_skills (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade_min INT NOT NULL CHECK (grade_min >= 1 AND grade_min <= 12),
    grade_max INT NOT NULL CHECK (grade_max >= 1 AND grade_max <= 12),
    CHECK (grade_min <= grade_max),
    PRIMARY KEY (teacher_id, subject)
);
```

**例:**
- 数学を1〜6年生まで教えられる: `('数学', 1, 6)`
- 英語を3〜6年生まで教えられる: `('英語', 3, 6)`

### students (生徒マスタ)

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    grade INT NOT NULL CHECK (grade >= 1 AND grade <= 12),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    requires_one_on_one BOOLEAN NOT NULL DEFAULT FALSE,
    lesson_label VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**V2拡張フィールド:**
- `requires_one_on_one`: TRUE の場合、必ず1対1指導
- `lesson_label`: 表示用ラベル（例: PS1, PS2）

### student_subjects (受講科目)

```sql
CREATE TABLE student_subjects (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    PRIMARY KEY (student_id, subject)
);
```

### student_ng (NG講師リスト)

```sql
CREATE TABLE student_ng (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, teacher_id)
);
```

**用途:** 相性が悪い、過去にトラブルがあったなどの理由でマッチングを避ける

### time_slots (時間帯マスタ - V2)

```sql
CREATE TABLE time_slots (
    id VARCHAR(10) PRIMARY KEY,          -- '1', 'A', 'B', 'C'
    start_time TIME NOT NULL,             -- 例: 15:35
    end_time TIME NOT NULL,               -- 例: 17:05
    display_order INTEGER NOT NULL,       -- 表示順序
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**初期データ:**

| id | start_time | end_time | display_order |
|----|-----------|----------|---------------|
| 1  | 15:35:00  | 17:05:00 | 1             |
| A  | 17:10:00  | 18:40:00 | 2             |
| B  | 18:45:00  | 20:15:00 | 3             |
| C  | 20:20:00  | 21:50:00 | 4             |

注: コマ`0`は後に追加（`20260211000017_add_timeslot_0.sql`）

### teacher_availability_v2 (講師空き枠 - V2)

```sql
CREATE TABLE teacher_availability_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,                   -- 具体的な日付
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE=来れる, FALSE=来れない
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, date, time_slot_id)
);
```

**特徴:**
- 日付ベースで細かく管理可能
- 同じ講師が同じ時間帯でも日によって空き状況が変わる

### assignments (生徒アサイン - V2)

```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,         -- 科目
    position INTEGER NOT NULL DEFAULT 1,  -- 1対2の場合は1と2
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, time_slot_id, teacher_id, position)
);
```

**position:**
- 1対1の場合: position = 1
- 1対2の場合: position = 1, 2

**制約:**
- 同じ(date, time_slot_id, teacher_id, position)の組み合わせは一意
- 講師が`allow_pair=FALSE`の場合、positionは1のみ
- 生徒が`requires_one_on_one=TRUE`の場合、その時間帯に他の生徒がいてはいけない

### recurring_assignments (定期授業パターン - V2)

```sql
CREATE TABLE recurring_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_date DATE NOT NULL,
    end_date DATE,
    priority INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, student_id, subject, time_slot_id, day_of_week, start_date)
);
```

**概要:**
- 曜日ベースの定期授業パターンを定義
- 指定期間の月次カレンダーに自動展開される
- 例: 「毎週月曜日コマA = 田中くん数学」

**フィールド:**
- `day_of_week`: 曜日（0=日曜日, 1=月曜日, ..., 6=土曜日）
- `start_date`: パターン開始日
- `end_date`: パターン終了日（NULL=無期限）
- `priority`: 優先順位（1=最高, 10=最低）。同じ日時に複数パターンがある場合、高優先度が優先
- `active`: 有効/無効フラグ

**優先順位:**
1. 個別アサイン（assignmentsテーブル）
2. 例外処理（assignment_exceptionsテーブル）
3. 定期パターン（priorityが高い順）

### assignment_exceptions (パターン例外処理 - V2)

```sql
CREATE TABLE assignment_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES recurring_assignments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('cancelled', 'modified')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pattern_id, date)
);
```

**概要:**
- 定期パターンの特定日における例外処理
- 「この日だけ休み」「この日だけ生徒変更」などに使用

**フィールド:**
- `pattern_id`: 対象となる定期パターン
- `date`: 例外処理を適用する日付
- `exception_type`:
  - `cancelled`: この日は休み（授業なし）
  - `modified`: この日は個別にカスタマイズ（将来の拡張用）

**使用例:**
1. パターン登録: 「毎週月曜日コマA = 田中くん数学」
2. カレンダー自動展開: 4月の全月曜日に表示
3. 例外登録: 4/8を「cancelled」として登録
4. 結果: 4/1, 4/15, 4/22, 4/29は授業あり、4/8は休み

### settings (システム設定)

```sql
CREATE TABLE settings (
    id INT PRIMARY KEY CHECK (id = 1),  -- シングルトン
    load_weight FLOAT NOT NULL DEFAULT 1.0 CHECK (load_weight >= 0),
    continuity_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (continuity_weight >= 0),
    grade_diff_weight FLOAT NOT NULL DEFAULT 0.3 CHECK (grade_diff_weight >= 0),
    pair_same_subject_required BOOLEAN NOT NULL DEFAULT TRUE,
    pair_max_grade_diff INT NOT NULL DEFAULT 2 CHECK (pair_max_grade_diff >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**重み:**
- `load_weight`: 負荷の優先度（1.0 = 最も重要）
- `continuity_weight`: 継続性の優先度（0.5 = 中程度）
- `grade_diff_weight`: 学年差の優先度（0.3 = やや重要）

**1:2指導ルール:**
- `pair_same_subject_required`: TRUE の場合、1:2では同一教科必須
- `pair_max_grade_diff`: 1:2での学年差上限（デフォルト2学年）

### audit_logs (監査ログ)

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**主なアクション:**
- `ASSIGN`: 講師割当
- `UNASSIGN`: 講師割当解除
- `CHANGE_TEACHER`: 講師変更
- `ASSIGN_V2`: 生徒アサイン（V2）
- `UNASSIGN_V2`: 生徒アサイン解除（V2）
- `AVAILABILITY_UPDATE_V2`: 空き枠更新（V2）

## ER図

### V2システム（日付ベース）

```
users
  |
  +-- 1:N --> teachers
  |             |
  |             +-- 1:N --> teacher_skills
  |             |
  |             +-- 1:N --> teacher_availability_v2 --> time_slots
  |             |
  |             +-- 1:N --> assignments
  |             |             |
  |             +-- 1:N --> recurring_assignments
  |                           |
  |                           +-- 1:N --> assignment_exceptions
  |                           |
  +-- 1:N -------------------+
                              |
students <-- N:1 -------------+
  |
  +-- 1:N --> student_subjects
  |
  +-- N:M --> student_ng --> teachers

定期パターンの展開:
recurring_assignments (曜日ベース)
  → カレンダーに自動展開 → assignments (日付ベース)
  → 例外処理 → assignment_exceptions

優先順位:
1. assignments (個別アサイン)
2. assignment_exceptions (例外処理)
3. recurring_assignments (定期パターン)
```

### レガシーシステム（曜日ベース）

```
slots (曜日×コマ)
  |
  +-- 1:N --> slot_students --> students
  |
  +-- 1:1 --> slot_teacher --> teachers

teachers
  |
  +-- 1:N --> teacher_availability --> slots
```

## インデックス

### パフォーマンス最適化のためのインデックス

```sql
-- Teachers
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_active ON teachers(active);

-- Teacher Skills
CREATE INDEX idx_teacher_skills_teacher_id ON teacher_skills(teacher_id);
CREATE INDEX idx_teacher_skills_subject ON teacher_skills(subject);

-- Students
CREATE INDEX idx_students_active ON students(active);
CREATE INDEX idx_students_grade ON students(grade);

-- Teacher Availability V2
CREATE INDEX idx_teacher_availability_v2_teacher ON teacher_availability_v2(teacher_id);
CREATE INDEX idx_teacher_availability_v2_date ON teacher_availability_v2(date);
CREATE INDEX idx_teacher_availability_v2_teacher_date ON teacher_availability_v2(teacher_id, date);

-- Assignments
CREATE INDEX idx_assignments_date ON assignments(date);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_date_time_slot ON assignments(date, time_slot_id);

-- Recurring Assignments
CREATE INDEX idx_recurring_assignments_teacher ON recurring_assignments(teacher_id);
CREATE INDEX idx_recurring_assignments_student ON recurring_assignments(student_id);
CREATE INDEX idx_recurring_assignments_active ON recurring_assignments(active) WHERE active = true;
CREATE INDEX idx_recurring_assignments_teacher_active_day ON recurring_assignments(teacher_id, active, day_of_week) WHERE active = true;
CREATE INDEX idx_recurring_assignments_date_range ON recurring_assignments(start_date, end_date) WHERE active = true;

-- Assignment Exceptions
CREATE INDEX idx_assignment_exceptions_pattern ON assignment_exceptions(pattern_id);
CREATE INDEX idx_assignment_exceptions_date ON assignment_exceptions(date);
CREATE INDEX idx_assignment_exceptions_pattern_date ON assignment_exceptions(pattern_id, date);
```

## データ整合性チェック

### 講師のキャパシティチェック（週次）

```sql
-- 講師の週あたりの割当数が上限を超えていないか確認
SELECT
  t.name,
  t.cap_week_slots AS capacity,
  COUNT(DISTINCT a.date || '-' || a.time_slot_id) AS assigned_slots
FROM teachers t
LEFT JOIN assignments a ON t.id = a.teacher_id
  AND a.date >= date_trunc('week', CURRENT_DATE)
  AND a.date < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'
GROUP BY t.id, t.name, t.cap_week_slots
HAVING COUNT(DISTINCT a.date || '-' || a.time_slot_id) > t.cap_week_slots;
```

### 講師の受け持ち生徒数チェック

```sql
-- 講師の同時受け持ち生徒数が上限を超えていないか確認
SELECT
  t.name,
  t.cap_students AS capacity,
  COUNT(DISTINCT a.student_id) AS current_students
FROM teachers t
LEFT JOIN assignments a ON t.id = a.teacher_id
  AND a.date >= CURRENT_DATE
GROUP BY t.id, t.name, t.cap_students
HAVING COUNT(DISTINCT a.student_id) > t.cap_students;
```

### 1対1必須制約チェック

```sql
-- requires_one_on_one=TRUEの生徒が1対2で割り当てられていないか確認
SELECT
  a.date,
  a.time_slot_id,
  a.teacher_id,
  s.name AS student_name,
  s.requires_one_on_one
FROM assignments a
JOIN students s ON a.student_id = s.id
WHERE s.requires_one_on_one = TRUE
  AND EXISTS (
    SELECT 1 FROM assignments a2
    WHERE a2.date = a.date
      AND a2.time_slot_id = a.time_slot_id
      AND a2.teacher_id = a.teacher_id
      AND a2.position != a.position
  );
```

## 参考

- [マイグレーションリファレンス](./migrations.md)
- [RPC関数リファレンス](./rpc-functions.md)
- [SQL変更ガイド](./sql-modification-guide.md)
