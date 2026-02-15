-- ============================================================================
-- Students and Slots Migration
-- ============================================================================
-- このマイグレーションでは、生徒とスロット関連のテーブルを作成します。
--
-- 作成されるテーブル:
-- 1. students: 生徒マスタ
-- 2. student_subjects: 生徒が受講する教科
-- 3. student_ng: 生徒のNG講師リスト
-- 4. slots: 授業枠（曜日×コマ）
-- 5. slot_students: スロットに配置された生徒（座席1/2）
-- 6. slot_teacher: スロットに割り当てられた講師
-- 7. teacher_availability: 講師の空き枠（Task 2.2から移動）
--
-- 要件: REQ-4（生徒マスタ管理）、REQ-5（授業枠管理）、REQ-6（講師空き枠管理）
-- ============================================================================

-- ============================================================================
-- 1. Students Table
-- ============================================================================
-- 生徒マスタ: 基本情報と学年

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    grade INT NOT NULL CHECK (grade >= 1 AND grade <= 12),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_students_active ON students(active);
CREATE INDEX idx_students_grade ON students(grade);

-- コメント追加
COMMENT ON TABLE students IS '生徒マスタ: 基本情報と学年';
COMMENT ON COLUMN students.id IS '生徒ID（UUID）';
COMMENT ON COLUMN students.name IS '生徒名';
COMMENT ON COLUMN students.grade IS '学年（1-12）';
COMMENT ON COLUMN students.active IS '有効/無効フラグ';
COMMENT ON COLUMN students.created_at IS '作成日時';
COMMENT ON COLUMN students.updated_at IS '更新日時';

-- ============================================================================
-- 2. Student Subjects Table
-- ============================================================================
-- 生徒が受講する教科

CREATE TABLE IF NOT EXISTS student_subjects (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    PRIMARY KEY (student_id, subject)
);

-- インデックス作成
CREATE INDEX idx_student_subjects_student_id ON student_subjects(student_id);
CREATE INDEX idx_student_subjects_subject ON student_subjects(subject);

-- コメント追加
COMMENT ON TABLE student_subjects IS '生徒が受講する教科';
COMMENT ON COLUMN student_subjects.student_id IS '生徒ID';
COMMENT ON COLUMN student_subjects.subject IS '教科名';

-- ============================================================================
-- 3. Student NG Teachers Table
-- ============================================================================
-- 生徒のNG講師リスト（相性が悪い、過去にトラブルがあったなど）

CREATE TABLE IF NOT EXISTS student_ng (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, teacher_id)
);

-- インデックス作成
CREATE INDEX idx_student_ng_student_id ON student_ng(student_id);
CREATE INDEX idx_student_ng_teacher_id ON student_ng(teacher_id);

-- コメント追加
COMMENT ON TABLE student_ng IS '生徒のNG講師リスト';
COMMENT ON COLUMN student_ng.student_id IS '生徒ID';
COMMENT ON COLUMN student_ng.teacher_id IS 'NG講師ID';

-- ============================================================================
-- 4. Slots Table
-- ============================================================================
-- 授業枠: 曜日×コマの組み合わせ（例: MON-0, TUE-A）

