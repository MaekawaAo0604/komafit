# 実装計画

## フェーズ1: データベース基盤とRPC関数

### 1. データベーステーブルの作成

- [x] 1.1 recurring_assignmentsテーブルのマイグレーションファイル作成
  - マイグレーションファイル `YYYYMMDDHHMMSS_create_recurring_assignments.sql` を作成
  - `recurring_assignments` テーブル定義を実装（id, teacher_id, day_of_week, time_slot_id, student_id, subject, start_date, end_date, active, created_at, updated_at, created_by）
  - 制約を追加: UNIQUE(teacher_id, day_of_week, time_slot_id, student_id, start_date), CHECK (day_of_week >= 0 AND day_of_week <= 6), CHECK (end_date IS NULL OR end_date >= start_date)
  - 外部キー制約を設定: teacher_id → teachers(id), student_id → students(id), time_slot_id → time_slots(id), created_by → users(id)
  - インデックスを作成: idx_recurring_assignments_teacher, idx_recurring_assignments_student, idx_recurring_assignments_day_slot, idx_recurring_assignments_active, idx_recurring_assignments_dates
  - マイグレーションを実行してテーブルが正しく作成されることを確認
  - _Requirements: 1.1, 1.2, 7.1_

- [x] 1.2 assignment_exceptionsテーブルのマイグレーションファイル作成
  - マイグレーションファイル `YYYYMMDDHHMMSS_create_assignment_exceptions.sql` を作成
  - `assignment_exceptions` テーブル定義を実装（id, pattern_id, date, exception_type, created_at, created_by）
  - 制約を追加: UNIQUE(pattern_id, date), CHECK (exception_type IN ('cancelled', 'modified'))
  - 外部キー制約を設定: pattern_id → recurring_assignments(id) ON DELETE CASCADE, created_by → users(id)
  - インデックスを作成: idx_assignment_exceptions_pattern, idx_assignment_exceptions_date
  - マイグレーションを実行してテーブルが正しく作成されることを確認
  - _Requirements: 4.1, 4.2_

### 2. RPC関数の実装（パターンCRUD）

- [x] 2.1 create_recurring_assignment RPC関数の実装とテスト
  - マイグレーションファイル `YYYYMMDDHHMMSS_create_recurring_assignment_rpc.sql` を作成
  - RPC関数シグネチャを定義: `create_recurring_assignment(p_teacher_id UUID, p_day_of_week INTEGER, p_time_slot_id VARCHAR, p_student_id UUID, p_subject VARCHAR, p_start_date DATE, p_end_date DATE, p_active BOOLEAN)`
  - 権限チェック実装: auth.uid()を取得し、講師本人または管理者かを確認（講師は自分のteacher_idのみ許可）
  - 制約チェック実装: 講師・生徒・時間帯の存在確認、講師スキルと生徒科目のバリデーション
  - 重複チェック実装: 同じ組み合わせ（teacher_id, day_of_week, time_slot_id, student_id, start_date）の既存パターンを検索
  - INSERT処理実装: recurring_assignmentsテーブルにレコードを挿入
  - 監査ログ記録: audit_logsテーブルにaction='RECURRING_PATTERN_CREATE'を記録
  - エラーハンドリング: 権限エラー（PERMISSION_DENIED）、重複エラー（DUPLICATE_PATTERN）、バリデーションエラー（VALIDATION_ERROR）
  - 統合テストを作成: 正常系（パターン作成成功）、重複エラー、権限エラー、バリデーションエラーのテストケース
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.5_

- [x] 2.2 update_recurring_assignment RPC関数の実装とテスト
  - マイグレーションファイル `YYYYMMDDHHMMSS_update_recurring_assignment_rpc.sql` を作成
  - RPC関数シグネチャを定義: `update_recurring_assignment(p_pattern_id UUID, p_student_id UUID, p_subject VARCHAR, p_end_date DATE, p_active BOOLEAN)`
  - 権限チェック実装: パターンの所有者（teacher_id）が現在のユーザーまたは管理者かを確認
  - 存在確認: pattern_idでパターンを取得、存在しない場合はRESOURCE_NOT_FOUNDエラー
  - バリデーション: 変更後のstudent_id、subjectの妥当性を確認
  - UPDATE処理実装: 指定されたフィールドのみを更新、updated_atを自動更新
  - 監査ログ記録: audit_logsテーブルにaction='RECURRING_PATTERN_UPDATE'、変更内容をJSON形式で記録
  - 統合テストを作成: 正常系（各フィールドの更新）、権限エラー、存在しないパターン、バリデーションエラー
  - _Requirements: 2.4, 2.5, 2.8, 6.3, 6.5_

