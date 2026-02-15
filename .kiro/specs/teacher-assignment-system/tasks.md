# Implementation Plan

本実装計画は、入塾割当アシスタントシステムをテスト駆動開発（TDD）アプローチで段階的に構築するためのタスクリストです。各タスクは1-3時間で完了可能で、要件ドキュメントの特定の要件に紐付けられています。

---

## Phase 1: データベース基盤とSupabaseセットアップ

### 1. Supabaseプロジェクトのセットアップと基本構成

- [x] **1.1 Supabaseプロジェクトの初期化**
  - Supabase CLIをインストール・設定
  - ローカル開発環境用のSupabaseプロジェクトを初期化（`supabase init`）
  - `.env`ファイルを作成し、Supabase URL、anon key、service role keyを設定
  - `supabase/config.toml`で基本設定を構成（auth, storage, edge functionsの有効化）
  - _要件: 全体のアーキテクチャ基盤_

- [x] **1.2 プロジェクトディレクトリ構造の作成**
  - フロントエンド用ディレクトリ: `src/`（components, services, types, utils, pages）
  - バックエンド用ディレクトリ: `supabase/`（migrations, functions, seed）
  - テスト用ディレクトリ: `tests/`（unit, integration, e2e）
  - 設定ファイル: `tsconfig.json`, `vite.config.ts`, `package.json`
  - _要件: 開発環境の整備_

### 2. データベーススキーマの実装（TDDアプローチ）

- [x] **2.1 基本テーブルのマイグレーション作成（コママスタ、設定）**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000001_initial_schema.sql`
  - `koma_master`テーブルを定義（code, koma_order）
  - コマの初期データを投入（0, 1, A, B, C with order）
  - `settings`テーブルを定義（シングルトン、ソフト条件の重み設定）
  - 初期設定データを投入
  - マイグレーションテストを作成: `tests/database/migrations/initial_schema.test.ts`
  - _要件: REQ-2（コマ・スロット定義マスタ）、REQ-17（システム設定管理）_

- [x] **2.2 ユーザーと講師テーブルのマイグレーション作成**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000002_users_teachers.sql`
  - `users`テーブルを定義（id, email, password_hash, name, role, active）
  - `teachers`テーブルを定義（id, user_id, name, active, cap_week_slots, cap_students, allow_pair）
  - `teacher_skills`テーブルを定義（teacher_id, subject, grade_min, grade_max）
  - 外部キー制約とインデックスを設定
  - テストデータを投入（管理者、講師2名）
  - マイグレーションテストを作成: `tests/database/migrations/users_teachers.test.ts`
  - _注: `teacher_availability`はTask 2.3でslotsテーブル作成後に追加_
  - _要件: REQ-1（ロール・権限管理）、REQ-3（講師マスタ管理）_

- [x] **2.3 生徒とスロットテーブルのマイグレーション作成**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000003_students_slots.sql`
  - `students`テーブルを定義（id, name, grade, active）
  - `student_subjects`テーブルを定義（student_id, subject）
  - `student_ng`テーブルを定義（student_id, teacher_id）
  - `slots`テーブルを定義（id, day, koma_code）- 35スロット生成（7日×5コマ）
  - `slot_students`テーブルを定義（slot_id, seat, student_id, subject, grade）
  - `slot_teacher`テーブルを定義（slot_id, teacher_id, assigned_by, assigned_at）
  - `teacher_availability`テーブルを作成（Task 2.2から移動）
  - テストデータで座席1/2の配置ルール、制約を検証
  - マイグレーションテストを作成: `tests/database/migrations/students_slots.test.ts`
  - _要件: REQ-4（生徒マスタ管理）、REQ-5（授業枠管理）、REQ-6（講師空き枠管理）_

- [x] **2.4 監査ログテーブルのマイグレーション作成**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000004_audit_logs.sql`
  - `audit_logs`テーブルを定義（id, actor_id, action, payload, created_at）
  - JSONB型のpayload列を設定
  - インデックスを設定（actor_id, action, created_at DESC）
  - テストログを挿入（ASSIGN, CHANGE, UNASSIGN, AVAILABILITY_UPDATE, SETTINGS_UPDATE）
  - マイグレーションテストを作成: `tests/database/migrations/audit_logs.test.ts`
  - JSONB検索性能を検証
  - _要件: REQ-14（監査ログ）_

### 3. Row Level Security (RLS) ポリシーの実装

- [x] **3.1 RLSポリシーのマイグレーション作成（認証・認可）**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000005_rls_policies_auth.sql`
  - ヘルパー関数を作成: `auth.user_role()` （JWTからロール取得）
  - users、teachers、teacher_skills、teacher_availabilityテーブルでRLSを有効化
  - usersテーブルのポリシー: admin全権限、ユーザーは自分のデータのみ読取可能
  - teachersテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - teacher_availabilityテーブルのポリシー: 講師は自分のデータのみ編集可能、adminは全権限
  - マイグレーションテストを作成: `tests/database/migrations/rls_policies_auth.test.ts`
  - _要件: REQ-1（ロール・権限管理）_

- [x] **3.2 RLSポリシーのマイグレーション作成（データ操作）**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000006_rls_policies_data.sql`
  - students、student_subjects、student_ng、slots、slot_students、slot_teacher、audit_logs、settings、koma_masterテーブルでRLSを有効化
  - studentsテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - slotsテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - slot_studentsテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - slot_teacherテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - audit_logsテーブルのポリシー: adminは読取可能、認証済みユーザーは挿入可能
  - settingsテーブルのポリシー: admin全権限、認証済みユーザーは読取可能
  - RLSテストを実行して権限分離を確認
  - _要件: REQ-1（ロール・権限管理）_

