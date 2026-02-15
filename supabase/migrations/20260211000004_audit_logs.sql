-- ============================================================================
-- Audit Logs Migration
-- ============================================================================
-- このマイグレーションでは、監査ログテーブルを作成します。
--
-- 作成されるテーブル:
-- 1. audit_logs: 全ての割当変更を記録
--
-- 要件: REQ-14（監査ログ）
-- ============================================================================

-- ============================================================================
-- 1. Audit Logs Table
-- ============================================================================
-- 監査ログ: 全ての割当変更を記録し、追跡可能にする
-- payload: JSONB型でアクションの詳細を記録

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- JSONB検索用のGINインデックス（オプション、必要に応じて）
-- CREATE INDEX idx_audit_logs_payload_gin ON audit_logs USING GIN (payload);

-- コメント追加
COMMENT ON TABLE audit_logs IS '監査ログ: 全ての割当変更を記録';
COMMENT ON COLUMN audit_logs.id IS 'ログID（UUID）';
COMMENT ON COLUMN audit_logs.actor_id IS 'アクションを実行したユーザーID';
COMMENT ON COLUMN audit_logs.action IS 'アクションタイプ（ASSIGN, CHANGE, UNASSIGN, etc.）';
COMMENT ON COLUMN audit_logs.payload IS 'アクションの詳細（JSONB）';
COMMENT ON COLUMN audit_logs.created_at IS '記録日時';

-- ============================================================================
-- Initial Data (for testing)
-- ============================================================================
-- テスト用のログデータを投入

-- 講師割当ログ（admin が 講師A を MON-0 に割当）
INSERT INTO audit_logs (actor_id, action, payload, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000001',  -- admin
    'ASSIGN',
    '{"slot_id": "MON-0", "teacher_id": "10000000-0000-0000-0000-000000000001", "teacher_name": "講師A"}',
    '2026-02-10 10:00:00'
);

-- 講師変更ログ（admin が MON-0 の講師を 講師A から 講師B に変更）
INSERT INTO audit_logs (actor_id, action, payload, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000001',  -- admin
    'CHANGE',
    '{"slot_id": "MON-0", "old_teacher_id": "10000000-0000-0000-0000-000000000001", "old_teacher_name": "講師A", "new_teacher_id": "10000000-0000-0000-0000-000000000002", "new_teacher_name": "講師B"}',
    '2026-02-10 11:30:00'
);

-- 講師割当解除ログ（admin が MON-0 の講師割当を解除）
INSERT INTO audit_logs (actor_id, action, payload, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000001',  -- admin
    'UNASSIGN',
    '{"slot_id": "MON-0", "teacher_id": "10000000-0000-0000-0000-000000000002", "teacher_name": "講師B"}',
    '2026-02-10 14:00:00'
);

-- 空き枠更新ログ（teacher1 が自分の空き枠を更新）
INSERT INTO audit_logs (actor_id, action, payload, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000002',  -- teacher1
    'AVAILABILITY_UPDATE',
    '{"teacher_id": "10000000-0000-0000-0000-000000000001", "slot_id": "TUE-A", "is_available": false}',
    '2026-02-10 15:30:00'
);

-- 設定変更ログ（admin が設定を変更）
INSERT INTO audit_logs (actor_id, action, payload, created_at) VALUES
(
    '00000000-0000-0000-0000-000000000001',  -- admin
    'SETTINGS_UPDATE',
    '{"old": {"load_weight": 1.0, "continuity_weight": 0.5}, "new": {"load_weight": 1.5, "continuity_weight": 0.8}}',
    '2026-02-10 16:00:00'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- 全ログを時系列順に表示
-- SELECT al.created_at, u.name AS actor_name, al.action, al.payload
-- FROM audit_logs al
-- JOIN users u ON al.actor_id = u.id
-- ORDER BY al.created_at DESC;

-- 特定のアクションタイプを検索
-- SELECT * FROM audit_logs WHERE action = 'ASSIGN' ORDER BY created_at DESC;

-- 特定のユーザーのアクションを検索
-- SELECT al.created_at, al.action, al.payload
-- FROM audit_logs al
-- WHERE al.actor_id = '00000000-0000-0000-0000-000000000001'
-- ORDER BY al.created_at DESC;

-- JSONB検索例（特定のslot_idに関連するログ）
-- SELECT * FROM audit_logs
-- WHERE payload @> '{"slot_id": "MON-0"}'
-- ORDER BY created_at DESC;

-- JSONB検索例（特定の講師に関連するログ）
-- SELECT * FROM audit_logs
-- WHERE payload @> '{"teacher_id": "10000000-0000-0000-0000-000000000001"}'
--    OR payload @> '{"old_teacher_id": "10000000-0000-0000-0000-000000000001"}'
--    OR payload @> '{"new_teacher_id": "10000000-0000-0000-0000-000000000001"}'
-- ORDER BY created_at DESC;