- [x] 2.3 delete_recurring_assignment RPC関数の実装とテスト
  - マイグレーションファイル `YYYYMMDDHHMMSS_delete_recurring_assignment_rpc.sql` を作成
  - RPC関数シグネチャを定義: `delete_recurring_assignment(p_pattern_id UUID) RETURNS BOOLEAN`
  - 権限チェック実装: パターンの所有者または管理者かを確認
  - トランザクション開始: BEGIN
  - 例外レコード削除: assignment_exceptionsテーブルからpattern_id一致レコードを削除（CASCADE設定により自動削除されるが明示的に実行）
  - パターン削除: recurring_assignmentsテーブルからレコードを物理削除
  - 個別アサイン保持確認: assignmentsテーブルのレコードは削除しない
  - 監査ログ記録: audit_logsテーブルにaction='RECURRING_PATTERN_DELETE'を記録
  - トランザクションコミット: COMMIT
  - 統合テストを作成: 正常系（削除成功、例外も削除、個別アサイン保持）、権限エラー、存在しないパターン
  - _Requirements: 2.6, 2.7, 6.5, 7.7_

- [x] 2.4 list_recurring_assignments RPC関数の実装とテスト
  - マイグレーションファイル `YYYYMMDDHHMMSS_list_recurring_assignments_rpc.sql` を作成
  - RPC関数シグネチャを定義: `list_recurring_assignments(p_teacher_id UUID, p_active_only BOOLEAN) RETURNS TABLE (...)`
  - 権限チェック実装: 講師ロールの場合は自分のteacher_idのみ、管理者・viewerは全件取得可能
  - フィルタリング実装: p_teacher_idが指定された場合はteacher_idでフィルタ、p_active_only=trueの場合はactive=trueのみ
  - JOIN実装: teachers, students, time_slotsテーブルをJOINして関連情報を取得
  - ORDER BY実装: day_of_week ASC, time_slot_id ASC でソート
  - 戻り値定義: id, teacher_id, teacher_name, day_of_week, time_slot_id, time_slot_label, student_id, student_name, subject, start_date, end_date, active, created_at, updated_at
  - 統合テストを作成: 正常系（全件取得、teacher_idフィルタ、activeフィルタ）、権限チェック（講師は自分のみ）
  - _Requirements: 2.1, 2.2, 2.3, 6.2_

### 3. RPC関数の実装（カレンダー統合と例外処理）

- [x] 3.1 get_monthly_calendar_with_patterns RPC関数の実装（前半: パターン展開ロジック）
  - マイグレーションファイル `YYYYMMDDHHMMSS_get_monthly_calendar_with_patterns_rpc.sql` を作成
  - RPC関数シグネチャを定義: `get_monthly_calendar_with_patterns(p_year INTEGER, p_month INTEGER, p_teacher_id UUID) RETURNS TABLE (...)`
  - 月の日付範囲計算: p_year, p_monthから開始日（月初）と終了日（月末）を計算
  - パターン取得: recurring_assignmentsテーブルから該当月に有効なパターンを取得（start_date <= 月末 AND (end_date IS NULL OR end_date >= 月初) AND active = TRUE）
  - p_teacher_idフィルタ: 指定された場合はteacher_idでフィルタ
  - 曜日マッピングロジック実装: 各パターンについて、月内の該当曜日の日付リストを生成（GENERATE_SERIES使用）
  - 日付フィルタリング: パターンのstart_date以降、end_date以前（またはNULL）の日付のみを含める
  - 統合テストを作成: 正常系（複数パターンの展開、開始日・終了日の境界チェック、無期限パターン）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 get_monthly_calendar_with_patterns RPC関数の実装（後半: 統合と優先順位）
  - 個別アサイン取得: assignmentsテーブルから該当月・該当講師のレコードを取得
  - 例外処理取得: assignment_exceptionsテーブルから該当月のレコードを取得（pattern_idでJOIN）
  - 優先順位マージロジック実装:
    1. 例外処理（cancelled）が存在する日付・コマは data_source='exception', exception_type='cancelled' として扱う
    2. 個別アサインが存在する日付・コマは data_source='assignment' として優先
    3. それ以外はパターンから展開された data_source='pattern' として扱う
  - UNION ALLで統合: 例外、個別アサイン、パターンの3つのデータセットをUNION ALL
  - 重複排除: ROW_NUMBER() OVER (PARTITION BY date, time_slot_id, teacher_id ORDER BY priority) を使用して優先度の高いレコードのみを選択
  - 戻り値定義: date, time_slot_id, teacher_id, teacher_name, data_source, is_available, student_id, student_name, student_grade, subject, position, pattern_id, exception_type
  - 統合テストを作成: 優先順位テスト（例外>個別>パターン）、複数データソース混在、フィルタリング
  - _Requirements: 3.5, 3.6, 3.7, 5.1, 5.2, 7.4_