### 4. PostgreSQL RPC関数の実装（割当操作）

- [x] **4.1 講師割当RPC関数の作成（テスト先行）**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000007_rpc_assign_teacher.sql`
  - `assign_teacher(p_slot_id, p_teacher_id, p_assigned_by)` 関数を実装
  - トランザクション内で以下を実行:
    1. `slot_teacher`にINSERT/UPDATE（ON CONFLICT処理）
    2. `teacher_availability`を更新（is_available = FALSE）
    3. `audit_logs`に記録（action='ASSIGN'）
  - RPCテストを作成: `tests/database/migrations/rpc_assign_teacher.test.ts`
  - トランザクション整合性、ロールバックを検証
  - _要件: REQ-10（講師割当の確定）_

- [x] **4.2 割当変更・解除RPC関数の作成（テスト先行）**
  - マイグレーションファイルを作成: `supabase/migrations/20260211000008_rpc_change_unassign.sql`
  - `change_teacher(p_slot_id, p_new_teacher_id, p_assigned_by)` 関数を実装:
    1. 現在の講師の空き枠を復元（is_available = TRUE）
    2. 新しい講師を割当（slot_teacher更新、teacher_availability消化）
    3. `audit_logs`に記録（action='CHANGE'、変更前後の講師IDを含む）
  - `unassign_teacher(p_slot_id, p_assigned_by)` 関数を実装:
    1. `slot_teacher`から削除
    2. 講師の空き枠を復元（is_available = TRUE）
    3. `audit_logs`に記録（action='UNASSIGN'）
  - RPCテストを作成: `tests/database/migrations/rpc_change_unassign.test.ts`
  - トランザクション整合性、ロールバックを検証
  - _要件: REQ-11（講師割当の変更・解除）_

- [x] **4.3 Undo機能用RPC関数の作成（テスト先行）**
  - RPCテストを作成: `undo_assignment(slot_id, prev_teacher_id, actor_id)` の動作を定義
  - `undo_assignment()` 関数を実装:
    1. 引数の`prev_teacher_id`に基づいて状態を復元
    2. prev_teacher_id が NULL なら割当を削除、それ以外なら講師を戻す
    3. 空き枠の状態を元に戻す
    4. `audit_logs`に記録（action='UNDO'）
  - RPCテストを実行して、Undo操作が正しく動作することを確認
  - _要件: REQ-12（Undo機能）_

- [x] **4.4 監査ログ記録用トリガーの作成**
  - トリガー関数を作成: `log_teacher_changes()` （teachers, students等の変更を自動記録）
  - teachersテーブルにトリガーを設定（INSERT, UPDATE, DELETE）
  - studentsテーブルにトリガーを設定
  - teacher_availabilityテーブルにトリガーを設定
  - トリガーテストを作成: データ変更時にaudit_logsに自動記録されることを確認
  - _要件: REQ-14（監査ログ）_

### 5. Supabase Edge Functions（CSV処理）

- [x] **5.1 CSVインポートEdge Functionの作成（テスト先行）**
  - テストを作成: CSVファイルのバリデーションとインポート動作を定義
  - Edge Function: `supabase/functions/csv-import/index.ts`
  - FormDataからCSVファイルを受け取り、パース
  - バリデーション実装:
    - 必須項目の欠損チェック
    - データ型の一致チェック
    - 外部キー整合性チェック（存在しないID参照）
    - 重複キーチェック
  - エラーがある場合は、行番号と理由を含むエラーリストを返す
  - エラーがない場合は、Supabaseクライアントで一括upsert
  - テストを実行して、正常系・異常系の動作を確認
  - _要件: REQ-15（CSV入出力・インポート）_

- [x] **5.2 CSVエクスポートEdge Functionの作成（テスト先行）**
  - テストを作成: CSVエクスポートの動作を定義
  - Edge Function: `supabase/functions/csv-export/index.ts`
  - データ種別（teachers, students, slots, etc.）を受け取る
  - Supabaseクライアントで全レコードを取得
  - CSV形式に変換（ヘッダー付き）
  - ファイル名に日時を含める（例: `teachers_20260210_153000.csv`）
  - 個人情報含む場合の確認フラグを返す
  - テストを実行して、正しいCSVが生成されることを確認
  - _要件: REQ-16（CSV入出力・エクスポート）_

---

## Phase 2: フロントエンド基盤構築

### 6. フロントエンドプロジェクトのセットアップ

- [x] **6.1 React + TypeScript + Viteプロジェクトの初期化**
  - Task 1.2で完了: Vite + React + TypeScript プロジェクト
  - 依存関係をインストール済み:
    - `@supabase/supabase-js`、`@reduxjs/toolkit`、`react-redux`
    - `@mui/material`、`@emotion/react`、`@emotion/styled`
    - `react-hook-form`、`zod`、`react-router-dom`
  - `tsconfig.json`、ESLint、Prettier設定済み
  - _要件: 開発環境の整備_

- [x] **6.2 プロジェクト構造とSupabaseクライアントの設定**
  - Task 1.2で完了: ディレクトリ構造作成済み
  - `src/lib/supabase.ts`を作成: Supabaseクライアント初期化完了
  - `src/types/database.ts`を作成: Database型定義
  - 環境変数の読み込み設定完了
  - _要件: アーキテクチャ基盤_

### 7. TypeScript型定義とインターフェースの作成

- [x] **7.1 ドメインエンティティの型定義**
  - `src/types/entities.ts`を作成完了
  - 以下の型を定義完了:
    - `User`, `Teacher`, `TeacherSkill`, `TeacherAvailability`
    - `Student`, `StudentNG`, `Koma`, `Slot`, `SlotStudent`, `SlotTeacher`
    - `AuditLog`, `Settings`, `BoardSlot`
    - `TeacherCandidate`, `RecommendationResult`
  - _要件: 全体のデータモデル_

- [x] **7.2 推薦エンジン用の型定義**
  - `src/types/entities.ts`に統合完了
  - 以下の型を定義完了:
    - `TeacherCandidate` （score, reasons, hardConstraints含む）
    - `RecommendationResult`, `ApiError`, `ApiResponse`
  - _要件: REQ-7, REQ-8（講師推薦エンジン）_

### 8. Supabase統合とAPI層の実装（テスト先行）

- [x] **8.1 認証サービスの実装（テスト先行）**
  - テストを作成: `tests/unit/services/auth.test.ts`
  - `src/services/auth.ts`を作成完了
  - 以下の関数を実装完了:
    - `signIn(email, password)` → JWT取得
    - `signOut()` → ログアウト
    - `getUser()` → 現在のユーザー情報取得
    - `getSession()` → セッション情報取得
    - `getUserRole()` → ロール取得
    - `isAuthenticated()`, `isAdmin()`, `isTeacher()`, `isViewer()` → ロールチェック
  - _要件: REQ-1（ロール・権限管理）_

- [x] **8.2 講師API層の実装（テスト先行）**
  - `src/services/teachers.ts`を作成完了
  - Supabase REST APIを使用して以下を実装完了:
    - `createTeacher(data)` → 新規講師登録
    - `getTeacher(id, options)` → 講師詳細取得（スキル・空き枠含む）
    - `updateTeacher(id, data)` → 講師情報更新
    - `listTeachers(activeOnly)` → 講師一覧取得
    - `deleteTeacher(id)` → 講師削除（ソフトデリート）
    - `addTeacherSkill(teacherId, skill)` → スキル追加
    - `removeTeacherSkill(teacherId, subject)` → スキル削除
    - `getTeacherSkills(teacherId)` → スキル一覧取得
    - `setTeacherAvailability(teacherId, slotId, isAvailable)` → 空き枠設定
    - `getTeacherAvailability(teacherId)` → 空き枠一覧取得
  - RLSポリシーが適用されることを確認
  - テストを実行
  - _要件: REQ-3（講師マスタ管理）_

- [x] **8.3 生徒API層の実装（テスト先行）**
  - `src/services/students.ts`を作成完了
  - Supabase REST APIを使用して以下を実装完了:
    - `createStudent(data)` → 新規生徒登録
    - `getStudent(id, options)` → 生徒詳細取得（教科・NG講師含む）
    - `updateStudent(id, data)` → 生徒情報更新
    - `listStudents(activeOnly)` → 生徒一覧取得
    - `deleteStudent(id)` → 生徒削除（ソフトデリート）
    - `addStudentSubject(studentId, subject)` → 教科追加
    - `removeStudentSubject(studentId, subject)` → 教科削除
    - `getStudentSubjects(studentId)` → 教科一覧取得
    - `addStudentNgTeacher(studentId, teacherId)` → NG講師追加
    - `removeStudentNgTeacher(studentId, teacherId)` → NG講師削除
    - `getStudentNgTeachers(studentId)` → NG講師一覧取得
    - `isTeacherNgForStudent(studentId, teacherId)` → NG講師チェック
  - _要件: REQ-4（生徒マスタ管理）_

- [x] **8.4 スロットAPI層の実装（テスト先行）**
  - `src/services/slots.ts`を作成完了
  - Supabase REST APIとRPCを使用して以下を実装完了:
    - `getAllSlots()` → 全スロット取得（35スロット）
    - `getSlot(slotId)` → スロット詳細取得
    - `getSlotsByDay(day)` → 曜日別スロット取得
    - `getAllBoardSlots()` → 全ボードスロット取得（生徒+講師）
    - `getBoardSlot(slotId)` → ボードスロット詳細取得
    - `assignStudentToSlot(slotId, seat, studentId, subject, grade)` → 生徒配置
    - `removeStudentFromSlot(slotId, seat)` → 生徒削除
    - `getSlotStudents(slotId)` → スロット内生徒取得
    - `assignTeacherToSlot(slotId, teacherId, assignedBy)` → 講師割当（RPC）
    - `changeTeacherForSlot(slotId, newTeacherId, assignedBy)` → 講師変更（RPC）
    - `unassignTeacherFromSlot(slotId, assignedBy)` → 講師割当解除（RPC）
    - `getSlotTeacher(slotId)` → スロット内講師取得
  - _要件: REQ-5（授業枠管理）、REQ-10、REQ-11（講師割当）_

- [x] **8.5 推薦エンジンの実装**
  - `src/services/recommendation.ts`を作成完了
  - 5つのハード制約を実装完了:
    - `hasAvailability` → 講師が当該スロットで入塾可能
    - `canTeachAllSubjects` → 生徒全員の科目を教えられる
    - `notInNGList` → NGリストに含まれていない
    - `allowsPair` → ペア受講の場合、講師がペア受講可能
    - `underCapacity` → 週コマ数・生徒数の上限に余裕がある
  - 3つのソフト制約（スコアリング）を実装完了:
    - 負荷分散スコア: 現在の担当コマ数が少ないほど高スコア
    - 継続性スコア: 過去に担当した生徒が多いほど高スコア
    - 学年差スコア: 生徒間の学年差が小さいほど高スコア
  - 以下の関数を実装完了:
    - `getRecommendedTeachers(slotId)` → 推薦結果取得
    - `getTopRecommendations(slotId, limit)` → 上位N件の推薦取得
  - `slots.ts`、`teachers.ts`を更新してオプション対応
  - _要件: REQ-7（推薦エンジン）、REQ-8（制約適用）_

- [x] **8.6 講師空き枠API層の実装（テスト先行）**
  - テストを作成: `src/services/availability.test.ts`（空き枠取得、トグル）
  - `src/services/availability.ts`を作成
  - Supabase REST APIを使用して以下を実装:
    - `getMyAvailability()` → 自分の空き枠取得（RLSで自動フィルタ）
    - `toggleAvailability(slotId, isAvailable)` → 空き枠トグル（UPSERT）
    - `getTeacherAvailability(teacherId)` → 指定講師の空き枠取得（admin用）
  - テストを実行
  - _要件: REQ-6（講師空き枠管理）_

- [x] **8.6 割当操作API層の実装（テスト先行）**
  - テストを作成: `src/services/assignments.test.ts`（割当、変更、解除、Undo）
  - `src/services/assignments.ts`を作成
  - Supabase RPC APIを使用して以下を実装:
    - `assignTeacher(slotId, teacherId)` → `supabase.rpc('assign_teacher', ...)`
    - `changeTeacher(slotId, newTeacherId)` → `supabase.rpc('change_teacher', ...)`
    - `unassignTeacher(slotId)` → `supabase.rpc('unassign_teacher', ...)`
    - `undoAssignment(slotId, prevTeacherId)` → `supabase.rpc('undo_assignment', ...)`
  - テストを実行
  - _要件: REQ-10, REQ-11, REQ-12（割当操作、Undo）_

- [x] **8.7 設定API層の実装**
  - `src/services/settings.ts`を作成完了
  - Supabase REST APIを使用して以下を実装完了:
    - `getSettings()` → 設定取得（id=1のシングルトンレコード）
    - `updateSettings(data)` → 設定更新
    - `resetSettings()` → デフォルト値にリセット
  - DB ↔ Domain マッピング関数を実装完了
  - _要件: REQ-17（システム設定管理）_

- [x] **8.8 監査ログAPI層の実装**
  - `src/services/auditLogs.ts`を作成完了
  - Supabase REST APIを使用して以下を実装完了:
    - `getAuditLogs(filters)` → 監査ログ取得（actor_id, action, created_atでフィルタ）
    - `getUserAuditLogs(actorId, limit)` → ユーザー別ログ取得
    - `getActionAuditLogs(action, limit)` → アクション別ログ取得
    - `getRecentAuditLogs(limit)` → 最新ログ取得
    - `createAuditLog(actorId, action, payload)` → ログ作成
    - `exportAuditLogsToCSV(filters)` → CSV形式でエクスポート
    - `getAuditLogStatistics(startDate, endDate)` → 統計情報取得
  - DB ↔ Domain マッピング関数を実装完了
  - _要件: REQ-14（監査ログ）_

---

## Phase 3: コア機能の実装

### 9. クライアント側推薦エンジンの実装（テスト先行）

- [x] **9.1 ハード制約フィルタリングの実装（テスト先行）**
  - `src/services/recommendations.ts`を作成
  - `filterAndScoreTeachers()` 関数を実装（ハード制約チェック）:
    - 空き枠チェック: `teacher_availability_v2`でis_available=trueのみ
    - 教科・学年チェック: 全生徒に対応できるか（teacher_skills）
    - NG講師チェック: `student_ng`に含まれる講師を除外
    - 1:2可否チェック: `allow_pair`フラグ
    - ~~上限チェック~~: **削除**（ユーザー要望により不要）
  - _要件: REQ-7（講師推薦エンジン・ハード制約）_

- [x] **9.2 ソフト条件スコアリングの実装（テスト先行）**
  - `filterAndScoreTeachers()` 内でスコアリング実装:
    - 負荷スコア: 現在の担当コマ数が少ない順（今週の割当数カウント）
    - スコアの合計でソート（降順）
    - 推薦理由（reasons配列）を生成（負荷なし/低/中/高）
  - _要件: REQ-8（講師推薦エンジン・ソフト条件）_

- [x] **9.3 推薦エンジンの統合と候補取得関数の実装（テスト先行）**
  - `getTeacherCandidates(slotId, slotDay, slotKomaCode, slotStudents)` 関数を実装:
    1. 必要なデータを並列取得（Promise.all、サーバー負荷最小化）:
       - 講師一覧、スキル、空き枠、今週の割当、NG講師
    2. `filterAndScoreTeachers()` を呼び出し
    3. `CandidateTeacher[]` を返す（スコア順ソート済み）
  - `TeacherSelectModal.tsx`に統合完了
  - _要件: REQ-7, REQ-8（講師推薦エンジン）_

- [x] **9.4 候補ゼロ時の理由集計機能の実装（テスト先行）**
  - テストを作成: `getRejectionReasons(slot, teachers)` 関数のテスト
  - `getRejectionReasons()` 関数を実装:
    - 各講師について、ハード制約を満たさない理由を集計
    - 理由の種類: 空き枠なし、教科・学年NG、NG講師、1:2不可、上限到達
    - 理由ごとの件数を返す（`Record<string, number>`）
  - テストを実行
  - _要件: REQ-9（候補講師リスト表示）_

### 10. Redux Storeとグローバル状態管理

- [x] **10.1 Redux Storeの初期化とスライス構造の設計**
  - `src/store/index.ts`を作成完了: Redux Toolkit でstoreを設定
  - 以下のスライスを作成完了:
    - `authSlice`: ユーザー認証状態（user, session, role）
    - `scheduleSlice`: 週次スケジュール状態（slots）
    - `undoSlice`: Undo履歴（lastOperation）
    - `uiSlice`: UI状態（loading, error, modals）
  - `src/store/hooks.ts`を作成: 型付きフック（useAppDispatch, useAppSelector）
  - _要件: 状態管理基盤_

- [x] **10.2 認証スライスの実装**
  - `src/store/authSlice.ts`を実装完了:
    - 状態: `user`, `session`, `role`, `loading`, `error`
    - アクション: `setUser`, `setSession`, `setRole`, `setError`, `clearError`
    - Thunk: `loginAsync`, `logoutAsync`, `checkAuthAsync`
    - セレクター: `selectUser`, `selectRole`, `selectIsAuthenticated`, `selectIsAdmin`, `selectIsTeacher`, `selectIsViewer`
  - _要件: REQ-1（ロール・権限管理）_

- [x] **10.3 スケジュールスライスの実装**
  - `src/store/scheduleSlice.ts`を実装完了:
    - 状態: `slots` （Record<string, BoardSlot>）、`loading`, `error`, `lastUpdated`
    - アクション: `setSlots`, `updateSlot`, `setError`, `clearError`
    - Thunk: `fetchScheduleAsync`, `fetchSlotAsync`, `assignTeacherAsync`, `changeTeacherAsync`, `unassignTeacherAsync`
    - セレクター: `selectAllSlots`, `selectSlotById`, `selectSlotsByDay`, `selectScheduleLoading`
  - _要件: REQ-5, REQ-13（授業枠管理、割当ボード表示）_

- [x] **10.4 Undoスライスの実装**
  - `src/store/undoSlice.ts`を実装完了:
    - 状態: `lastOperation` （type, slotId, prevTeacherId, newTeacherId, timestamp）
    - アクション: `saveUndoSnapshot`, `clearUndoSnapshot`
    - セレクター: `selectLastOperation`, `selectCanUndo`
  - _要件: REQ-12（Undo機能）_

### 11. UIコンポーネントの実装（テスト先行）

- [x] **11.1 基礎UIコンポーネントの実装（テスト先行）**
  - テストを作成: 基礎コンポーネントのレンダリング・プロップステスト
  - 以下のコンポーネントを作成（Material-UIをベースに）:
    - `Button` （カスタムスタイル）
    - `Input` （バリデーション表示機能）
    - `Select` （ドロップダウン）
    - `Modal` （共通モーダル）
    - `Toast` （通知トースト）
  - テストを実行して、コンポーネントが正しくレンダリングされることを確認
  - _要件: UI基盤_

- [ ] **11.2 認証フォームコンポーネントの実装（テスト先行）**
  - テストを作成: `LoginForm`, `RegisterForm`のレンダリング・バリデーション・送信テスト
  - `src/components/auth/LoginForm.tsx`を作成:
    - React Hook Form + Zodでバリデーション
    - メール・パスワード入力フィールド
    - ログインボタン（Redux Thunk `loginAsync`を呼び出し）
    - エラー表示
  - `src/components/auth/RegisterForm.tsx`を作成（同様）
  - テストを実行
  - _要件: REQ-1（ロール・権限管理）_

- [ ] **11.3 講師・生徒マスタフォームコンポーネントの実装（テスト先行）**
  - テストを作成: `TeacherForm`, `StudentForm`のレンダリング・バリデーション・送信テスト
  - `src/components/forms/TeacherForm.tsx`を作成:
    - 講師の基本情報入力（名前、上限コマ数、同時担当生徒数、1:2可否）
    - スキル追加・削除（教科、対応学年範囲）
    - React Hook Form + Zodでバリデーション
    - 保存ボタン（teachers.tsのcreateTeacher/updateTeacherを呼び出し）
  - `src/components/forms/StudentForm.tsx`を作成:
    - 生徒の基本情報入力（名前、学年）
    - 受講教科追加・削除
    - NG講師追加・削除
    - React Hook Form + Zodでバリデーション
    - 保存ボタン（students.tsのcreateStudent/updateStudentを呼び出し）
  - テストを実行
  - _要件: REQ-3, REQ-4（講師マスタ管理、生徒マスタ管理）_

- [ ] **11.4 週次カレンダーコンポーネントの実装（テスト先行）**
  - テストを作成: `WeekCalendar`のレンダリング・クリックイベントテスト
  - `src/components/availability/WeekCalendar.tsx`を作成:
    - 週次グリッド表示（MON-SUN × コマ0,1,A,B,C）
    - 各セルは空き枠の状態を表示（ON/OFF）
    - セルクリックでトグル（availability.tsのtoggleAvailabilityを呼び出し）
    - 講師ページで使用（自分の空き枠のみ編集可能）
  - テストを実行
  - _要件: REQ-6（講師空き枠管理）_

- [ ] **11.5 割当ボードのスロットセルコンポーネントの実装（テスト先行）**
  - テストを作成: `SlotCell`のレンダリング・クリックイベントテスト
  - `src/components/board/SlotCell.tsx`を作成:
    - 先生欄（上部）: 講師名を表示、クリックで候補モーダルを開く
    - 生徒枠（下部）: 最大2段、各段に「学年・教科」「生徒名」を表示
    - 空白の座席は空で表示
    - 管理者のみクリック可能（ロールチェック）
  - テストを実行
  - _要件: REQ-13（割当ボード表示）_

- [ ] **11.6 候補講師リストモーダルコンポーネントの実装（テスト先行）**
  - テストを作成: `CandidateModal`のレンダリング・選択・確定テスト
  - `src/components/board/CandidateModal.tsx`を作成:
    - スロットIDを受け取り、`getCandidates(slotId)`を呼び出し
    - 候補講師リストを表示（スコア順）:
      - 講師名
      - 推薦理由（reasons配列）
      - 負荷（今日のコマ数、週のコマ数）
    - 候補ゼロの場合: 理由集計を表示（`getRejectionReasons`）
    - 講師選択ボタン: ハイライト表示
    - 確定ボタン: `assignTeacher`を呼び出し、Redux storeを更新
  - テストを実行
  - _要件: REQ-9, REQ-10（候補講師リスト表示、講師割当の確定）_

- [ ] **11.7 割当ボードメインコンポーネントの実装（テスト先行）**
  - テストを作成: `AssignmentBoard`のレンダリング・グリッド表示テスト
  - `src/components/board/AssignmentBoard.tsx`を作成:
    - Redux storeから週次スケジュール（slots）を取得
    - 週次グリッドを表示（曜日×コマ）
    - 各セルに`SlotCell`を配置
    - Undoボタン: Redux storeの`lastOperation`があれば有効化
    - Undoボタンクリック: `undoAssignment`を呼び出し、Redux storeを更新
  - テストを実行
  - _要件: REQ-13（割当ボード表示）、REQ-12（Undo機能）_

### 12. ページコンポーネントの実装（テスト先行）

- [ ] **12.1 ログインページの実装（テスト先行）**
  - テストを作成: `LoginPage`のレンダリング・ナビゲーションテスト
  - `src/pages/LoginPage.tsx`を作成:
    - `LoginForm`コンポーネントを配置
    - ログイン成功時に`/board`へリダイレクト
    - ロールに応じてページを振り分け（teacher → `/availability`）
  - テストを実行
  - _要件: REQ-1（ロール・権限管理）_

- [ ] **12.2 割当ボードページの実装（テスト先行）**
  - テストを作成: `BoardPage`のレンダリング・データ取得テスト
  - `src/pages/BoardPage.tsx`を作成:
    - ページロード時に`fetchScheduleAsync()`を呼び出し（Redux Thunk）
    - `AssignmentBoard`コンポーネントを配置
    - ローディング表示、エラー表示
  - テストを実行
  - _要件: REQ-13（割当ボード表示）_

- [x] **12.3 講師空き枠ページの実装（テスト先行）**
  - テストを作成: `AvailabilityPage`のレンダリング・データ取得テスト
  - `src/pages/AvailabilityPage.tsx`を作成:
    - ページロード時に`getMyAvailability()`を呼び出し
    - `WeekCalendar`コンポーネントを配置
    - 自分の担当一覧を表示（現在の割当）
    - 講師ロールのみアクセス可能
  - テストを実行
  - _要件: REQ-6（講師空き枠管理）_

- [ ] **12.4 マスタ管理ページの実装（テスト先行）**
  - テストを作成: `MasterDataPage`のレンダリング・CRUD操作テスト
  - `src/pages/MasterDataPage.tsx`を作成:
    - タブで講師・生徒・コマ・設定を切り替え
    - 各タブで一覧表示（MUIのDataGrid使用）
    - 新規作成・編集・削除ボタン
    - `TeacherForm`, `StudentForm`をモーダルで表示
    - 管理者ロールのみアクセス可能
  - テストを実行
  - _要件: REQ-3, REQ-4（講師マスタ管理、生徒マスタ管理）_

- [ ] **12.5 システム設定ページの実装（テスト先行）**
  - テストを作成: `SettingsPage`のレンダリング・設定更新テスト
  - `src/pages/SettingsPage.tsx`を作成:
    - ページロード時に`getSettings()`を呼び出し
    - ソフト条件の重み設定（load_weight, continuity_weight, grade_diff_weight）
    - 1:2ルール設定（pair_same_subject_required, pair_max_grade_diff）
    - 保存ボタン: `updateSettings`を呼び出し
    - 管理者ロールのみアクセス可能
  - テストを実行
  - _要件: REQ-17（システム設定管理）_

- [ ] **12.6 監査ログページの実装（テスト先行）**
  - テストを作成: `AuditLogPage`のレンダリング・フィルタリングテスト
  - `src/pages/AuditLogPage.tsx`を作成:
    - ページロード時に`getAuditLogs()`を呼び出し
    - 監査ログ一覧を表示（MUIのDataGrid使用）
    - フィルタリング機能（操作者、操作種別、日時範囲）
    - 管理者ロールのみアクセス可能
  - テストを実行
  - _要件: REQ-14（監査ログ）_

- [ ] **12.7 CSV入出力ページの実装（テスト先行）**
  - テストを作成: `CSVPage`のレンダリング・インポート/エクスポートテスト
  - `src/pages/CSVPage.tsx`を作成:
    - インポートセクション:
      - データ種別選択（teachers, students, slots, etc.）
      - ファイルアップロード
      - Edge Function `csv-import`を呼び出し
      - エラー表示（行番号・理由）
    - エクスポートセクション:
      - データ種別選択
      - エクスポートボタン: Edge Function `csv-export`を呼び出し
      - CSVファイルをダウンロード
    - 管理者ロールのみアクセス可能
  - テストを実行
  - _要件: REQ-15, REQ-16（CSV入出力）_

### 13. ルーティングとナビゲーションの実装

- [ ] **13.1 React Routerの設定と認証ガードの実装（テスト先行）**
  - テストを作成: ルーティング・認証ガード・ロールベースアクセス制御のテスト
  - `src/App.tsx`を作成:
    - React Routerでルートを設定:
      - `/login` → `LoginPage`
      - `/board` → `BoardPage` （admin, viewer）
      - `/availability` → `AvailabilityPage` （teacher）
      - `/master` → `MasterDataPage` （admin）
      - `/settings` → `SettingsPage` （admin）
      - `/audit-logs` → `AuditLogPage` （admin）
      - `/csv` → `CSVPage` （admin）
    - 認証ガードコンポーネント: `ProtectedRoute`
      - 未認証の場合は`/login`へリダイレクト
      - ロールチェック: 権限がない場合は403エラー表示
    - ナビゲーションバーを配置（ロールに応じてメニュー表示）
  - テストを実行
  - _要件: REQ-1（ロール・権限管理）_

---

## Phase 4: 統合とテスト

### 14. 統合テストの実装

- [ ] **14.1 認証フローの統合テスト**
  - テストを作成: ログイン → ダッシュボード表示 → ログアウトのフロー
  - Supabase Auth、Redux store、ルーティングが正しく連携することを確認
  - 異なるロールでのアクセス制御を検証
  - _要件: REQ-1（ロール・権限管理）_

- [ ] **14.2 講師割当フローの統合テスト**
  - テストを作成: 割当ボード表示 → 先生欄クリック → 候補表示 → 講師選択・確定
  - 推薦エンジン、API層、Redux store、UIコンポーネントが正しく連携することを確認
  - RPC関数、audit_logs記録、Undo履歴保存を検証
  - _要件: REQ-7, REQ-8, REQ-9, REQ-10（推薦エンジン、割当操作）_

- [ ] **14.3 講師空き枠入力フローの統合テスト**
  - テストを作成: 講師ログイン → 空き枠ページ表示 → スロットトグル → 保存
  - RLSポリシーが正しく適用され、講師は自分のデータのみ編集できることを確認
  - audit_logs記録を検証
  - _要件: REQ-6（講師空き枠管理）_

- [ ] **14.4 Undoフローの統合テスト**
  - テストを作成: 割当確定 → Undoボタンクリック → 状態復元
  - RPC関数、Redux store、UIが正しく連携することを確認
  - 空き枠の状態が元に戻ることを検証
  - _要件: REQ-12（Undo機能）_

- [ ] **14.5 CSVインポート/エクスポートの統合テスト**
  - テストを作成: CSVアップロード → バリデーション → インポート成功/失敗
  - エクスポートボタン → CSVダウンロード
  - Edge Functionsが正しく動作することを確認
  - _要件: REQ-15, REQ-16（CSV入出力）_

### 15. エンドツーエンド（E2E）テストの実装

- [ ] **15.1 Playwrightのセットアップ**
  - Playwrightをインストール・設定
  - テスト用のSupabaseプロジェクト（またはローカル環境）を準備
  - テストデータのシードスクリプトを作成
  - _要件: テスト環境の整備_

- [ ] **15.2 管理者の完全ワークフローE2Eテスト**
  - テストシナリオ:
    1. 管理者ログイン
    2. 講師・生徒マスタを登録
    3. 授業枠に生徒を配置
    4. 講師が空き枠を入力（別セッション）
    5. 割当ボードで候補講師を確認
    6. 講師を割り当てる
    7. Undoで取り消し
    8. 再度割り当てる
    9. 監査ログで履歴を確認
  - Playwrightで自動化
  - _要件: REQ-1〜REQ-14（全コア機能）_

- [ ] **15.3 講師ロールのワークフローE2Eテスト**
  - テストシナリオ:
    1. 講師ログイン
    2. 空き枠ページで週次カレンダーを表示
    3. 複数のスロットをトグルして空き枠を設定
    4. 自分の担当一覧を確認
    5. 割当ボードで自分の担当を閲覧（編集不可）
  - Playwrightで自動化
  - _要件: REQ-1, REQ-6（ロール・権限、空き枠管理）_

- [ ] **15.4 閲覧ロールのアクセス制御E2Eテスト**
  - テストシナリオ:
    1. 閲覧ユーザーログイン
    2. 割当ボードで閲覧のみ可能
    3. マスタ管理、設定、監査ログへのアクセスが拒否されることを確認
    4. 編集操作が無効化されていることを確認
  - Playwrightで自動化
  - _要件: REQ-1（ロール・権限管理）_

### 16. パフォーマンステストとバグ修正

- [ ] **16.1 割当ボード表示のパフォーマンステスト**
  - 目標: 3秒以内にページ描画（REQ: NFR-1）
  - 大量データ（講師100人、生徒500人、週35スロット）でテスト
  - ボトルネックを特定（DBクエリ、推薦エンジン、レンダリング）
  - 必要に応じて最適化（インデックス追加、クエリ最適化、メモ化）
  - _要件: 非機能要件（パフォーマンス）_

- [ ] **16.2 候補講師生成のパフォーマンステスト**
  - 目標: 2秒以内に結果を返す（REQ: NFR-2）
  - 推薦エンジンの処理時間を計測
  - 必要に応じて最適化（並列処理、キャッシュ）
  - _要件: 非機能要件（パフォーマンス）_

- [ ] **16.3 バグ修正とリファクタリング**
  - 統合テスト・E2Eテストで発見されたバグを修正
  - コードレビューでのフィードバックを反映
  - リファクタリング（重複コード削除、可読性向上）
  - _要件: コード品質の維持_

---

## Phase 5: デプロイ準備と最終検証

### 17. 本番環境へのデプロイ準備

- [ ] **17.1 Supabaseプロジェクトの本番設定**
  - 本番用Supabaseプロジェクトを作成（または既存プロジェクトを使用）
  - マイグレーションを本番環境に適用（`supabase db push`）
  - RLSポリシーが正しく適用されていることを確認
  - 初期データ（koma_master, settings）を投入
  - _要件: 本番環境の整備_

- [ ] **17.2 フロントエンドのビルドとデプロイ**
  - Viteで本番ビルドを実行（`npm run build`）
  - VercelまたはNetlifyにデプロイ
  - 環境変数を設定（`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`）
  - HTTPS、CORS設定を確認
  - _要件: 本番環境の整備_

- [ ] **17.3 Edge Functionsのデプロイ**
  - CSV処理Edge Functionsをデプロイ（`supabase functions deploy csv-import`, `csv-export`）
  - 本番環境で動作確認
  - _要件: 本番環境の整備_

- [ ] **17.4 本番環境での疎通テスト**
  - 本番環境で主要な機能が動作することを確認:
    - ログイン・ログアウト
    - 割当ボード表示
    - 講師割当操作
    - Undo機能
    - CSV入出力
  - 各ロールでのアクセス制御を検証
  - _要件: 本番環境の検証_

### 18. 最終検証とドキュメント整備

- [ ] **18.1 要件カバレッジの最終確認**
  - requirements.mdの全要件がタスクで実装されたことを確認
  - 未実装の要件があれば追加タスクを作成
  - _要件: 全要件のカバレッジ_

- [ ] **18.2 セキュリティ最終チェック**
  - RLSポリシーが全テーブルで有効化されていることを確認
  - 認証ガードが全保護ルートで機能していることを確認
  - パスワードハッシュ化、JWT署名が正しく設定されていることを確認
  - OWASP Top 10対策が実装されていることを確認
  - _要件: 非機能要件（セキュリティ）_

- [ ] **18.3 ユーザーマニュアルの作成**
  - 管理者向けマニュアル: マスタ管理、割当操作、CSV入出力、設定変更
  - 講師向けマニュアル: 空き枠入力、担当確認
  - 閲覧ユーザー向けマニュアル: 割当ボード閲覧
  - トラブルシューティングガイド
  - _要件: ドキュメント整備_

- [ ] **18.4 開発者向けドキュメントの作成**
  - README.md: プロジェクト概要、セットアップ手順、開発方法
  - API仕様書: Supabase REST API、RPC、Edge Functionsのエンドポイント一覧
  - データベーススキーマ図
  - アーキテクチャ図
  - _要件: ドキュメント整備_

---

## 完了条件

- [ ] 全タスクが完了している
- [ ] 全テスト（ユニット、統合、E2E）が成功している
- [ ] 要件ドキュメントの全要件が実装されている
- [ ] パフォーマンス目標（割当ボード3秒、候補生成2秒）を達成している
- [ ] セキュリティチェックリストが完了している
- [ ] 本番環境で主要機能が動作している
- [ ] ユーザーマニュアル・開発者ドキュメントが整備されている

---

**STATUS**: タスク生成完了
**NEXT STEP**: `/kiro:spec-impl teacher-assignment-system` で実装フェーズを開始
