-- Task 10.2: データベースクエリの最適化
-- EXPLAIN ANALYZEによるRPC関数のパフォーマンス分析

-- =============================================================================
-- 1. create_recurring_assignment の分析
-- =============================================================================

-- テスト用のデータ準備
-- 講師、生徒、科目が存在することを前提

-- 実行計画の確認
EXPLAIN ANALYZE
SELECT * FROM create_recurring_assignment(
  p_teacher_id := 'test-teacher-id',
  p_student_id := 'test-student-id',
  p_subject_id := 'test-subject-id',
  p_time_slot_id := 'A',
  p_day_of_week := 1,
  p_start_date := '2024-04-01',
  p_end_date := '2024-09-30',
  p_priority := 5
);

-- =============================================================================
-- 2. list_recurring_assignments の分析
-- =============================================================================

-- 全講師のパターンを取得
EXPLAIN ANALYZE
SELECT * FROM list_recurring_assignments(
  p_teacher_id := NULL
);

-- 特定講師のパターンを取得
EXPLAIN ANALYZE
SELECT * FROM list_recurring_assignments(
  p_teacher_id := 'test-teacher-id'
);

-- =============================================================================
-- 3. get_monthly_calendar_with_patterns の分析
-- =============================================================================

-- 2024年4月のカレンダーデータを取得
EXPLAIN ANALYZE
SELECT * FROM get_monthly_calendar_with_patterns(
  p_year := 2024,
  p_month := 4,
  p_teacher_id := NULL
);

-- 特定講師の2024年4月のカレンダーデータを取得
EXPLAIN ANALYZE
SELECT * FROM get_monthly_calendar_with_patterns(
  p_year := 2024,
  p_month := 4,
  p_teacher_id := 'test-teacher-id'
);

-- =============================================================================
-- 4. create_assignment_exception の分析
-- =============================================================================

EXPLAIN ANALYZE
SELECT * FROM create_assignment_exception(
  p_pattern_id := 'test-pattern-id',
  p_date := '2024-04-08',
  p_exception_type := 'cancelled'
);

-- =============================================================================
-- 5. インデックス効果の確認
-- =============================================================================

-- recurring_assignmentsテーブルの現在のインデックスを確認
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'recurring_assignments';

-- assignment_exceptionsテーブルの現在のインデックスを確認
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'assignment_exceptions';

-- =============================================================================
-- 6. パフォーマンス問題の特定
-- =============================================================================

-- Sequential Scanが発生しているかチェック
-- recurring_assignmentsテーブルでのクエリ
EXPLAIN ANALYZE
SELECT *
FROM recurring_assignments
WHERE teacher_id = 'test-teacher-id'
  AND active = true
  AND day_of_week = 1;

-- assignment_exceptionsテーブルでのクエリ
EXPLAIN ANALYZE
SELECT *
FROM assignment_exceptions
WHERE pattern_id = 'test-pattern-id'
  AND date BETWEEN '2024-04-01' AND '2024-04-30';

-- =============================================================================
-- 7. 推奨インデックスの作成（パフォーマンス改善後）
-- =============================================================================

-- recurring_assignmentsテーブルの複合インデックス
-- WHERE teacher_id = ? AND active = ? AND day_of_week = ? が頻繁に実行される場合
CREATE INDEX IF NOT EXISTS idx_recurring_assignments_teacher_active_day
ON recurring_assignments (teacher_id, active, day_of_week)
WHERE active = true;

-- start_date, end_dateでの範囲検索用インデックス
CREATE INDEX IF NOT EXISTS idx_recurring_assignments_date_range
ON recurring_assignments (start_date, end_date)
WHERE active = true;

-- assignment_exceptionsテーブルの複合インデックス
-- WHERE pattern_id = ? AND date BETWEEN ? AND ? が頻繁に実行される場合
CREATE INDEX IF NOT EXISTS idx_assignment_exceptions_pattern_date
ON assignment_exceptions (pattern_id, date);

-- =============================================================================
-- 8. インデックス作成後のパフォーマンス再確認
-- =============================================================================

-- 再度EXPLAIN ANALYZEを実行して改善を確認
EXPLAIN ANALYZE
SELECT *
FROM recurring_assignments
WHERE teacher_id = 'test-teacher-id'
  AND active = true
  AND day_of_week = 1;

-- 改善前後のコスト比較
-- - Seq Scan → Index Scan への変更を確認
-- - cost の低減を確認
-- - actual time の短縮を確認

-- =============================================================================
-- 9. N+1問題のチェック
-- =============================================================================

-- フロントエンドサービス層でN+1クエリが発生していないかを確認するため、
-- pg_stat_statementsを使用してクエリ統計を取得

-- pg_stat_statementsの有効化（必要に応じて）
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- クエリ統計のリセット
-- SELECT pg_stat_statements_reset();

-- 実際の操作（月次カレンダー表示など）を実行後、統計を確認
SELECT
    calls,
    mean_exec_time,
    total_exec_time,
    query
FROM
    pg_stat_statements
WHERE
    query LIKE '%recurring_assignments%'
    OR query LIKE '%assignment_exceptions%'
ORDER BY
    calls DESC, total_exec_time DESC
LIMIT 20;

-- 同じクエリが多数回実行されている場合はN+1問題の可能性あり

-- =============================================================================
-- 10. パフォーマンス最適化レポート
-- =============================================================================

-- 最適化前後の実行時間を記録
-- - create_recurring_assignment: XX ms → YY ms
-- - list_recurring_assignments: XX ms → YY ms
-- - get_monthly_calendar_with_patterns: XX ms → YY ms
-- - create_assignment_exception: XX ms → YY ms

-- インデックス追加によるストレージ増加量を確認
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM
    pg_tables
WHERE
    schemaname = 'public'
    AND (tablename = 'recurring_assignments' OR tablename = 'assignment_exceptions');