- [x] 3.3 create_assignment_exception RPC関数の実装とテスト
  - マイグレーションファイル `YYYYMMDDHHMMSS_create_assignment_exception_rpc.sql` を作成
  - RPC関数シグネチャを定義: `create_assignment_exception(p_pattern_id UUID, p_date DATE, p_exception_type VARCHAR) RETURNS assignment_exceptions`
  - 権限チェック実装: パターンの所有者または管理者かを確認
  - パターン存在確認: pattern_idでrecurring_assignmentsテーブルを検索、存在しない場合はRESOURCE_NOT_FOUNDエラー
  - 日付バリデーション: p_dateがパターンのstart_date以降、end_date以前（またはNULL）であることを確認
  - 重複チェック: 同じpattern_id, dateの例外が既に存在する場合はDUPLICATE_EXCEPTIONエラー
  - INSERT処理実装: assignment_exceptionsテーブルにレコードを挿入
  - 監査ログ記録: audit_logsテーブルにaction='ASSIGNMENT_EXCEPTION_CREATE'を記録
  - 統合テストを作成: 正常系（cancelled/modified）、重複エラー、権限エラー、日付範囲外エラー
  - _Requirements: 4.1, 4.2, 4.3, 6.5_

### 4. RLSポリシーの設定

- [x] 4.1 recurring_assignments テーブルのRLSポリシー設定
  - マイグレーションファイル `YYYYMMDDHHMMSS_recurring_assignments_rls_policies.sql` を作成
  - RLS有効化: `ALTER TABLE recurring_assignments ENABLE ROW LEVEL SECURITY;`
  - SELECT ポリシー: 管理者は全件、viewerは全件、講師は自分のパターンのみ閲覧可能
  - INSERT ポリシー: 管理者と講師のみ可能、講師は自分のteacher_idのみ
  - UPDATE ポリシー: 管理者は全件、講師は自分のパターンのみ更新可能
  - DELETE ポリシー: 管理者は全件、講師は自分のパターンのみ削除可能
  - テスト: 各ロール（admin, teacher, viewer）でポリシーが正しく動作することを確認
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4.2 assignment_exceptions テーブルのRLSポリシー設定
  - マイグレーションファイル `YYYYMMDDHHMMSS_assignment_exceptions_rls_policies.sql` を作成
  - RLS有効化: `ALTER TABLE assignment_exceptions ENABLE ROW LEVEL SECURITY;`
  - SELECT ポリシー: パターンのRLSと同じロジック（recurring_assignmentsを通じて権限チェック）
  - INSERT ポリシー: パターンの所有者または管理者のみ
  - DELETE ポリシー: パターンの所有者または管理者のみ
  - テスト: 各ロールでポリシーが正しく動作することを確認
  - _Requirements: 6.1, 6.2, 6.3_

## フェーズ2: フロントエンドサービス層

### 5. TypeScript型定義とサービス層基盤

- [x] 5.1 RecurringAssignment関連の型定義を追加
  - `src/types/entities.ts` に以下の型を追加:
    - `RecurringAssignment` インターフェース（id, teacherId, dayOfWeek, timeSlotId, studentId, subject, startDate, endDate, active, createdAt, updatedAt, createdBy, teacher?, student?, timeSlot?, createdByUser?）
    - `RecurringAssignmentInput` インターフェース（teacherId, dayOfWeek, timeSlotId, studentId, subject, startDate, endDate?, active?）
    - `AssignmentException` インターフェース（id, patternId, date, exceptionType, createdAt, createdBy, pattern?, createdByUser?）
    - `ExtendedMonthlyCalendarData` インターフェース（MonthlyCalendarDataを拡張してdataSource, patternId?, exceptionType?を追加）
  - エクスポート設定を確認
  - _Requirements: 1.1, 4.1, 5.1_

- [x] 5.2 recurringAssignments.ts サービス層の実装（CRUD操作）
  - `src/services/recurringAssignments.ts` ファイルを作成
  - Supabaseクライアントをインポート
  - `createRecurringAssignment(data: RecurringAssignmentInput): Promise<RecurringAssignment>` 関数を実装:
    - supabase.rpc('create_recurring_assignment', params) を呼び出し
    - snake_caseからcamelCaseへの変換を実装
    - エラーハンドリング: エラーコードに基づいて適切なエラーメッセージをスロー
    - 戻り値をRecurringAssignment型にマッピング
  - `updateRecurringAssignment(patternId: string, data: Partial<RecurringAssignmentInput>): Promise<RecurringAssignment>` 関数を実装
  - `deleteRecurringAssignment(patternId: string): Promise<void>` 関数を実装
  - `listRecurringAssignments(teacherId?: string, activeOnly?: boolean): Promise<RecurringAssignment[]>` 関数を実装
  - ユニットテストを作成: 各関数の正常系、エラー系をモックを使ってテスト
  - _Requirements: 1.2, 1.4, 2.4, 2.5, 2.7_

