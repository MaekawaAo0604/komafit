-- ============================================================================
-- Multiple Teachers Per Slot Migration
-- ============================================================================
-- 1つのスロットに複数の講師を配置できるように変更
--
-- 変更内容:
-- 1. slot_teacher テーブルに position カラムを追加
-- 2. PRIMARY KEY を (slot_id, position) に変更
-- 3. 各コマの最大講師数を定義
-- ============================================================================

-- ============================================================================
-- Drop existing slot_teacher table and recreate
-- ============================================================================

DROP TABLE IF EXISTS slot_teacher CASCADE;

CREATE TABLE slot_teacher (
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    position INT NOT NULL CHECK (position >= 1 AND position <= 10),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP,
    PRIMARY KEY (slot_id, position)
);

-- インデックス作成
CREATE INDEX idx_slot_teacher_slot_id ON slot_teacher(slot_id);
CREATE INDEX idx_slot_teacher_teacher_id ON slot_teacher(teacher_id);
CREATE INDEX idx_slot_teacher_assigned_by ON slot_teacher(assigned_by);

-- コメント追加
COMMENT ON TABLE slot_teacher IS 'スロットの各ポジションに割り当てられた講師';
COMMENT ON COLUMN slot_teacher.slot_id IS 'スロットID';
COMMENT ON COLUMN slot_teacher.position IS '講師枠の位置 (1-10: A/B/C限は10枠、0/1限は6枠まで使用)';
COMMENT ON COLUMN slot_teacher.teacher_id IS '割り当てられた講師ID';
COMMENT ON COLUMN slot_teacher.assigned_by IS '割当を実行したユーザーID';
COMMENT ON COLUMN slot_teacher.assigned_at IS '割当日時';

-- ============================================================================
-- Update slot_students table to include position
-- ============================================================================

-- slot_students テーブルも position を参照するように変更
DROP TABLE IF EXISTS slot_students CASCADE;

CREATE TABLE slot_students (
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    position INT NOT NULL CHECK (position >= 1 AND position <= 10),
    seat INT NOT NULL CHECK (seat IN (1, 2)),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade INT NOT NULL CHECK (grade >= 1 AND grade <= 12),
    PRIMARY KEY (slot_id, position, seat),
    UNIQUE (slot_id, position, student_id),
    FOREIGN KEY (slot_id, position) REFERENCES slot_teacher(slot_id, position) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX idx_slot_students_slot_position ON slot_students(slot_id, position);
CREATE INDEX idx_slot_students_student_id ON slot_students(student_id);

-- コメント追加
COMMENT ON TABLE slot_students IS 'スロットの各ポジション・座席に配置された生徒（座席1/2）';
COMMENT ON COLUMN slot_students.slot_id IS 'スロットID';
COMMENT ON COLUMN slot_students.position IS '講師枠の位置';
COMMENT ON COLUMN slot_students.seat IS '座席番号（1または2）';
COMMENT ON COLUMN slot_students.student_id IS '生徒ID';
COMMENT ON COLUMN slot_students.subject IS '受講教科';
COMMENT ON COLUMN slot_students.grade IS '学年（スナップショット）';

-- ============================================================================
-- Create initial teacher positions for each slot
-- ============================================================================
-- 各スロットに空の講師枠を作成
-- 0/1限: 6枠、A/B/C限: 10枠

DO $$
DECLARE
  slot_rec RECORD;
  max_positions INT;
  pos INT;
BEGIN
  FOR slot_rec IN SELECT id, koma_code FROM slots LOOP
    -- コマコードによって最大枠数を決定
    max_positions := CASE
      WHEN slot_rec.koma_code IN ('0', '1') THEN 6
      ELSE 10
    END;

    -- 各ポジションに空枠を作成
    FOR pos IN 1..max_positions LOOP
      INSERT INTO slot_teacher (slot_id, position, teacher_id, assigned_by, assigned_at)
      VALUES (slot_rec.id, pos, NULL, NULL, NULL)
      ON CONFLICT (slot_id, position) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- Update RLS policies
-- ============================================================================

-- slot_teacher のRLSポリシーは既存のものを使用
-- 講師は自分が割り当てられているスロットのみ表示
ALTER TABLE slot_teacher ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slot_teacher_admin_all" ON slot_teacher;
DROP POLICY IF EXISTS "slot_teacher_read_authenticated" ON slot_teacher;
DROP POLICY IF EXISTS "slot_teacher_teacher_own" ON slot_teacher;

-- Admin: Full access
CREATE POLICY "slot_teacher_admin_all"
ON slot_teacher
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "slot_teacher_read_authenticated"
ON slot_teacher
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- slot_students のRLSポリシー
ALTER TABLE slot_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slot_students_admin_all" ON slot_students;
DROP POLICY IF EXISTS "slot_students_read_authenticated" ON slot_students;

-- Admin: Full access
CREATE POLICY "slot_students_admin_all"
ON slot_students
FOR ALL
TO authenticated
USING (public.user_role() = 'admin')
WITH CHECK (public.user_role() = 'admin');

-- Authenticated: Read access
CREATE POLICY "slot_students_read_authenticated"
ON slot_students
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');
