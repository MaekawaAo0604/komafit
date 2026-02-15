-- ============================================================================
-- Initial Schema Migration
-- ============================================================================
-- このマイグレーションでは、コママスタと設定テーブルを作成します。
--
-- 作成されるテーブル:
-- 1. koma_master: コマ（0, 1, A, B, C）の定義と表示順序
-- 2. settings: システム設定（ソフト条件の重み、1:2ルール）
--
-- 要件: REQ-2（コマ・スロット定義マスタ）、REQ-17（システム設定管理）
-- ============================================================================

-- ============================================================================
-- 1. Koma Master Table
-- ============================================================================
-- コママスタ: 固定5種類のコマとその表示順序を管理
-- 表示順序: 0 → 1 → A → B → C

CREATE TABLE IF NOT EXISTS koma_master (
    code VARCHAR(1) PRIMARY KEY CHECK (code IN ('0', '1', 'A', 'B', 'C')),
    koma_order INT NOT NULL UNIQUE CHECK (koma_order >= 0)
);

-- コママスタへの初期データ投入
INSERT INTO koma_master (code, koma_order) VALUES
    ('0', 0),
    ('1', 1),
    ('A', 2),
    ('B', 3),
    ('C', 4);

-- コメント追加
COMMENT ON TABLE koma_master IS 'コママスタ: 授業コマの定義と表示順序';
COMMENT ON COLUMN koma_master.code IS 'コマコード (0, 1, A, B, C)';
COMMENT ON COLUMN koma_master.koma_order IS '表示順序 (0が最初)';

-- ============================================================================
-- 2. Settings Table
-- ============================================================================
-- システム設定: ソフト条件の重み、1:2指導ルール
-- シングルトンテーブル（id=1の1レコードのみ）

CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY CHECK (id = 1),  -- シングルトン制約

    -- ソフト条件の重み
    load_weight FLOAT NOT NULL DEFAULT 1.0 CHECK (load_weight >= 0),
    continuity_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (continuity_weight >= 0),
    grade_diff_weight FLOAT NOT NULL DEFAULT 0.3 CHECK (grade_diff_weight >= 0),

    -- 1:2指導ルール
    pair_same_subject_required BOOLEAN NOT NULL DEFAULT TRUE,
    pair_max_grade_diff INT NOT NULL DEFAULT 2 CHECK (pair_max_grade_diff >= 0),

    -- タイムスタンプ
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 初期設定データの投入
INSERT INTO settings (
    id,
    load_weight,
    continuity_weight,
    grade_diff_weight,
    pair_same_subject_required,
    pair_max_grade_diff
) VALUES (
    1,
    1.0,   -- 負荷優先度: 最も重要
    0.5,   -- 継続性優先度: 中程度
    0.3,   -- 学年差優先度: やや重要
    TRUE,  -- 1:2指導では同一教科必須
    2      -- 1:2指導の学年差上限は2学年
);

-- コメント追加
COMMENT ON TABLE settings IS 'システム設定: ソフト条件の重み、1:2指導ルール';
COMMENT ON COLUMN settings.id IS 'シングルトンID (常に1)';
COMMENT ON COLUMN settings.load_weight IS '負荷優先度の重み';
COMMENT ON COLUMN settings.continuity_weight IS '継続性優先度の重み';
COMMENT ON COLUMN settings.grade_diff_weight IS '学年差優先度の重み';
COMMENT ON COLUMN settings.pair_same_subject_required IS '1:2指導で同一教科必須か';
COMMENT ON COLUMN settings.pair_max_grade_diff IS '1:2指導の学年差上限';

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- コママスタの確認（順序通りに表示されるか）
-- SELECT * FROM koma_master ORDER BY koma_order;

-- 設定の確認
-- SELECT * FROM settings WHERE id = 1;