- [x] 5.3 assignmentExceptions.ts サービス層の実装
  - `src/services/assignmentExceptions.ts` ファイルを作成
  - `createException(patternId: string, date: string, type: 'cancelled' | 'modified'): Promise<AssignmentException>` 関数を実装:
    - supabase.rpc('create_assignment_exception', params) を呼び出し
    - snake_caseからcamelCaseへの変換
    - エラーハンドリング
  - `deleteException(exceptionId: string): Promise<void>` 関数を実装:
    - supabase.from('assignment_exceptions').delete().eq('id', exceptionId) を呼び出し
    - RLSポリシーによる権限チェックを信頼
  - ユニットテストを作成: 各関数の正常系、エラー系をテスト
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 5.4 月次カレンダーサービスの拡張
  - `src/services/calendar.ts` または類似ファイルを確認
  - `getMonthlyCalendarWithPatterns(year: number, month: number, teacherId?: string): Promise<ExtendedMonthlyCalendarData[]>` 関数を追加:
    - supabase.rpc('get_monthly_calendar_with_patterns', { p_year: year, p_month: month, p_teacher_id: teacherId }) を呼び出し
    - 戻り値をExtendedMonthlyCalendarData[]型にマッピング
    - data_source, pattern_id, exception_typeフィールドを含める
  - ユニットテストを作成: パターン展開、優先順位マージの確認
  - _Requirements: 3.1, 3.5, 3.6, 5.1, 5.2_

## フェーズ3: フロントエンドUIコンポーネント

### 6. パターン管理UI（登録・編集）

- [x] 6.1 RecurringPatternFormコンポーネントの実装（基本構造）
  - `src/components/recurring-patterns/RecurringPatternForm.tsx` ファイルを作成
  - Props型定義: `RecurringPatternFormProps { initialData?: RecurringAssignment, teacherId?: string, onSubmit: (data: RecurringAssignmentInput) => Promise<void>, onCancel: () => void }`
  - React Hook Formのセットアップ: useForm<RecurringAssignmentInput>()
  - Zodスキーマ定義: recurringAssignmentSchemaを作成（dayOfWeek: 0-6, timeSlotId正規表現, startDate日付形式など）
  - zodResolverをuseFormに統合
  - フォームレイアウト作成: Styled Componentsで基本スタイリング
  - コンポーネントテスト: React Testing Libraryでレンダリング確認
  - _Requirements: 1.1, 8.2_

- [x] 6.2 RecurringPatternFormコンポーネントの実装（入力フィールド）
  - 曜日選択UI実装: ボタングループ（日〜土）、複数選択不可、選択状態のビジュアルフィードバック
  - コマ選択UI実装: ドロップダウンリスト（1, A, B, C）
  - 講師選択UI実装: 管理者の場合は全講師リスト、講師の場合は自動設定かつ変更不可
  - 生徒選択UI実装: オートコンプリート付きドロップダウン、検索機能（名前で絞り込み）
  - 科目選択UI実装: 生徒の受講科目から自動フィルタリング（生徒が選択されたらstudent_subjectsテーブルから科目取得）
  - 期間設定UI実装: 開始日カレンダーピッカー（必須）、終了日カレンダーピッカー（任意）
  - バリデーションフィードバック: エラーメッセージ表示（各フィールド下）
  - コンポーネントテスト: 各入力フィールドの動作確認、バリデーションエラー表示
  - _Requirements: 1.1, 1.6, 8.2_

- [x] 6.3 RecurringPatternFormコンポーネントの実装（送信とエラーハンドリング）
  - onSubmitハンドラー実装: フォームデータをRecurringAssignmentInput形式に変換してprops.onSubmitを呼び出し
  - 楽観的UI更新: 送信中は「登録中...」表示、ボタン無効化
  - エラーハンドリング: onSubmitのtry-catchでエラーをキャッチ、エラーメッセージを表示（toast通知またはフォーム上部）
  - エラーコード別メッセージ: DUPLICATE_PATTERN → 「この組み合わせは既に登録されています」、PERMISSION_DENIED → 「権限がありません」
  - キャンセルボタン実装: props.onCancelを呼び出し
  - コンポーネントテスト: 送信成功、送信失敗（各エラーケース）、キャンセル動作
  - _Requirements: 1.2, 1.3, 1.4, 8.7_

