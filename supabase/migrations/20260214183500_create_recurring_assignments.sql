-- 定期授業パターンテーブルの作成
-- 講師が曜日ベースで授業パターン（毎週月曜日コマA=田中くん数学など）を登録

CREATE TABLE recurring_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    time_slot_id VARCHAR(10) NOT NULL REFERENCES time_slots(id),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),

    -- 同じ曜日・コマ・講師・生徒・開始日の組み合わせは一意
    UNIQUE(teacher_id, day_of_week, time_slot_id, student_id, start_date),

    -- 終了日は開始日以降
    CHECK (end_date IS NULL OR end_date >= start_date)
);

-- インデックス: 講師IDで高速検索
CREATE INDEX idx_recurring_assignments_teacher ON recurring_assignments(teacher_id);

-- インデックス: 生徒IDで高速検索
CREATE INDEX idx_recurring_assignments_student ON recurring_assignments(student_id);

-- インデックス: 曜日とコマの組み合わせで高速検索
CREATE INDEX idx_recurring_assignments_day_slot ON recurring_assignments(day_of_week, time_slot_id);

-- インデックス: 有効なパターンのみを高速検索（部分インデックス）
CREATE INDEX idx_recurring_assignments_active ON recurring_assignments(active) WHERE active = TRUE;

-- インデックス: 日付範囲検索の高速化
CREATE INDEX idx_recurring_assignments_dates ON recurring_assignments(start_date, end_date);

-- テーブルコメント
COMMENT ON TABLE recurring_assignments IS '定期授業パターン - 曜日ベースで繰り返される授業の設定';
COMMENT ON COLUMN recurring_assignments.day_of_week IS '曜日 (0=日曜, 1=月曜, ..., 6=土曜)';
COMMENT ON COLUMN recurring_assignments.time_slot_id IS '時間帯ID (1, A, B, C)';
COMMENT ON COLUMN recurring_assignments.active IS '有効フラグ - 無効の場合は月次カレンダーに展開されない';
COMMENT ON COLUMN recurring_assignments.end_date IS '終了日 - NULLの場合は無期限';
