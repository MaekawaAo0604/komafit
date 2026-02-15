UPDATE teachers
SET user_id = (SELECT id FROM auth.users WHERE email = 'maekawaao@gmail.com')
WHERE name = 'MaekawaAo0604s Org';  -- 実際の講師名に置き換えてください

-- 4. または、新しい講師レコードを作成する場合
INSERT INTO teachers (user_id, name, active, cap_week_slots, cap_students, allow_pair)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'maekawaao@gmail.com'),
  'MaekawaAo0604s Org',  -- 実際の講師名に置き換えてください
  TRUE,
  10,  -- 週あたりの最大コマ数
  5,   -- 同時受け持ち生徒数の上限
  TRUE -- 1:2指導が可能か
);