- [x] 6.4 RecurringPatternModalコンポーネントの実装
  - `src/components/recurring-patterns/RecurringPatternModal.tsx` ファイルを作成
  - Props型定義: `RecurringPatternModalProps { isOpen: boolean, pattern?: RecurringAssignment, onClose: () => void }`
  - モーダルレイアウト: 背景オーバーレイ、中央配置のモーダルダイアログ、閉じるボタン
  - RecurringPatternFormを内包: pattern prop から initialData を渡す、新規作成時はinitialDataなし
  - onSubmitハンドラー実装: createRecurringAssignment または updateRecurringAssignment を呼び出し、成功時にonClose
  - アクセシビリティ: ESCキーで閉じる、フォーカストラップ、aria-labelledby
  - コンポーネントテスト: モーダル表示/非表示、フォーム送信、閉じる動作
  - _Requirements: 1.1, 8.2_

### 7. パターン一覧UI

- [x] 7.1 RecurringPatternListコンポーネントの実装（基本構造とデータ取得）
  - `src/components/recurring-patterns/RecurringPatternList.tsx` ファイルを作成
  - Props型定義: `RecurringPatternListProps { teacherId?: string, onEdit: (pattern: RecurringAssignment) => void, onDelete: (pattern: RecurringAssignment) => void }`
  - React Queryセットアップ: useQuery で listRecurringAssignments を呼び出し、teacherId をクエリキーに含める
  - ローディング状態: データ取得中はスピナー表示
  - エラー状態: データ取得失敗時はエラーメッセージ表示
  - テーブルレイアウト: 曜日、コマ、講師名、生徒名、科目、有効期間、状態、アクションカラム
  - コンポーネントテスト: データ取得成功、ローディング状態、エラー状態
  - _Requirements: 2.1, 8.3_

- [x] 7.2 RecurringPatternListコンポーネントの実装（ソート・検索・フィルタ）
  - ソート機能実装: 各カラムヘッダーにソートボタン、曜日・コマ・生徒名・講師名でソート可能、昇順/降順切り替え
  - 検索機能実装: 生徒名、講師名で検索するテキスト入力フィールド、リアルタイムフィルタリング
  - フィルタ機能実装: 曜日ドロップダウン（全て/月/火/...）、コマドロップダウン（全て/1/A/B/C）、状態ドロップダウン（全て/有効/無効）
  - クライアント側フィルタリング: useMemoでフィルタ・ソート済みデータを計算
  - コンポーネントテスト: ソート動作、検索フィルタリング、各フィルタの組み合わせ
  - _Requirements: 8.3_

- [x] 7.3 RecurringPatternListコンポーネントの実装（編集・削除・一括操作）
  - 編集ボタン実装: 各行に編集アイコンボタン、クリック時にprops.onEdit(pattern)を呼び出し
  - 削除ボタン実装: 各行に削除アイコンボタン、クリック時に確認ダイアログ表示「このパターンを削除しますか？個別の例外処理は保持されます。」
  - 削除実行: 確認後にdeleteRecurringAssignment を呼び出し、成功時にReact Queryキャッシュを無効化
  - 一括選択UI実装: チェックボックスカラム追加、全選択/全解除チェックボックス
  - 一括削除ボタン実装: 選択されたパターンをまとめて削除、確認ダイアログ表示
  - 一括無効化ボタン実装: 選択されたパターンのactive=falseに更新
  - コンポーネントテスト: 編集・削除動作、一括操作、確認ダイアログ
  - _Requirements: 2.4, 2.6, 2.7, 8.3_

### 8. 月次カレンダーUIの拡張

- [x] 8.1 MonthlyCalendarPageコンポーネントの拡張（パターン表示切り替え）
  - 既存の `src/pages/MonthlyCalendarPage.tsx` または類似ファイルを確認
  - 新しいstate追加: `showPatterns: boolean` （デフォルトtrue）
  - パターン管理ボタン追加: ヘッダーに「パターン管理」ボタン、クリック時にパターン一覧ページへ遷移
  - 新規パターンボタン追加: ヘッダーに「新規パターン」ボタン、クリック時にRecurringPatternModalを表示
  - モード切替トグル追加: 「パターン表示ON/OFF」トグルスイッチ、showPatternsステートを切り替え
  - データ取得切り替え: showPatterns=trueの場合はgetMonthlyCalendarWithPatterns、falseの場合は既存のgetMonthlyCalendar
  - コンポーネントテスト: ボタン表示、トグル動作、データ取得切り替え
  - _Requirements: 3.1, 8.1_

