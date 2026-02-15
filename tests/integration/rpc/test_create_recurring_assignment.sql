-- create_recurring_assignment RPC関数の統合テスト
-- 手動実行用テストスクリプト

-- テスト準備: テストデータの確認
-- （実際のテスト実行前に、有効な teacher_id, student_id, time_slot_id を確認すること）

-- テストケース1: 正常系 - パターン作成成功
-- 前提: 有効な講師・生徒・時間帯が存在する
-- 期待結果: パターンが作成され、結果が返される
/*
SELECT create_recurring_assignment(
  p_teacher_id := '有効な講師UUID',
  p_day_of_week := 1,  -- 月曜日
  p_time_slot_id := 'A',
  p_student_id := '有効な生徒UUID',
  p_subject := '数学',
  p_start_date := '2026-03-01',
  p_end_date := '2026-06-30',
  p_active := TRUE
);
*/

-- テストケース2: エラー系 - 重複パターン
-- 前提: 上記のパターンが既に作成されている
-- 期待結果: DUPLICATE_PATTERN エラーが発生
/*
SELECT create_recurring_assignment(
  p_teacher_id := '同じ講師UUID',
  p_day_of_week := 1,
  p_time_slot_id := 'A',
  p_student_id := '同じ生徒UUID',
  p_subject := '数学',
  p_start_date := '2026-03-01',
  p_end_date := NULL,
  p_active := TRUE
);
-- 期待エラー: DUPLICATE_PATTERN
*/

-- テストケース3: エラー系 - 終了日が開始日より前
-- 期待結果: VALIDATION_ERROR エラーが発生
/*
SELECT create_recurring_assignment(
  p_teacher_id := '有効な講師UUID',
  p_day_of_week := 2,
  p_time_slot_id := 'B',
  p_student_id := '有効な生徒UUID',
  p_subject := '英語',
  p_start_date := '2026-03-01',
  p_end_date := '2026-02-01',  -- 開始日より前
  p_active := TRUE
);
-- 期待エラー: VALIDATION_ERROR
*/

-- テストケース4: エラー系 - 存在しない講師
-- 期待結果: VALIDATION_ERROR エラーが発生
/*
SELECT create_recurring_assignment(
  p_teacher_id := '00000000-0000-0000-0000-000000000000',  -- 存在しないUUID
  p_day_of_week := 3,
  p_time_slot_id := 'C',
  p_student_id := '有効な生徒UUID',
  p_subject := '理科',
  p_start_date := '2026-03-01',
  p_end_date := NULL,
  p_active := TRUE
);
-- 期待エラー: VALIDATION_ERROR
*/

-- テストケース5: エラー系 - 存在しない生徒
-- 期待結果: VALIDATION_ERROR エラーが発生
/*
SELECT create_recurring_assignment(
  p_teacher_id := '有効な講師UUID',
  p_day_of_week := 4,
  p_time_slot_id := '1',
  p_student_id := '00000000-0000-0000-0000-000000000000',  -- 存在しないUUID
  p_subject := '社会',
  p_start_date := '2026-03-01',
  p_end_date := NULL,
  p_active := TRUE
);
-- 期待エラー: VALIDATION_ERROR
*/

-- テストケース6: 正常系 - 無期限パターン（end_date = NULL）
/*
SELECT create_recurring_assignment(
  p_teacher_id := '有効な講師UUID',
  p_day_of_week := 5,  -- 金曜日
  p_time_slot_id := 'A',
  p_student_id := '有効な生徒UUID',
  p_subject := '国語',
  p_start_date := '2026-03-01',
  p_end_date := NULL,  -- 無期限
  p_active := TRUE
);
*/

-- 監査ログの確認
/*
SELECT *
FROM audit_logs
WHERE action = 'RECURRING_PATTERN_CREATE'
ORDER BY created_at DESC
LIMIT 5;
*/

-- 作成されたパターンの確認
/*
SELECT *
FROM recurring_assignments
ORDER BY created_at DESC
LIMIT 5;
*/

-- クリーンアップ（テスト後）
/*
DELETE FROM recurring_assignments
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';
*/
