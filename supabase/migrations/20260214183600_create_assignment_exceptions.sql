-- 定期授業パターンの例外処理テーブルの作成
-- 特定の日付だけパターンと異なる対応（休み、生徒変更など）を記録

CREATE TABLE assignment_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES recurring_assignments(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('cancelled', 'modified')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id),

    -- 同じパターン・日付の例外は一意
    UNIQUE(pattern_id, date)
);

-- インデックス: パターンIDで高速検索
CREATE INDEX idx_assignment_exceptions_pattern ON assignment_exceptions(pattern_id);

-- インデックス: 日付で高速検索（月次カレンダー表示時に使用）
CREATE INDEX idx_assignment_exceptions_date ON assignment_exceptions(date);

-- テーブルコメント
COMMENT ON TABLE assignment_exceptions IS '定期授業パターンの例外処理 - 特定の日付だけパターンと異なる対応を記録';
COMMENT ON COLUMN assignment_exceptions.exception_type IS '例外タイプ - cancelled: 休み, modified: 生徒変更';
COMMENT ON COLUMN assignment_exceptions.date IS '例外処理が適用される日付';