- [x] 8.2 CalendarCellコンポーネントの拡張（パターン視覚化）
  - 既存の `src/components/calendar/CalendarCell.tsx` または類似コンポーネントを確認
  - Props拡張: `data: ExtendedMonthlyCalendarData` を受け取る
  - 背景色ロジック実装:
    - data_source='pattern' → 青系背景（#E3F2FD）
    - data_source='assignment' → 緑系背景（#E8F5E9）
    - data_source='exception' かつ exception_type='cancelled' → グレー系背景（#F5F5F5）、「休み」ラベル表示
  - アイコン表示実装:
    - data_source='pattern' → 右上に「P」アイコン
    - data_source='assignment' → 右上に「I」アイコン
  - バッジ表示実装: data_source='pattern'の場合は「定期」バッジ
  - ツールチップ実装: マウスホバーで授業タイプ、パターンID/アサインID、登録日時、登録者を表示
  - コンポーネントテスト: 各データソースの表示、色分け、アイコン、ツールチップ
  - _Requirements: 3.5, 5.3, 5.4, 5.5_

- [x] 8.3 CalendarCellコンポーネントの拡張（コンテキストメニュー）
  - 右クリック（またはロングタップ）でコンテキストメニュー表示実装
  - コンテキストメニュー条件分岐:
    - data_source='pattern' → 「この日だけ休み」「生徒を変更」「パターンを編集」「パターンを削除」「詳細を表示」
    - data_source='exception' → 「元に戻す」「詳細を表示」
    - data_source='assignment' → 既存のアクション
  - 「この日だけ休み」実装: 確認ダイアログ表示、createException(patternId, date, 'cancelled')呼び出し、楽観的UI更新（セルをグレーアウト）
  - 「生徒を変更」実装: 生徒選択モーダル表示、選択後にassignmentsテーブルに個別アサイン作成（pattern_idを参照として保持）
  - 「パターンを編集」実装: RecurringPatternModalを開く（initialDataにパターンを渡す）
  - 「パターンを削除」実装: 確認ダイアログ、deleteRecurringAssignmentを呼び出し
  - 「元に戻す」実装: deleteExceptionを呼び出し、カレンダーを更新
  - コンポーネントテスト: 各メニュー項目の表示・動作、確認ダイアログ、楽観的UI更新
  - _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.6, 8.4_

- [x] 8.4 カレンダーフィルタ機能の実装
  - フィルタUIコンポーネント作成: `CalendarFilter.tsx`
  - フィルタオプション実装: 全て表示（デフォルト）、定期パターンのみ表示、個別アサインのみ表示、例外処理のみ表示
  - フィルタロジック実装: data_sourceに基づいてカレンダーデータをフィルタリング
  - URLクエリパラメータ連携: フィルタ状態をURLに保存・復元
  - コンポーネントテスト: 各フィルタオプション、URLパラメータ連携
  - _Requirements: 5.6_

## フェーズ4: 統合、テスト、最適化

### 9. エンドツーエンドテストと統合テスト

- [x] 9.1 パターン登録フローのE2Eテスト
  - Playwrightテストファイル作成: `tests/e2e/recurring-pattern-registration.test.ts`
  - テストシナリオ実装: ログイン → パターン管理ページ → 新規パターン作成フォーム → 各フィールド入力 → 登録 → 成功メッセージ確認 → パターン一覧に表示確認
  - エラーケーステスト: 重複パターン、バリデーションエラー、権限エラー
  - 講師ロールテスト: 講師は自分のパターンのみ作成可能、他講師のteacher_idは選択不可
  - スクリーンショット撮影: 各ステップでスクリーンショット
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.1_

- [x] 9.2 月次カレンダー表示とパターン展開のE2Eテスト
  - Playwrightテストファイル作成: `tests/e2e/calendar-display-and-exceptions.test.ts`
  - テストシナリオ実装: パターン作成（前提条件） → 月次カレンダーページ表示 → 該当曜日のセルにパターン由来の授業が表示されることを確認
  - 視覚確認: セルの背景色（青系）、「P」アイコン、「定期」バッジ、生徒名・科目表示
  - 複数パターンテスト: 複数のパターンが同時に正しく展開されることを確認
  - 開始日・終了日境界テスト: パターンの有効期間外の日付には表示されないことを確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3, 5.4_

- [x] 9.3 例外処理（この日だけ休み）のE2Eテスト
  - Playwrightテストファイル作成: `tests/e2e/priority-and-data-integrity.test.ts`
  - テストシナリオ実装: パターン作成 → 月次カレンダー表示 → パターン由来セルを右クリック → 「この日だけ休み」選択 → 確認ダイアログ → 確認 → セルがグレーアウト表示に変わることを確認
  - 「休み」ラベル確認: セルに「休み」テキストが表示されることを確認
  - 元に戻すテスト: 例外セルを右クリック → 「元に戻す」→ パターン由来の表示に戻ることを確認
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9.4 優先順位と統合表示のE2Eテスト
  - Playwrightテストファイル作成: `tests/e2e/integration-flow.test.ts`
  - テストシナリオ実装: パターン作成 → 同じ日付・コマに個別アサイン作成 → 月次カレンダー表示 → 個別アサインが優先表示されることを確認（緑系背景、「I」アイコン）
  - 例外処理優先度テスト: パターン作成 → 個別アサイン作成 → 例外処理（休み）作成 → 例外処理が最優先で表示されることを確認（グレー背景、「休み」ラベル）
  - フィルタテスト: フィルタ機能で各データソースを個別に表示できることを確認
  - _Requirements: 5.1, 5.2, 5.6_

