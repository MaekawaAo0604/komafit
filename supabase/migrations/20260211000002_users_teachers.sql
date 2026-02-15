-- ============================================================================
-- Users and Teachers Migration
-- ============================================================================
-- このマイグレーションでは、ユーザーと講師テーブルを作成します。
--
-- 作成されるテーブル:
-- 1. users: ユーザー認証情報とロール管理
-- 2. teachers: 講師マスタ（キャパシティ、1:2可否）
-- 3. teacher_skills: 講師が担当できる教科と学年範囲
--
-- 要件: REQ-1（ロール・権限管理）、REQ-3（講師マスタ管理）
-- ============================================================================

-- ============================================================================
-- 1. Users Table
-- ============================================================================
-- ユーザー認証情報とロール管理
-- ロール: admin（管理者）、teacher（講師）、viewer（閲覧者）

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- コメント追加
COMMENT ON TABLE users IS 'ユーザー認証情報とロール管理';
COMMENT ON COLUMN users.id IS 'ユーザーID（UUID）';
COMMENT ON COLUMN users.email IS 'メールアドレス（ログインID）';
COMMENT ON COLUMN users.password_hash IS 'パスワードハッシュ（bcrypt）';
COMMENT ON COLUMN users.name IS 'ユーザー名';
COMMENT ON COLUMN users.role IS 'ロール（admin, teacher, viewer）';
COMMENT ON COLUMN users.active IS '有効/無効フラグ';
COMMENT ON COLUMN users.created_at IS '作成日時';
COMMENT ON COLUMN users.updated_at IS '更新日時';

-- ============================================================================
-- 2. Teachers Table
-- ============================================================================
-- 講師マスタ: キャパシティと1:2指導可否を管理
-- user_idは任意（講師がユーザーアカウントを持つ場合に設定）

CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cap_week_slots INT NOT NULL CHECK (cap_week_slots > 0),
    cap_students INT NOT NULL CHECK (cap_students > 0),
    allow_pair BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_active ON teachers(active);

-- コメント追加
COMMENT ON TABLE teachers IS '講師マスタ: キャパシティと1:2指導可否を管理';
COMMENT ON COLUMN teachers.id IS '講師ID（UUID）';
COMMENT ON COLUMN teachers.user_id IS 'ユーザーID（任意、講師がログイン可能な場合）';
COMMENT ON COLUMN teachers.name IS '講師名';
COMMENT ON COLUMN teachers.active IS '有効/無効フラグ';
COMMENT ON COLUMN teachers.cap_week_slots IS '週あたりの最大コマ数';
COMMENT ON COLUMN teachers.cap_students IS '同時受け持ち生徒数の上限';
COMMENT ON COLUMN teachers.allow_pair IS '1:2指導が可能か';
COMMENT ON COLUMN teachers.created_at IS '作成日時';
COMMENT ON COLUMN teachers.updated_at IS '更新日時';

-- ============================================================================
-- 3. Teacher Skills Table
-- ============================================================================
-- 講師が担当できる教科と学年範囲
-- 複合主キー: (teacher_id, subject)

CREATE TABLE IF NOT EXISTS teacher_skills (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade_min INT NOT NULL CHECK (grade_min >= 1 AND grade_min <= 12),
    grade_max INT NOT NULL CHECK (grade_max >= 1 AND grade_max <= 12),
    CHECK (grade_min <= grade_max),
    PRIMARY KEY (teacher_id, subject)
);

-- インデックス作成
CREATE INDEX idx_teacher_skills_teacher_id ON teacher_skills(teacher_id);
CREATE INDEX idx_teacher_skills_subject ON teacher_skills(subject);

-- コメント追加
COMMENT ON TABLE teacher_skills IS '講師が担当できる教科と学年範囲';
COMMENT ON COLUMN teacher_skills.teacher_id IS '講師ID';
COMMENT ON COLUMN teacher_skills.subject IS '教科名（例: 数学、英語）';
COMMENT ON COLUMN teacher_skills.grade_min IS '担当可能な最小学年（1-12）';
COMMENT ON COLUMN teacher_skills.grade_max IS '担当可能な最大学年（1-12）';

-- ============================================================================
-- Initial Data (for testing)
-- ============================================================================
-- テスト用の初期データを投入

-- 管理者ユーザー（パスワード: admin123 のハッシュ）
INSERT INTO users (id, email, password_hash, name, role, active) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@komafit.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '管理者',
    'admin',
    TRUE
);

-- 講師ユーザー（パスワード: teacher123 のハッシュ）
INSERT INTO users (id, email, password_hash, name, role, active) VALUES
(
    '00000000-0000-0000-0000-000000000002',
    'teacher1@komafit.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '講師A',
    'teacher',
    TRUE
);

-- 講師マスタ（user_idとリンク）
INSERT INTO teachers (id, user_id, name, active, cap_week_slots, cap_students, allow_pair) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '講師A',
    TRUE,
    10,
    5,
    TRUE
);

-- 講師Aのスキル（数学: 1-6年、英語: 3-6年）
INSERT INTO teacher_skills (teacher_id, subject, grade_min, grade_max) VALUES
('10000000-0000-0000-0000-000000000001', '数学', 1, 6),
('10000000-0000-0000-0000-000000000001', '英語', 3, 6);

-- 講師マスタ（user_idなし、ログイン不可の講師）
INSERT INTO teachers (id, user_id, name, active, cap_week_slots, cap_students, allow_pair) VALUES
(
    '10000000-0000-0000-0000-000000000002',
    NULL,
    '講師B',
    TRUE,
    15,
    8,
    FALSE
);

-- 講師Bのスキル（国語: 1-9年）
INSERT INTO teacher_skills (teacher_id, subject, grade_min, grade_max) VALUES
('10000000-0000-0000-0000-000000000002', '国語', 1, 9);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- マイグレーション後の検証用クエリ

-- ユーザー一覧
-- SELECT * FROM users ORDER BY role, name;

-- 講師一覧（スキル含む）
-- SELECT t.*, ts.subject, ts.grade_min, ts.grade_max
-- FROM teachers t
-- LEFT JOIN teacher_skills ts ON t.id = ts.teacher_id
-- ORDER BY t.name, ts.subject;

-- 講師とユーザーの関連
-- SELECT t.name AS teacher_name, u.email, u.role
-- FROM teachers t
-- LEFT JOIN users u ON t.user_id = u.id
-- ORDER BY t.name;
