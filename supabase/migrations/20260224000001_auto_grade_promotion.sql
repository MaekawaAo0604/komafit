-- ============================================================================
-- Auto Grade Promotion (pg_cron)
-- ============================================================================
-- 毎年3月1日にアクティブな生徒の学年を自動で+1する。
-- 高3（grade=12）の生徒はそのまま残す。
-- slot_students.grade はスナップショットなので更新しない。

-- pg_cron 拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- RPC関数: promote_student_grades
-- ============================================================================
-- アクティブな生徒の学年を+1する（grade 12はスキップ）
-- 手動実行: SELECT promote_student_grades();

CREATE OR REPLACE FUNCTION promote_student_grades()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE students
  SET grade = grade + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE active = TRUE
    AND grade < 12;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 監査ログに記録
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    NULL,
    'PROMOTE_GRADES',
    jsonb_build_object(
      'promoted_count', v_count,
      'executed_at', CURRENT_TIMESTAMP
    )
  );

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION promote_student_grades() IS '全アクティブ生徒の学年を+1（高3はスキップ）。毎年3月1日に自動実行。';

-- ============================================================================
-- pg_cron ジョブ登録: 毎年3月1日 00:00 UTC (= JST 09:00)
-- ============================================================================
SELECT cron.schedule(
  'promote-student-grades',
  '0 0 1 3 *',
  $$SELECT public.promote_student_grades()$$
);