### 10. パフォーマンステストと最適化

- [x] 10.1 月次カレンダー表示のパフォーマンステスト
  - パフォーマンステストガイド作成: `tests/performance/explain-analyze.sql`
  - 負荷シナリオドキュメント化: データベースクエリの最適化手順を文書化
  - パフォーマンス閾値設定: p95 < 1秒、p99 < 2秒
  - ボトルネック特定: EXPLAIN ANALYZEでRPC関数のクエリ実行計画を確認するSQLスクリプトを作成
  - _Requirements: 非機能要件（パフォーマンス1）_

- [x] 10.2 データベースクエリの最適化
  - EXPLAIN ANALYZEで各RPC関数を分析: create_recurring_assignment, get_monthly_calendar_with_patterns, list_recurring_assignments
  - インデックス追加検討: 実行計画で Sequential Scan が発生している場合は追加インデックスを検討
  - 複合インデックス作成: teacher_id, active, day_of_week の複合インデックス（WHERE句で頻繁に使用される場合）
  - N+1問題の確認: フロントエンドサービス層でN+1クエリが発生していないか確認、発生している場合はJOINで解決
  - パフォーマンス最適化SQLスクリプト作成完了: tests/performance/explain-analyze.sql
  - _Requirements: 非機能要件（パフォーマンス1, 2）_

- [x] 10.3 フロントエンドのパフォーマンス最適化
  - フロントエンド最適化ガイド作成: `tests/performance/frontend-optimization-guide.md`
  - React Queryキャッシング確認: staleTime, cacheTimeが適切に設定されているか確認
  - useMemoとuseCallback適用: RecurringPatternListのフィルタ・ソートロジック、CalendarCellの背景色計算などをメモ化
  - 仮想スクロール検討: パターン一覧が100件以上の場合はreact-windowで仮想スクロール実装
  - Lazy Loading: RecurringPatternModalなどの大きなコンポーネントはReact.lazyで遅延ロード
  - Lighthouseスコア確認: パフォーマンススコア80以上を目標
  - _Requirements: 非機能要件（パフォーマンス2）_

### 11. ドキュメント更新と最終確認

- [x] 11.1 データベースドキュメントの更新
  - `docs/database/schema.md` を更新: recurring_assignments, assignment_exceptionsテーブルを追加、ER図を更新
  - `docs/database/migrations.md` を更新: 新しいマイグレーションファイルのリストを追加
  - `docs/database/rpc-functions.md` を更新: 新しいRPC関数（create_recurring_assignment, update_recurring_assignment, delete_recurring_assignment, list_recurring_assignments, get_monthly_calendar_with_patterns, create_assignment_exception）の詳細を追加
  - _Requirements: ドキュメント要件_

- [x] 11.2 アーキテクチャドキュメントの更新
  - `docs/architecture/project-structure.md` を更新: 新しいディレクトリ（src/components/recurring-patterns/, src/services/recurringAssignments.ts, assignmentExceptions.ts）を追加
  - 機能説明追加: 定期授業パターンシステムの概要、主要機能、使い方
  - _Requirements: ドキュメント要件_

- [ ] 11.3 全体統合テストと動作確認
  - 全てのE2Eテストを実行: npm run test:e2e
  - 全てのユニットテストを実行: npm run test
  - 全ての統合テストを実行: Supabase Local環境でRPC関数テスト
  - 手動動作確認: 講師ロール、管理者ロール、viewerロールでそれぞれログインして全機能を確認
  - バグ修正: テストで発見されたバグを修正
  - _Requirements: 全要件_

- [ ] 11.4 spec.jsonの最終更新とリリース準備
  - `.kiro/specs/recurring-assignments/spec.json` を更新: phase="implementation-complete", ready_for_implementation=true
  - CHANGELOG作成: 新機能のリリースノート作成
  - リリース前チェックリスト確認: 全テスト通過、ドキュメント更新完了、パフォーマンス目標達成
  - _Requirements: 全要件_

---

## 要件マッピング一覧

### 要件1: 定期授業パターンの登録
- 1.1: タスク1.1（テーブル作成）、5.1（型定義）、6.1-6.3（フォーム）、9.1（E2Eテスト）
- 1.2: タスク2.1（RPC）、5.2（サービス）、6.3（送信）、9.1（E2Eテスト）
- 1.3: タスク2.1（重複チェック）、6.3（エラーハンドリング）、9.1（E2Eテスト）
- 1.4: タスク2.1（INSERT）、5.2（サービス）、6.3（送信）、9.1（E2Eテスト）
- 1.5: タスク2.1（権限チェック）、4.1（RLS）、6.2（講師フィールド）
- 1.6: タスク2.1（バリデーション）、6.2（終了日チェック）

