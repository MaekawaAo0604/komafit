# プロジェクト構成

KomaFit入塾割当システムのプロジェクト構造

## 目次

1. [ディレクトリ構造](#ディレクトリ構造)
2. [主要ディレクトリの説明](#主要ディレクトリの説明)
3. [技術スタック](#技術スタック)
4. [設定ファイル](#設定ファイル)
5. [開発ワークフロー](#開発ワークフロー)

---

## ディレクトリ構造

```
KomaFit/
├── .claude/                    # AI開発コンテキスト（Kiroフレームワーク）
│   └── CLAUDE.md              # プロジェクト全体のAI指示
│
├── .kiro/                     # Kiro Spec-Driven Development
│   ├── settings/              # プロジェクト設定
│   └── specs/                 # 機能仕様
│       └── teacher-assignment-system/
│
├── docs/                      # ドキュメント
│   ├── database/              # データベース関連
│   │   ├── schema.md          # スキーマ全体像
│   │   ├── migrations.md      # マイグレーション履歴
│   │   ├── rpc-functions.md   # RPC関数リファレンス
│   │   └── sql-modification-guide.md  # SQL変更ガイド
│   │
│   └── architecture/          # アーキテクチャ
│       └── project-structure.md  # このファイル
│
├── src/                       # ソースコード
│   ├── components/            # Reactコンポーネント
│   │   ├── auth/              # 認証関連
│   │   ├── forms/             # フォームコンポーネント
│   │   ├── modals/            # モーダルダイアログ
│   │   ├── recurring-patterns/  # 定期授業パターン関連
│   │   │   ├── RecurringPatternForm.tsx
│   │   │   ├── RecurringPatternModal.tsx
│   │   │   └── RecurringPatternList.tsx
│   │   ├── schedule/          # スケジュール関連
│   │   └── ui/                # 共通UIコンポーネント
│   │
│   ├── layouts/               # レイアウトコンポーネント
│   │   ├── AuthLayout.tsx     # 認証ページレイアウト
│   │   ├── DashboardLayout.tsx # ダッシュボードレイアウト
│   │   └── RootLayout.tsx     # ルートレイアウト
│   │
│   ├── pages/                 # ページコンポーネント
│   │   ├── auth/              # 認証ページ
│   │   ├── masters/           # マスタ管理ページ
│   │   ├── AssignmentBoardPage.tsx  # 割当ボード
│   │   ├── AvailabilityPage.tsx     # 空き枠管理
│   │   ├── MonthlyCalendarPage.tsx  # 月次カレンダー
│   │   └── ...
│   │
│   ├── services/              # APIサービス層
│   │   ├── assignments.ts     # 生徒アサイン
│   │   ├── assignmentExceptions.ts  # パターン例外処理
│   │   ├── auditLogs.ts       # 監査ログ
│   │   ├── auth.ts            # 認証
│   │   ├── calendar.ts        # カレンダー
│   │   ├── recommendation.ts  # 推奨エンジン
│   │   ├── recurringAssignments.ts  # 定期授業パターン
│   │   ├── students.ts        # 生徒マスタ
│   │   ├── teachers.ts        # 講師マスタ
│   │   └── teacherAvailabilityV2.ts  # 講師空き枠V2
│   │
│   ├── store/                 # Redux状態管理
│   │   ├── authSlice.ts       # 認証状態
│   │   ├── scheduleSlice.ts   # スケジュール状態
│   │   ├── uiSlice.ts         # UI状態
│   │   ├── undoSlice.ts       # Undo/Redo
│   │   └── index.ts           # Store設定
│   │
│   ├── router/                # ルーティング
│   │   └── index.tsx          # ルート定義
│   │
│   ├── types/                 # TypeScript型定義
│   │   ├── database.ts        # データベース型（Supabase生成）
│   │   └── entities.ts        # ドメインエンティティ型
│   │
│   ├── utils/                 # ユーティリティ
│   │   ├── gradeHelper.ts     # 学年ヘルパー
│   │   ├── passwordGenerator.ts  # パスワード生成
│   │   └── subjectOptions.ts  # 科目オプション
│   │
│   ├── styles/                # スタイル
│   │   ├── global.css         # グローバルスタイル
│   │   └── theme.ts           # MUIテーマ設定
│   │
│   ├── lib/                   # ライブラリ設定
│   │   └── supabase.ts        # Supabaseクライアント
│   │
│   ├── App.tsx                # アプリケーションルート
│   └── main.tsx               # エントリポイント
│
├── supabase/                  # Supabaseプロジェクト
│   ├── migrations/            # データベースマイグレーション
│   │   ├── 20260211000001_initial_schema.sql
│   │   ├── 20260211000002_users_teachers.sql
│   │   ├── 20260211000003_students_slots.sql
│   │   ├── ...
│   │   └── 20260211110000_batch_availability_operations.sql
│   │
│   ├── seed.sql               # 本番用シードデータ
│   └── seed-auth-users.sql    # Auth用シードデータ
│
├── tests/                     # テストファイル
│   └── ...
│
├── scripts/                   # ユーティリティスクリプト
│
├── .env                       # 環境変数（ローカル）
├── .env.example               # 環境変数のサンプル
├── package.json               # NPM依存関係
├── tsconfig.json              # TypeScript設定
├── vite.config.ts             # Vite設定
└── README.md                  # プロジェクトREADME
```

---

## 主要ディレクトリの説明

### src/components/

Reactコンポーネントを機能別に分類:

#### auth/
- `LoginForm.tsx`: ログインフォーム
- `RegisterForm.tsx`: 登録フォーム（未使用の可能性あり）

#### forms/
- `StudentForm.tsx`: 生徒マスタ登録・編集フォーム
- `TeacherForm.tsx`: 講師マスタ登録・編集フォーム

#### modals/
- `StudentAssignModal.tsx`: 生徒アサインモーダル

#### schedule/
- `AssignmentBoard.tsx`: 割当ボードメインコンポーネント
- `SlotCard.tsx`: スロットカード
- `TeacherSelectModal.tsx`: 講師選択モーダル
- `StudentSelectModal.tsx`: 生徒選択モーダル
- `TeacherCandidateList.tsx`: 講師候補リスト

#### ui/
共通UIコンポーネント:
- `Badge.tsx`: バッジ
- `Button.tsx`: ボタン
- `Card.tsx`: カード
- `Input.tsx`: 入力フィールド
- `Modal.tsx`: モーダルダイアログ
- `Select.tsx`: セレクトボックス
- `Toast.tsx`: トースト通知

### src/pages/

ページレベルのコンポーネント:

- `DashboardPage.tsx`: ダッシュボード
- `AssignmentBoardPage.tsx`: 割当ボード（レガシー）
- `MonthlyCalendarPage.tsx`: 月次カレンダー（V2）
- `AvailabilityPage.tsx`: 講師空き枠管理（V2）
- `AuditLogsPage.tsx`: 監査ログ閲覧
- `SettingsPage.tsx`: システム設定
- `masters/TeachersPage.tsx`: 講師マスタ管理
- `masters/StudentsPage.tsx`: 生徒マスタ管理
- `auth/LoginPage.tsx`: ログインページ

### src/services/

APIサービス層（Supabase RPC/テーブル操作）:

#### assignments.ts
- V2システムの生徒アサイン操作
- `assignStudent()`, `unassignStudent()`, `getAssignments()`

#### auth.ts
- ログイン、ログアウト、セッション管理
- `login()`, `logout()`, `getCurrentUser()`

#### calendar.ts
- 月次カレンダーデータ取得
- `getMonthlyCalendar(year, month)`

#### recommendation.ts / recommendations.ts
- 講師推奨エンジン
- `getTeacherRecommendations(slotId)`

#### students.ts
- 生徒マスタCRUD操作
- `getStudents()`, `createStudent()`, `updateStudent()`, `deleteStudent()`

#### teachers.ts
- 講師マスタCRUD操作
- `getTeachers()`, `createTeacher()`, `updateTeacher()`, `deleteTeacher()`

#### teacherAvailabilityV2.ts
- V2講師空き枠管理
- `setAvailability()`, `getAvailabilities()`, `batchSetAvailability()`

#### auditLogs.ts
- 監査ログ取得
- `getAuditLogs()`

#### settings.ts
- システム設定取得・更新
- `getSettings()`, `updateSettings()`

### src/store/

Redux状態管理:

#### authSlice.ts
認証状態:
```typescript
interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}
```

#### scheduleSlice.ts
スケジュール状態（レガシー）:
```typescript
interface ScheduleState {
  slots: BoardSlot[]
  selectedSlot: string | null
  isLoading: boolean
}
```

#### uiSlice.ts
UI状態:
```typescript
interface UIState {
  toast: ToastState | null
  modal: ModalState | null
}
```

#### undoSlice.ts
Undo/Redo機能:
```typescript
interface UndoState {
  past: Action[]
  future: Action[]
}
```

### src/types/

TypeScript型定義:

#### database.ts
Supabaseから生成されるデータベース型:
```typescript
export interface Database {
  public: {
    Tables: { ... }
    Views: { ... }
    Functions: { ... }
  }
}
```

#### entities.ts
ドメインエンティティ型（UI向けに整形済み）:
```typescript
export interface Teacher { ... }
export interface Student { ... }
export interface Assignment { ... }
export interface TimeSlot { ... }
// etc.
```

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|----------|------|
| **React** | 18.2.0 | UIライブラリ |
| **TypeScript** | 5.3.3 | 型安全性 |
| **Vite** | 5.0.8 | ビルドツール |
| **Redux Toolkit** | 2.0.1 | 状態管理 |
| **React Router** | 6.21.1 | ルーティング |
| **React Hook Form** | 7.49.2 | フォーム管理 |
| **Zod** | 3.22.4 | バリデーション |
| **MUI (Material-UI)** | 5.15.0 | UIコンポーネント |
| **Styled Components** | 6.3.9 | CSS-in-JS |

### バックエンド・インフラ

| 技術 | 用途 |
|------|------|
| **Supabase** | BaaS（PostgreSQL, Auth, Storage, Edge Functions） |
| **PostgreSQL** | リレーショナルデータベース |
| **Row Level Security (RLS)** | データアクセス制御 |

### 開発ツール

| 技術 | バージョン | 用途 |
|------|----------|------|
| **ESLint** | 8.55.0 | コード品質チェック |
| **Prettier** | 3.1.1 | コードフォーマット |
| **Vitest** | 1.1.0 | ユニットテスト |
| **Playwright** | 1.40.1 | E2Eテスト |

---

## 設定ファイル

### tsconfig.json

TypeScriptコンパイラ設定:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### vite.config.ts

Viteビルド設定:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

### .env

環境変数（ローカル開発用）:
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### package.json

NPMスクリプト:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:reset": "supabase db reset",
    "supabase:migrate": "supabase migration up"
  }
}
```

---

## 開発ワークフロー

### ローカル開発環境のセットアップ

```bash
# 1. 依存関係をインストール
npm install

# 2. Supabaseローカル環境を起動
npm run supabase:start

# 3. 環境変数を設定
cp .env.example .env
# .envファイルを編集して適切な値を設定

# 4. 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

### データベース変更のワークフロー

```bash
# 1. 新しいマイグレーションファイルを作成
supabase migration new add_new_feature

# 2. マイグレーションファイルを編集
# supabase/migrations/YYYYMMDDHHMMSS_add_new_feature.sql

# 3. ローカルで適用
npm run supabase:reset

# 4. テスト
npm run test

# 5. ドキュメント更新
# - docs/database/schema.md
# - docs/database/migrations.md
# - src/types/database.ts

# 6. コミット
git add .
git commit -m "feat: add new feature to database"
```

### 新機能開発のワークフロー

```bash
# 1. 機能ブランチを作成
git checkout -b feature/new-assignment-view

# 2. コンポーネントを作成
# src/components/schedule/NewAssignmentView.tsx

# 3. サービス層を実装
# src/services/newFeature.ts

# 4. 型定義を更新
# src/types/entities.ts

# 5. ページに統合
# src/pages/NewFeaturePage.tsx

# 6. ルーティングを追加
# src/router/index.tsx

# 7. テストを作成
# tests/components/NewAssignmentView.test.tsx

# 8. ドキュメント更新
# docs/architecture/project-structure.md

# 9. コミット・プッシュ
git add .
git commit -m "feat: add new assignment view"
git push origin feature/new-assignment-view
```

### テスト実行

```bash
# ユニットテスト
npm run test

# UI付きテスト実行
npm run test:ui

# カバレッジ測定
npm run test:coverage

# E2Eテスト（Playwright）
npx playwright test
```

### コード品質チェック

```bash
# ESLint
npm run lint

# ESLint自動修正
npm run lint:fix

# Prettier
npm run format
```

---

## 主要機能

### 定期授業パターンシステム

**概要:**
講師が曜日ベースの授業パターン（例: 毎週月曜日コマA = 田中くん数学）を登録すると、自動的に指定期間の月次カレンダーに展開されるシステム。個別の日付で例外処理（休み・振替）も可能。

**主要コンポーネント:**

1. **RecurringPatternForm** (`src/components/recurring-patterns/RecurringPatternForm.tsx`)
   - パターン登録・編集フォーム
   - React Hook Form + Zod バリデーション
   - 講師、生徒、科目、曜日、コマ、期間、優先度を入力

2. **RecurringPatternModal** (`src/components/recurring-patterns/RecurringPatternModal.tsx`)
   - パターン登録・編集モーダル
   - RecurringPatternFormをラップ

3. **RecurringPatternList** (`src/components/recurring-patterns/RecurringPatternList.tsx`)
   - パターン一覧表示
   - フィルタリング・ソート機能
   - 編集・削除アクション

**APIサービス:**

1. **recurringAssignments.ts** (`src/services/recurringAssignments.ts`)
   - パターンCRUD操作
   - `createRecurringAssignment()`
   - `updateRecurringAssignment()`
   - `deleteRecurringAssignment()`
   - `listRecurringAssignments()`

2. **assignmentExceptions.ts** (`src/services/assignmentExceptions.ts`)
   - 例外処理操作
   - `createException()`: 特定日を休みに設定
   - `deleteException()`: 例外処理を解除
   - `listExceptions()`: 例外一覧取得

**カレンダー統合:**

- **MonthlyCalendarPage** (`src/pages/MonthlyCalendarPage.tsx`)
  - パターン表示トグル機能
  - カレンダーセルに色分け表示（青=パターン、緑=個別アサイン、グレー=例外）
  - 右クリックコンテキストメニュー
    - 「この日だけ休み」: 例外処理作成
    - 「元に戻す」: 例外処理解除
    - 「パターンを編集」: モーダルで編集
    - 「パターンを削除」: パターン削除
  - データソースフィルタ機能

**データベーステーブル:**

1. **recurring_assignments**
   - 定期授業パターンマスタ
   - 曜日ベースのパターン定義

2. **assignment_exceptions**
   - パターンの例外処理
   - 特定日の休み・振替を管理

**RPC関数:**

- `create_recurring_assignment()`: パターン作成
- `update_recurring_assignment()`: パターン更新
- `delete_recurring_assignment()`: パターン削除
- `list_recurring_assignments()`: パターン一覧
- `get_monthly_calendar_with_patterns()`: カレンダーデータ取得（パターン展開付き）
- `create_assignment_exception()`: 例外処理作成

**優先順位:**

1. 個別アサイン（assignmentsテーブル）
2. 例外処理（assignment_exceptionsテーブル）
3. 定期パターン（recurring_assignmentsテーブル、priorityが高い順）

**使い方:**

1. **パターン登録**
   - 月次カレンダーページで「パターン表示」トグルをON
   - 「新規パターン追加」ボタンをクリック
   - フォームに入力して登録

2. **カレンダー確認**
   - パターンが自動的に月次カレンダーに展開される
   - 青色のセルで表示される

3. **例外処理**
   - パターンセルを右クリック
   - 「この日だけ休み」を選択
   - セルがグレーになり、「休み」ラベルが表示される

4. **例外解除**
   - 例外セルを右クリック
   - 「元に戻す」を選択
   - 元のパターン表示に戻る

---

## 参考

- [データベーススキーマ](../database/schema.md)
- [マイグレーションリファレンス](../database/migrations.md)
- [RPC関数リファレンス](../database/rpc-functions.md)
- [SQL変更ガイド](../database/sql-modification-guide.md)
