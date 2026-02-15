-- ============================================================================
-- Date-Based Scheduling Migration
-- ============================================================================
-- このマイグレーションでは、日付ベースのスケジューリングシステムを構築します。
--
-- 作成されるテーブル:
-- 1. time_slots: コママスタ（1, A, B, C など）
-- 2. teacher_availability_v2: 日付ベースの講師空き枠
-- 3. assignments: 日付ベースの生徒アサイン
--
-- 既存のテーブル（slots, teacher_availability, slot_teacher）は残します。
-- 段階的に新システムに移行していきます。
-- ============================================================================

-- ============================================================================
-- 1. Time Slots Master Table（コママスタ）
-- ============================================================================
-- 時間枠の定義（1, A, B, C など）

CREATE TABLE IF NOT EXISTS time_slots (
    id VARCHAR(10) PRIMARY KEY,          -- '1', 'A', 'B', 'C', etc.
    start_time TIME NOT NULL,             -- 開始時刻（例: 15:35）
    end_time TIME NOT NULL,               -- 終了時刻（例: 17:05）
    display_order INTEGER NOT NULL,       -- 表示順序
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_time_slots_display_order ON time_slots(display_order);
CREATE INDEX idx_time_slots_active ON time_slots(is_active);

-- コメント追加
COMMENT ON TABLE time_slots IS 'コママスタ: 時間枠の定義';
COMMENT ON COLUMN time_slots.id IS 'コマID（1, A, B, C など）';
COMMENT ON COLUMN time_slots.start_time IS '開始時刻';
COMMENT ON COLUMN time_slots.end_time IS '終了時刻';
COMMENT ON COLUMN time_slots.display_order IS '表示順序（小さい順に表示）';
COMMENT ON COLUMN time_slots.is_active IS '有効フラグ';

-- ============================================================================
-- 2. Teacher Availability V2 Table（日付ベースの講師空き枠）
-- ============================================================================
-- 講師がいつ、どのコマに来れるかを日付ベースで管理

CREATE TABLE IF NOT EXISTS teacher_availability_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,                   -- 具体的な日付（例: 2026-02-11）
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE=来れる(白), FALSE=来れない(グレー)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, date, time_slot_id)
);

-- インデックス作成
CREATE INDEX idx_teacher_availability_v2_teacher ON teacher_availability_v2(teacher_id);
CREATE INDEX idx_teacher_availability_v2_date ON teacher_availability_v2(date);
CREATE INDEX idx_teacher_availability_v2_teacher_date ON teacher_availability_v2(teacher_id, date);

-- コメント追加
COMMENT ON TABLE teacher_availability_v2 IS '日付ベースの講師空き枠: 講師がいつ、どのコマに来れるかを管理';
COMMENT ON COLUMN teacher_availability_v2.teacher_id IS '講師ID';
COMMENT ON COLUMN teacher_availability_v2.date IS '日付';
COMMENT ON COLUMN teacher_availability_v2.time_slot_id IS 'コマID';
COMMENT ON COLUMN teacher_availability_v2.is_available IS '空き状態（TRUE=来れる、FALSE=来れない）';

-- ============================================================================
-- 3. Assignments Table（日付ベースの生徒アサイン）
-- ============================================================================
-- 生徒をいつ、どのコマに、どの講師にアサインするかを管理

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,                   -- 日付
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,         -- 科目（「数」「英」「国理」など）
    position INTEGER NOT NULL DEFAULT 1,  -- ポジション（1対2の場合は1と2）
    assigned_by UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, time_slot_id, teacher_id, position)
);

-- インデックス作成
CREATE INDEX idx_assignments_date ON assignments(date);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_student ON assignments(student_id);
CREATE INDEX idx_assignments_date_time_slot ON assignments(date, time_slot_id);

-- コメント追加
COMMENT ON TABLE assignments IS '日付ベースの生徒アサイン: 生徒をいつ、どのコマに、どの講師にアサインするかを管理';
COMMENT ON COLUMN assignments.date IS '日付';
COMMENT ON COLUMN assignments.time_slot_id IS 'コマID';
COMMENT ON COLUMN assignments.teacher_id IS '講師ID';
COMMENT ON COLUMN assignments.student_id IS '生徒ID';
COMMENT ON COLUMN assignments.subject IS '科目';
COMMENT ON COLUMN assignments.position IS 'ポジション（1対2の場合は1と2）';
COMMENT ON COLUMN assignments.assigned_by IS 'アサインを実行したユーザーID';
COMMENT ON COLUMN assignments.assigned_at IS 'アサイン日時';

-- ============================================================================
-- 4. Students Table の拡張（1対1指導必須フラグ）
-- ============================================================================
-- 生徒に1対1指導が必須かどうかのフラグを追加

ALTER TABLE students
ADD COLUMN IF NOT EXISTS requires_one_on_one BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS lesson_label VARCHAR(10);

-- コメント追加
COMMENT ON COLUMN students.requires_one_on_one IS '1対1指導必須フラグ（TRUE=1対1のみ、FALSE=1対2可）';
COMMENT ON COLUMN students.lesson_label IS '表示用ラベル（PS1, PS2 など）';

-- ============================================================================
-- Initial Data（時間帯マスタの初期データ）
-- ============================================================================
-- 画像から読み取れる時間帯を投入

INSERT INTO time_slots (id, start_time, end_time, display_order) VALUES
('1', '15:35:00', '17:05:00', 1),
('A', '17:10:00', '18:40:00', 2),
('B', '18:45:00', '20:15:00', 3),
('C', '20:20:00', '21:50:00', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- 時間帯マスタの確認
-- SELECT * FROM time_slots ORDER BY display_order;

-- 講師の空き枠の確認（特定の月）
-- SELECT
--   ta.date,
--   ts.id AS time_slot,
--   t.name AS teacher_name,
--   ta.is_available
-- FROM teacher_availability_v2 ta
-- JOIN teachers t ON ta.teacher_id = t.id
-- JOIN time_slots ts ON ta.time_slot_id = ts.id
-- WHERE ta.date >= '2026-02-01' AND ta.date < '2026-03-01'
-- ORDER BY ta.date, ts.display_order;

-- 生徒のアサインの確認（特定の月）
-- SELECT
--   a.date,
--   ts.id AS time_slot,
--   t.name AS teacher_name,
--   s.name AS student_name,
--   s.grade,
--   a.subject,
--   s.requires_one_on_one,
--   s.lesson_label
-- FROM assignments a
-- JOIN teachers t ON a.teacher_id = t.id
-- JOIN students s ON a.student_id = s.id
-- JOIN time_slots ts ON a.time_slot_id = ts.id
-- WHERE a.date >= '2026-02-01' AND a.date < '2026-03-01'
-- ORDER BY a.date, ts.display_order, a.position;