### 要件2: 定期授業パターンの管理
- 2.1: タスク2.4（list RPC）、7.1（一覧表示）
- 2.2: タスク2.4（講師フィルタ）、4.1（RLS）
- 2.3: タスク2.4（管理者フィルタ）、4.1（RLS）
- 2.4: タスク2.2（update RPC）、7.3（編集ボタン）
- 2.5: タスク2.2（UPDATE）、5.2（サービス）
- 2.6: タスク2.3（delete RPC）、7.3（削除ボタン）
- 2.7: タスク2.3（DELETE）、5.2（サービス）、7.3（削除確認）
- 2.8: タスク2.2（active更新）、7.3（一括無効化）

### 要件3: パターンの月次カレンダーへの自動展開
- 3.1: タスク3.1（パターン展開）、5.4（サービス）、8.1（表示切り替え）、9.2（E2Eテスト）
- 3.2: タスク3.1（開始日フィルタ）、9.2（境界テスト）
- 3.3: タスク3.1（終了日フィルタ）、9.2（境界テスト）
- 3.4: タスク3.1（無期限パターン）、9.2（E2Eテスト）
- 3.5: タスク3.2（優先順位）、8.2（背景色）、9.2（視覚確認）
- 3.6: タスク3.2（優先順位マージ）、9.4（優先度テスト）
- 3.7: タスク8.3（コンテキストメニュー）

### 要件4: 個別日付での例外処理
- 4.1: タスク1.2（例外テーブル）、3.3（RPC）、5.1（型定義）、5.3（サービス）、8.3（コンテキストメニュー）、9.3（E2Eテスト）
- 4.2: タスク3.3（RPC）、5.3（サービス）、8.3（この日だけ休み）、9.3（E2Eテスト）
- 4.3: タスク3.2（優先順位）、8.3（個別アサイン作成）、9.3（E2Eテスト）
- 4.4: タスク5.3（deleteException）、8.3（元に戻す）、9.3（E2Eテスト）

### 要件5: パターンと実際のアサインの統合表示
- 5.1: タスク3.2（統合）、5.4（サービス）、8.2（背景色）、9.4（E2Eテスト）
- 5.2: タスク3.2（優先順位）、9.4（優先度テスト）
- 5.3: タスク8.2（ツールチップ）
- 5.4: タスク8.2（Pアイコン）
- 5.5: タスク8.2（Iアイコン）
- 5.6: タスク8.4（フィルタ）、9.4（フィルタテスト）

### 要件6: 権限管理とセキュリティ
- 6.1: タスク2.1（権限チェック）、4.1（RLS）、6.2（講師フィールド）、9.1（E2Eテスト）
- 6.2: タスク2.4（講師フィルタ）、4.1（RLS）、4.2（RLS）
- 6.3: タスク2.2（権限チェック）、4.1（RLS）、4.2（RLS）
- 6.4: タスク4.1（RLS）
- 6.5: タスク2.1, 2.2, 2.3, 3.3（監査ログ）

### 要件7: データ整合性と制約
- 7.1: タスク2.1（制約チェック）
- 7.4: タスク3.2（空き枠独立）
- 7.7: タスク2.3（削除処理）

### 要件8: ユーザビリティとUI/UX
- 8.1: タスク8.1（ボタン・トグル）
- 8.2: タスク6.1, 6.2（フォームUI）
- 8.3: タスク7.1, 7.2, 7.3（一覧UI）
- 8.4: タスク8.3（コンテキストメニュー）
- 8.7: タスク6.3（楽観的UI）

### 非機能要件
- パフォーマンス1: タスク10.1（負荷テスト）、10.2（クエリ最適化）
- パフォーマンス2: タスク10.2（クエリ最適化）、10.3（フロントエンド最適化）

---

**ステータス**: 実装タスク生成完了
**次のステップ**: タスクをレビューし、`/kiro:spec-impl recurring-assignments` で実装を開始

**タスク概要**:
- **総タスク数**: 36タスク
- **フェーズ1**: データベース基盤とRPC関数（タスク1.1 - 4.2）- 12タスク
- **フェーズ2**: フロントエンドサービス層（タスク5.1 - 5.4）- 4タスク
- **フェーズ3**: フロントエンドUIコンポーネント（タスク6.1 - 8.4）- 13タスク
- **フェーズ4**: 統合、テスト、最適化（タスク9.1 - 11.4）- 7タスク

**推定実装期間**: 3-4週間（各タスク1-3時間想定）