CREATE TABLE IF NOT EXISTS slots (
    id VARCHAR(10) PRIMARY KEY,
    day VARCHAR(3) NOT NULL CHECK (day IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
    koma_code VARCHAR(1) NOT NULL REFERENCES koma_master(code)
);

-- インデックス作成
CREATE INDEX idx_slots_day ON slots(day);
CREATE INDEX idx_slots_koma_code ON slots(koma_code);

-- コメント追加
COMMENT ON TABLE slots IS '授業枠: 曜日×コマの組み合わせ';
COMMENT ON COLUMN slots.id IS 'スロットID（例: MON-0, TUE-A）';
COMMENT ON COLUMN slots.day IS '曜日（MON, TUE, WED, THU, FRI, SAT, SUN）';
COMMENT ON COLUMN slots.koma_code IS 'コマコード（0, 1, A, B, C）';

-- ============================================================================
-- 5. Slot Students Table
-- ============================================================================
-- スロットに配置された生徒（座席1/2）

CREATE TABLE IF NOT EXISTS slot_students (
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    seat INT NOT NULL CHECK (seat IN (1, 2)),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade INT NOT NULL CHECK (grade >= 1 AND grade <= 12),
    PRIMARY KEY (slot_id, seat),
    UNIQUE (slot_id, student_id)
);

-- インデックス作成
CREATE INDEX idx_slot_students_slot_id ON slot_students(slot_id);
CREATE INDEX idx_slot_students_student_id ON slot_students(student_id);

-- コメント追加
COMMENT ON TABLE slot_students IS 'スロットに配置された生徒（座席1/2）';
COMMENT ON COLUMN slot_students.slot_id IS 'スロットID';
COMMENT ON COLUMN slot_students.seat IS '座席番号（1または2）';
COMMENT ON COLUMN slot_students.student_id IS '生徒ID';
COMMENT ON COLUMN slot_students.subject IS '受講教科';
COMMENT ON COLUMN slot_students.grade IS '学年（スナップショット）';

-- ============================================================================
-- 6. Slot Teacher Table
-- ============================================================================
-- スロットに割り当てられた講師

CREATE TABLE IF NOT EXISTS slot_teacher (
    slot_id VARCHAR(10) PRIMARY KEY REFERENCES slots(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_slot_teacher_teacher_id ON slot_teacher(teacher_id);
CREATE INDEX idx_slot_teacher_assigned_by ON slot_teacher(assigned_by);

-- コメント追加
COMMENT ON TABLE slot_teacher IS 'スロットに割り当てられた講師';
COMMENT ON COLUMN slot_teacher.slot_id IS 'スロットID';
COMMENT ON COLUMN slot_teacher.teacher_id IS '割り当てられた講師ID';
COMMENT ON COLUMN slot_teacher.assigned_by IS '割当を実行したユーザーID';
COMMENT ON COLUMN slot_teacher.assigned_at IS '割当日時';

-- ============================================================================
-- 7. Teacher Availability Table
-- ============================================================================
-- 講師の空き枠（Task 2.2から移動、slotsテーブルへの外部キー制約があるため）

CREATE TABLE IF NOT EXISTS teacher_availability (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (teacher_id, slot_id)
);

-- インデックス作成
CREATE INDEX idx_teacher_availability_teacher ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_slot ON teacher_availability(slot_id);
CREATE INDEX idx_teacher_availability_available ON teacher_availability(is_available);

-- コメント追加
COMMENT ON TABLE teacher_availability IS '講師の空き枠';
COMMENT ON COLUMN teacher_availability.teacher_id IS '講師ID';
COMMENT ON COLUMN teacher_availability.slot_id IS 'スロットID';
COMMENT ON COLUMN teacher_availability.is_available IS '空いているか';
COMMENT ON COLUMN teacher_availability.updated_at IS '更新日時';

-- ============================================================================
-- Initial Data (for testing)
-- ============================================================================
-- テスト用の初期データを投入

-- スロット生成（MON-0 〜 SUN-C: 7日 × 5コマ = 35スロット）
INSERT INTO slots (id, day, koma_code) VALUES
-- Monday
('MON-0', 'MON', '0'),
('MON-1', 'MON', '1'),
('MON-A', 'MON', 'A'),
('MON-B', 'MON', 'B'),
('MON-C', 'MON', 'C'),
-- Tuesday
('TUE-0', 'TUE', '0'),
('TUE-1', 'TUE', '1'),
('TUE-A', 'TUE', 'A'),
('TUE-B', 'TUE', 'B'),
('TUE-C', 'TUE', 'C'),
-- Wednesday
('WED-0', 'WED', '0'),
('WED-1', 'WED', '1'),
('WED-A', 'WED', 'A'),
('WED-B', 'WED', 'B'),
('WED-C', 'WED', 'C'),
-- Thursday
('THU-0', 'THU', '0'),
('THU-1', 'THU', '1'),
('THU-A', 'THU', 'A'),
('THU-B', 'THU', 'B'),
('THU-C', 'THU', 'C'),
-- Friday
('FRI-0', 'FRI', '0'),
('FRI-1', 'FRI', '1'),
('FRI-A', 'FRI', 'A'),
('FRI-B', 'FRI', 'B'),
('FRI-C', 'FRI', 'C'),
-- Saturday
('SAT-0', 'SAT', '0'),
('SAT-1', 'SAT', '1'),
('SAT-A', 'SAT', 'A'),
('SAT-B', 'SAT', 'B'),
('SAT-C', 'SAT', 'C'),
-- Sunday
('SUN-0', 'SUN', '0'),
('SUN-1', 'SUN', '1'),
('SUN-A', 'SUN', 'A'),
('SUN-B', 'SUN', 'B'),
('SUN-C', 'SUN', 'C');

-- 生徒テストデータ
INSERT INTO students (id, name, grade, active) VALUES
('20000000-0000-0000-0000-000000000001', '生徒A', 3, TRUE),
('20000000-0000-0000-0000-000000000002', '生徒B', 5, TRUE),
('20000000-0000-0000-0000-000000000003', '生徒C', 6, TRUE);

-- 生徒Aの教科（数学）
INSERT INTO student_subjects (student_id, subject) VALUES
('20000000-0000-0000-0000-000000000001', '数学');

-- 生徒Bの教科（英語）
INSERT INTO student_subjects (student_id, subject) VALUES
('20000000-0000-0000-0000-000000000002', '英語');

-- 生徒Cの教科（数学、英語）
INSERT INTO student_subjects (student_id, subject) VALUES
('20000000-0000-0000-0000-000000000003', '数学'),
('20000000-0000-0000-0000-000000000003', '英語');

-- スロット配置（生徒A: MON-0 座席1、生徒B: MON-0 座席2）
INSERT INTO slot_students (slot_id, seat, student_id, subject, grade) VALUES
('MON-0', 1, '20000000-0000-0000-0000-000000000001', '数学', 3),
('MON-0', 2, '20000000-0000-0000-0000-000000000002', '英語', 5);

-- 講師Aの空き枠（MON-0, TUE-Aなど）
INSERT INTO teacher_availability (teacher_id, slot_id, is_available) VALUES
('10000000-0000-0000-0000-000000000001', 'MON-0', TRUE),
('10000000-0000-0000-0000-000000000001', 'TUE-A', TRUE),
('10000000-0000-0000-0000-000000000001', 'WED-1', TRUE);

-- 講師Bの空き枠
INSERT INTO teacher_availability (teacher_id, slot_id, is_available) VALUES
('10000000-0000-0000-0000-000000000002', 'MON-0', TRUE),
('10000000-0000-0000-0000-000000000002', 'THU-B', TRUE);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- 全スロット確認（35スロット）
-- SELECT * FROM slots ORDER BY
--   CASE day
--     WHEN 'MON' THEN 1
--     WHEN 'TUE' THEN 2
--     WHEN 'WED' THEN 3
--     WHEN 'THU' THEN 4
--     WHEN 'FRI' THEN 5
--     WHEN 'SAT' THEN 6
--     WHEN 'SUN' THEN 7
--   END,
--   (SELECT koma_order FROM koma_master WHERE code = slots.koma_code);

-- 生徒一覧（教科含む）
-- SELECT s.name, s.grade, ss.subject
-- FROM students s
-- LEFT JOIN student_subjects ss ON s.id = ss.student_id
-- ORDER BY s.name, ss.subject;

-- スロット配置状況
-- SELECT sl.id, sl.day, sl.koma_code,
--        ss1.student_id AS seat1_student, ss1.subject AS seat1_subject,
--        ss2.student_id AS seat2_student, ss2.subject AS seat2_subject
-- FROM slots sl
-- LEFT JOIN slot_students ss1 ON sl.id = ss1.slot_id AND ss1.seat = 1
-- LEFT JOIN slot_students ss2 ON sl.id = ss2.slot_id AND ss2.seat = 2
-- WHERE ss1.student_id IS NOT NULL OR ss2.student_id IS NOT NULL
-- ORDER BY sl.id;

-- 講師の空き枠
-- SELECT t.name, ta.slot_id, ta.is_available
-- FROM teachers t
-- JOIN teacher_availability ta ON t.id = ta.teacher_id
-- ORDER BY t.name, ta.slot_id;
