# KomaFit ドキュメント

KomaFit入塾割当システムの包括的なドキュメント

## 概要

KomaFitは、塾の講師と生徒のスケジュール管理・割当を自動化するシステムです。

**主な機能:**
- 講師の空き枠管理
- 生徒のアサイン（1対1、1対2指導対応）
- 講師推奨エンジン（スキルマッチング、負荷分散）
- 月次カレンダー表示
- 監査ログ
- システム設定管理

## ドキュメント一覧

### データベース

| ドキュメント | 説明 |
|-----------|------|
| [データベーススキーマ](./database/schema.md) | テーブル構造、ER図、インデックス、整合性チェック |
| [マイグレーションリファレンス](./database/migrations.md) | マイグレーション履歴、各マイグレーションの詳細 |
| [RPC関数リファレンス](./database/rpc-functions.md) | データベースRPC関数の使用方法、パラメータ、例 |
| [SQL変更ガイド](./database/sql-modification-guide.md) | SQLを変更する際の手順、ベストプラクティス、チェックリスト |

### アーキテクチャ

| ドキュメント | 説明 |
|-----------|------|
| [プロジェクト構成](./architecture/project-structure.md) | ディレクトリ構造、技術スタック、開発ワークフロー |

## クイックスタート

### ローカル環境のセットアップ

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd KomaFit

# 2. 依存関係をインストール
npm install

# 3. Supabaseローカル環境を起動
npm run supabase:start

# 4. 環境変数を設定
cp .env.example .env
# .envを編集

# 5. 開発サーバーを起動
npm run dev
```

### よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# データベースリセット（全マイグレーション再実行）
npm run supabase:reset

# テスト実行
npm run test

# コード品質チェック
npm run lint
npm run format
```

## システム構成

### アーキテクチャ概要

```
┌─────────────────┐
│   React SPA     │ (Vite + TypeScript)
│   (Port: 3000)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Supabase      │ (PostgreSQL + Auth)
│  (Port: 54321)  │
└─────────────────┘
```

### 技術スタック

**フロントエンド:**
- React 18
- TypeScript
- Redux Toolkit (状態管理)
- MUI (UIコンポーネント)
- React Router (ルーティング)

**バックエンド:**
- Supabase (BaaS)
- PostgreSQL (データベース)
- Row Level Security (アクセス制御)

**開発ツール:**
- Vite (ビルドツール)
- Vitest (テスト)
- ESLint / Prettier (コード品質)

## データモデル概要

### V2システム（日付ベース）- 推奨

```
teachers ──┐
           ├─→ teacher_availability_v2 (date, time_slot_id)
           └─→ assignments (date, time_slot_id, student_id)
                    │
students ──────────┘

time_slots (1, A, B, C) ← コママスタ
```

**特徴:**
- 日付ベースで細かく管理
- 1対1必須、1対2可否などの制約をサポート
- 講師推奨エンジンとの連携

### レガシーシステム（曜日ベース）

```
slots (MON-0, TUE-A, ...) ──┐
                            ├─→ slot_teacher
                            └─→ slot_students
```

**特徴:**
- 曜日×コマで固定スケジュール
- V2システムへの移行中

## 主要な機能

### 1. 講師空き枠管理（V2）

**画面:** `AvailabilityPage.tsx`

講師が自分の空き枠を登録:
- カレンダー形式で日付×時間帯を選択
- 一括設定機能

**API:**
```typescript
setTeacherAvailability(teacherId, date, timeSlotId, isAvailable)
batchSetAvailability(teacherId, dateRange, timeSlotIds, isAvailable)
```

### 2. 生徒アサイン（V2）

**画面:** `MonthlyCalendarPage.tsx`

管理者が生徒を講師にアサイン:
- 講師推奨エンジンが最適な講師を提案
- 制約チェック（1対1必須、1対2可否など）
- ドラッグ&ドロップ操作

**API:**
```typescript
assignStudent(date, timeSlotId, teacherId, studentId, subject, position)
unassignStudent(assignmentId)
```

### 3. 講師推奨エンジン

**サービス:** `recommendation.ts`

**考慮要素:**
- ハード条件: スキルマッチング、空き枠、NG講師、キャパシティ
- ソフト条件: 負荷分散、継続性、学年差

**スコアリング:**
```
score = load_score * load_weight
      + continuity_score * continuity_weight
      + grade_diff_score * grade_diff_weight
```

### 4. 月次カレンダー

**画面:** `MonthlyCalendarPage.tsx`

月単位でスケジュールを表示:
- 講師の空き枠（白: 来れる、グレー: 来れない）
- 生徒のアサイン（カード表示）
- 1対2の場合は2枚のカードを表示

**API:**
```typescript
getMonthlyCalendar(year, month)
```

### 5. 監査ログ

**画面:** `AuditLogsPage.tsx`

すべての操作を記録:
- 誰が、いつ、何をしたか
- アサイン、解除、変更などのアクション
- JSON形式で詳細データを保存

**テーブル:** `audit_logs`

### 6. システム設定

**画面:** `SettingsPage.tsx`

推奨エンジンの重みを調整:
- 負荷優先度（load_weight）
- 継続性優先度（continuity_weight）
- 学年差優先度（grade_diff_weight）
- 1対2指導ルール

**テーブル:** `settings`

## 開発ガイドライン

### データベース変更

1. マイグレーションファイルを作成
2. ローカル環境でテスト
3. ドキュメント更新（**必須**）
   - `docs/database/schema.md`
   - `docs/database/migrations.md`
   - `src/types/database.ts`

詳細: [SQL変更ガイド](./database/sql-modification-guide.md)

### 新機能追加

1. 型定義を追加（`src/types/entities.ts`）
2. サービス層を実装（`src/services/`）
3. コンポーネントを作成（`src/components/`）
4. ページに統合（`src/pages/`）
5. ルーティングを追加（`src/router/index.tsx`）
6. テストを作成

詳細: [プロジェクト構成](./architecture/project-structure.md)

### コーディング規約

- TypeScript strictモード使用
- ESLint / Prettier準拠
- コンポーネントは関数コンポーネント
- 状態管理はRedux Toolkit
- API呼び出しはサービス層経由

## トラブルシューティング

### Supabaseローカル環境が起動しない

```bash
# Dockerを確認
docker ps

# Supabaseを再起動
npm run supabase:stop
npm run supabase:start
```

### マイグレーションエラー

```bash
# データベースをリセット
npm run supabase:reset

# 特定のマイグレーションのみ実行
supabase migration up --file 20260211000001_initial_schema.sql
```

### TypeScript型エラー

```bash
# 型定義を再生成
supabase gen types typescript --local > src/types/database.ts
```

## 貢献ガイド

1. Issueを作成して議論
2. 機能ブランチを作成（`feature/xxx`, `fix/xxx`）
3. 変更を実装
4. テストを追加・実行
5. ドキュメントを更新
6. Pull Requestを作成

## ライセンス

Private

## 連絡先

プロジェクト管理者: [連絡先情報]

---

## ドキュメント更新履歴

| 日付 | 変更内容 | 更新者 |
|------|---------|-------|
| 2026-02-14 | 初版作成 | Claude |

## 次のステップ

- [ ] API仕様書の作成
- [ ] E2Eテストドキュメント
- [ ] デプロイメントガイド
- [ ] パフォーマンスチューニングガイド
- [ ] セキュリティガイドライン
