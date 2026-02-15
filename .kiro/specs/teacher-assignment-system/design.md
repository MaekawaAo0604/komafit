# Technical Design

## Overview

入塾割当アシスタントは、塾の講師割当プロセスを自動化するWebアプリケーションです。本設計では、**Supabase**をBaaS（Backend as a Service）プラットフォームとして採用し、React/TypeScript フロントエンド、Supabase PostgreSQL による構成で**完全無料のPoCデプロイ**を実現します。

システムの核心は**講師推薦エンジン（クライアント側TypeScript実装）**で、ハード制約（空き枠、教科、学年、NG講師、上限）による候補絞り込みと、ソフト条件（負荷、継続性）による優先順位付けを行います。全ての割当操作は監査ログに記録され、Undo機能により誤操作からの即座の復旧が可能です。

### ビジネスドライバー
- 講師アサインの所要時間を80%削減（Excel運用比）
- 条件漏れによる不適切な割当をゼロにする
- 完全な変更履歴の追跡可能性

### アーキテクチャ選定の理由
- **Supabase採用**: PostgreSQL維持、認証・API自動生成、完全無料でPoCデプロイ可能
- **コスト**: 無料枠内（DB 500MB、Auth 50k MAU、Edge Functions 500k呼出/月、Storage 1GB）
- **移行パス**: PoCで検証後、必要に応じてAWS/GCPへ移行可能（PostgreSQLスキーマ互換）

---

## Requirements Mapping

### Design Component Traceability

各設計コンポーネントは、要件ドキュメント（requirements.md）の特定の要件に対応しています：

| 設計コンポーネント | 対応要件 | 説明 |
|---|---|---|
| **認証・認可ミドルウェア** | REQ-1: ロール・権限管理 | JWT認証、ロールベースアクセス制御 |
| **KomaMasterテーブル** | REQ-2: コマ・スロット定義 | 固定5種類のコマと表示順序保証 |
| **TeachersService** | REQ-3: 講師マスタ管理 | 講師情報のCRUD、教科・学年管理 |
| **StudentsService** | REQ-4: 生徒マスタ管理 | 生徒情報、NG講師リスト管理 |
| **SlotsService** | REQ-5: 授業枠管理 | スロットへの生徒配置、座席管理 |
| **AvailabilityService** | REQ-6: 講師空き枠管理 | 週次カレンダー、空き状態管理 |
| **RecommendationEngine（クライアント側）** | REQ-7, REQ-8: 講師推薦エンジン | ハード制約チェック、ソフト条件スコアリング（TypeScript実装） |
| **AssignmentService** | REQ-9, REQ-10, REQ-11: 割当操作 | 候補表示、確定、変更、解除 |
| **UndoManager** | REQ-12: Undo機能 | 直近操作の保持と取り消し |
| **AssignmentBoard Component** | REQ-13: 割当ボード表示 | 週次グリッド、セル表示 |
| **AuditLogService** | REQ-14: 監査ログ | 全操作の記録と追跡 |
| **CSVService** | REQ-15, REQ-16: CSV入出力 | インポート/エクスポート、検証 |
| **SettingsService** | REQ-17: システム設定 | ソフト条件の重み、1:2ルール |
| **ErrorHandler Middleware** | REQ-18: エラー処理 | 統一エラーレスポンス |

### User Story Coverage

- **US-1（管理者権限）**: AuthMiddleware + RoleGuard で実装
- **US-2（コマ順序保証）**: KomaMaster.koma_order + フロントエンドソート で実装
- **US-3（講師情報管理）**: TeachersService + TeacherSkills 多対多関連 で実装
- **US-4（生徒情報管理）**: StudentsService + StudentNG 多対多関連 で実装
- **US-5（授業枠構成）**: SlotsService + SlotStudents（seat列でアトミック管理）で実装
- **US-6（講師空き枠入力）**: TeacherAvailabilityPage + AvailabilityService で実装
- **US-7（ハード制約）**: RecommendationEngine.applyHardConstraints() で実装
- **US-8（ソフト条件）**: RecommendationEngine.applySoftScoring() + settings.json で実装
- **US-9（候補表示）**: CandidateModal + 理由表示ロジック で実装
- **US-10（割当確定）**: AssignmentService.assign() + AuditLog 記録 で実装
- **US-11（変更・解除）**: AssignmentService.change/unassign() + Undo履歴 で実装
- **US-12（Undo）**: UndoManager + 状態スナップショット で実装
- **US-13（ボード表示）**: AssignmentBoard + WeekGrid で実装
- **US-14（監査追跡）**: AuditLogService + フィルタリング で実装
- **US-15（CSVインポート）**: CSVService.import() + 検証ロジック で実装
- **US-16（CSVエクスポート）**: CSVService.export() + 日時付きファイル名 で実装
- **US-17（設定調整）**: SettingsPage + SettingsService で実装
- **US-18（エラー通知）**: ErrorHandler + トースト通知 で実装

---

## Architecture

### High-Level System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
    end

    subgraph "Frontend Layer - Vercel/Netlify"
        REACT[React App + TypeScript]
        REDUX[Redux Store]
        ROUTER[React Router]
        REC_ENGINE[推薦エンジン<br/>クライアント側]
        SUPABASE_CLIENT[Supabase Client SDK]
    end

    subgraph "Supabase Platform (無料枠)"
        subgraph "Auth"
            AUTH[Supabase Auth<br/>JWT + RLS]
        end

        subgraph "Database"
            PG[(PostgreSQL 15<br/>500MB)]
            RLS[Row Level Security]
        end

        subgraph "Edge Functions (Deno)"
            CSV_FUNC[CSV処理関数]
        end

        subgraph "Storage"
            STORAGE[File Storage<br/>1GB]
        end

        subgraph "Realtime"
            REALTIME[Realtime Subscriptions]
        end
    end

    WEB --> REACT
    REACT --> REDUX
    REACT --> ROUTER
    REACT --> REC_ENGINE
    REACT --> SUPABASE_CLIENT

    REC_ENGINE --> SUPABASE_CLIENT
    SUPABASE_CLIENT --> AUTH
    SUPABASE_CLIENT --> PG
    SUPABASE_CLIENT --> CSV_FUNC
    SUPABASE_CLIENT --> STORAGE
    SUPABASE_CLIENT --> REALTIME

    AUTH --> RLS
    RLS --> PG
```

### Technology Stack

#### Frontend
- **React 18** + **TypeScript 5**: モダンなUI構築、型安全性
- **Redux Toolkit**: 状態管理（割当状態、Undo履歴）
- **@supabase/supabase-js**: Supabase クライアントSDK
- **Material-UI (MUI)**: UIコンポーネント、レスポンシブ対応
- **React Hook Form** + **Zod**: フォーム管理、バリデーション
- **Vite**: 高速ビルドツール
- **Vercel or Netlify**: 静的サイトホスティング（無料枠）
- **推薦エンジン（クライアント側）**: TypeScriptで実装、フィルタリング・スコアリング

#### Backend (Supabase Platform)
- **Supabase PostgreSQL 15**: ACID準拠、JSON型サポート、500MB無料
- **Supabase Auth**: JWT + OAuth 2.0、50k MAU無料、RLS統合
- **Supabase Edge Functions**: Deno/TypeScript、500k呼出/月無料
  - CSV処理関数（インポート/エクスポート）
- **Supabase Storage**: ファイルストレージ、1GB無料
- **Supabase Realtime**: WebSocket、PostgreSQL変更通知
- **Row Level Security (RLS)**: PostgreSQLのRLSでロール別アクセス制御

#### Development & Deployment
- **Supabase CLI**: ローカル開発環境、マイグレーション管理
- **GitHub Actions**: CI/CDパイプライン
- **Vercel/Netlify**: フロントエンドデプロイ（無料枠）
- **Supabase Migrations**: SQLマイグレーション管理

### Architecture Decision Rationale

#### Why React + TypeScript
- **React**: コンポーネントベース、豊富なエコシステム、エンタープライズ実績
- **TypeScript**: 型安全性により講師推薦ロジックのバグを早期発見、IDEサポート

#### Why Supabase
- **PostgreSQL維持**: 既存のリレーショナル設計を変更せずに使用可能
- **完全無料PoC**: DB 500MB、Auth 50k MAU、Edge Functions 500k呼出、Storage 1GBまで無料
- **開発速度**: 認証・API・RLSが自動生成、バックエンド開発時間を80%削減
- **本番移行パス**: PostgreSQL互換なのでAWS RDS/Aurora、GCP Cloud SQLへ移行可能
- **セキュリティ**: Row Level Security (RLS)でDBレベルの権限制御

#### Why Supabase Edge Functions (vs FastAPI)
- **Supabaseネイティブ**: プラットフォーム統合、追加インフラ不要
- **Deno/TypeScript**: フロントエンドと言語統一、型定義共有可能
- **無料枠**: 500k呼出/月（PoCに十分）
- **低レイテンシ**: エッジロケーション分散、グローバル配信
- **制約**: 複雑なPythonライブラリ（pandas）不要、純粋なロジック実装のみ

#### Why Supabase Auth (vs カスタムJWT)
- **開発不要**: 認証フロー、パスワードリセット、OAuth統合が標準搭載
- **RLS統合**: JWTクレームがPostgreSQLのRLSポリシーで直接利用可能
- **セキュリティ**: ベストプラクティス実装済み、定期セキュリティ更新
- **コスト**: 50k MAUまで無料（PoCで十分）

#### Why PostgreSQL (Supabase)
- **ACID準拠**: 割当操作のトランザクション整合性が重要
- **JSON型**: AuditLog の payload を柔軟に保存
- **RLS**: ロールベースのアクセス制御をSQLポリシーで実装
- **パフォーマンス**: 適切なインデックスで10人の同時操作を遅延なく処理
- **外部キー制約**: データ整合性を DB レベルで保証

#### Why クライアント側推薦エンジン (vs Edge Functions)
- **開発速度**: デプロイ不要、ブラウザでデバッグ可能、即座にコード変更反映
- **レイテンシ**: ネットワーク往復なし、即座に候補表示（UX向上）
- **コスト**: Edge Functions呼び出し回数を節約、完全無料を維持
- **データ量**: 講師100人程度なら数十KB、クライアント処理で十分
- **移行パス**: 将来的にEdge Functionsへの移行も容易（ロジック共通化）

#### Why クライアント状態管理 (vs Redis)
- **Undo履歴**: Redux Storeでクライアント側に保持（1操作のみなのでサイズ小）
- **キャッシュ**: Supabase Clientの自動キャッシュで十分
- **コスト削減**: Redisインフラ不要、完全無料を実現

---

## Data Flow

### Primary User Flows

#### Flow 1: 講師割当フロー（コア機能）

```mermaid
sequenceDiagram
    participant Admin as 管理者
    participant Board as 割当ボード
    participant RecEngine as 推薦エンジン<br/>(クライアント側)
    participant SupaClient as Supabase Client
    participant DB as Supabase PostgreSQL

    Admin->>Board: 先生欄をクリック
    Board->>RecEngine: getCandidates(slotId)

    par 並列データ取得
        RecEngine->>SupaClient: supabase.from('slots').select(...)
        SupaClient->>DB: SELECT slot + students
        DB-->>SupaClient: スロット・生徒データ
        SupaClient-->>RecEngine: slot data
    and
        RecEngine->>SupaClient: supabase.from('teachers').select(...)
        SupaClient->>DB: SELECT teachers + skills + availability
        DB-->>SupaClient: 講師データ
        SupaClient-->>RecEngine: teachers data
    and
        RecEngine->>SupaClient: supabase.from('settings').select(...)
        SupaClient->>DB: SELECT settings
        DB-->>SupaClient: 設定データ
        SupaClient-->>RecEngine: settings data
    end

    RecEngine->>RecEngine: applyHardConstraints()
    RecEngine->>RecEngine: applySoftScoring()
    RecEngine-->>Board: 候補講師リスト（スコア・理由付き）
    Board-->>Admin: 候補モーダル表示

    Admin->>Board: 講師を選択して確定
    Board->>SupaClient: supabase.rpc('assign_teacher', {...})
    SupaClient->>DB: BEGIN TRANSACTION
    SupaClient->>DB: INSERT INTO slot_teacher
    SupaClient->>DB: UPDATE teacher_availability
    SupaClient->>DB: INSERT INTO audit_logs
    SupaClient->>DB: COMMIT
    SupaClient-->>Board: 200 OK
    Board->>Board: Redux: saveUndoSnapshot()
    Board-->>Admin: ボード更新（講師名表示）
```

#### Flow 2: 講師空き枠入力フロー

```mermaid
sequenceDiagram
    participant Teacher as 講師
    participant Page as 講師ページ
    participant SupaAuth as Supabase Auth
    participant SupaClient as Supabase Client
    participant DB as Supabase PostgreSQL

    Teacher->>Page: ログイン
    Page->>SupaAuth: supabase.auth.signInWithPassword()
    SupaAuth-->>Page: JWT (role=teacher)
    Page->>SupaClient: supabase.from('teacher_availability')<br/>.select().eq('teacher_id', userId)
    SupaClient->>DB: SELECT (RLSでteacher_id自動フィルタ)
    DB-->>SupaClient: 空き枠データ
    SupaClient-->>Page: 週次カレンダーデータ
    Page-->>Teacher: カレンダー表示（MON-0〜SUN-C）

    Teacher->>Page: スロットをクリック（ON/OFF トグル）
    Page->>SupaClient: supabase.from('teacher_availability')<br/>.upsert({slot_id, is_available})
    SupaClient->>DB: BEGIN TRANSACTION (RLS適用)
    SupaClient->>DB: UPSERT teacher_availability
    SupaClient->>DB: INSERT INTO audit_logs
    SupaClient->>DB: COMMIT
    SupaClient-->>Page: 200 OK
    Page-->>Teacher: カレンダー更新
```

#### Flow 3: Undoフロー

```mermaid
sequenceDiagram
    participant Admin as 管理者
    participant Board as 割当ボード
    participant Redux as Redux Store
    participant SupaClient as Supabase Client
    participant DB as Supabase PostgreSQL

    Admin->>Board: Undoボタンをクリック
    Board->>Redux: getLastUndoSnapshot()
    Redux-->>Board: 直近操作のスナップショット<br/>{operation, prev_state}
    Board->>SupaClient: supabase.rpc('undo_assignment', snapshot)
    SupaClient->>DB: BEGIN TRANSACTION
    SupaClient->>DB: スナップショットを元に復元
    SupaClient->>DB: INSERT INTO audit_logs (action=UNDO)
    SupaClient->>DB: COMMIT
    SupaClient-->>Board: 200 OK（復元後の状態）
    Board->>Redux: clearUndoSnapshot()
    Board-->>Admin: ボード更新
```

---

## Components and Interfaces

### Backend Services & API Implementation

Supabaseでは、バックエンドロジックを以下3つの方法で実装します：

1. **Supabase REST API**: 基本的なCRUD操作（RLS適用）
2. **PostgreSQL RPC Functions**: トランザクション処理、複雑なビジネスロジック
3. **Edge Functions**: 外部処理（CSV処理）
4. **クライアント側ロジック**: 推薦エンジン（TypeScript）

#### 1. 講師マスタ管理（Supabase REST API + RLS）

```typescript
// Supabase Client (フロントエンド)
const TeachersAPI = {
  // 新規講師登録（admin権限のみRLSで許可）
  async createTeacher(data: TeacherCreate): Promise<Teacher> {
    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return teacher;
  },

  // 講師情報取得（スキル・空き枠含む）
  async getTeacher(teacherId: string): Promise<Teacher> {
    const { data, error } = await supabase
      .from('teachers')
      .select('*, teacher_skills(*), teacher_availability(*)')
      .eq('id', teacherId)
      .single();
    if (error) throw error;
    return data;
  },

  // 講師情報更新（RLSでadminのみ許可）
  async updateTeacher(teacherId: string, data: TeacherUpdate): Promise<Teacher> {
    const { data: updated, error } = await supabase
      .from('teachers')
      .update(data)
      .eq('id', teacherId)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  // 講師一覧取得
  async listTeachers(activeOnly: boolean = true): Promise<Teacher[]> {
    let query = supabase.from('teachers').select('*');
    if (activeOnly) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
};
```

#### 2. 生徒マスタ管理（Supabase REST API + RLS）

```typescript
const StudentsAPI = {
  // 生徒CRUD（講師マスタと同様）
  async createStudent(data: StudentCreate): Promise<Student> { /* ... */ },
  async getStudent(studentId: string): Promise<Student> { /* ... */ },
  async updateStudent(studentId: string, data: StudentUpdate): Promise<Student> { /* ... */ },

  // NG講師の追加・削除
  async addNGTeacher(studentId: string, teacherId: string): Promise<void> {
    const { error } = await supabase
      .from('student_ng')
      .insert({ student_id: studentId, teacher_id: teacherId });
    if (error) throw error;
  },

  async removeNGTeacher(studentId: string, teacherId: string): Promise<void> {
    const { error } = await supabase
      .from('student_ng')
      .delete()
      .eq('student_id', studentId)
      .eq('teacher_id', teacherId);
    if (error) throw error;
  }
};
```

#### 3. 授業枠管理（Supabase REST API）

```typescript
const SlotsAPI = {
  // 週次スケジュール全体を取得（JOIN込み）
  async getWeekSchedule(): Promise<Record<string, Slot>> {
    const { data, error } = await supabase
      .from('slots')
      .select(`
        *,
        slot_students(*, student:students(*)),
        slot_teacher(*, teacher:teachers(*))
      `);
    if (error) throw error;
    return data.reduce((acc, slot) => ({ ...acc, [slot.id]: slot }), {});
  },

  // 生徒をスロットに配置
  async assignStudentToSlot(
    slotId: string,
    seat: 1 | 2,
    studentId: string,
    subject: string
  ): Promise<SlotStudent> {
    const { data, error } = await supabase
      .from('slot_students')
      .insert({ slot_id: slotId, seat, student_id: studentId, subject })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
```

#### 4. 講師空き枠管理（Supabase REST API + RLS）

```typescript
const AvailabilityAPI = {
  // 自分の空き枠取得（RLSで自動的に teacher_id フィルタ）
  async getMyAvailability(): Promise<Availability[]> {
    const { data, error } = await supabase
      .from('teacher_availability')
      .select('*');
    if (error) throw error;
    return data;
  },

  // 空き枠トグル（RLSで自分のデータのみ更新可能）
  async toggleAvailability(
    slotId: string,
    isAvailable: boolean
  ): Promise<Availability> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('teacher_availability')
      .upsert({
        teacher_id: user!.id,
        slot_id: slotId,
        is_available: isAvailable
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
```

#### 5. 推薦エンジン（クライアント側TypeScript）

```typescript
// src/services/recommendationEngine.ts
import { supabase } from '@/lib/supabase';
import type { Slot, Teacher, TeacherCandidate, Settings } from '@/types';

/**
 * スロットに対する候補講師を取得
 * クライアント側で実行される推薦エンジン
 */
export async function getCandidates(slotId: string): Promise<TeacherCandidate[]> {
  // 1. 必要なデータを並列取得（高速化）
  const [slotRes, teachersRes, settingsRes] = await Promise.all([
    supabase
      .from('slots')
      .select('*, slot_students(*, student:students(*, student_ng(teacher_id)))')
      .eq('id', slotId)
      .single(),
    supabase
      .from('teachers')
      .select('*, teacher_skills(*), teacher_availability(*)')
      .eq('active', true),
    supabase.from('settings').select('*').eq('id', 1).single()
  ]);

  if (slotRes.error) throw slotRes.error;
  if (teachersRes.error) throw teachersRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const slot = slotRes.data;
  const teachers = teachersRes.data;
  const settings = settingsRes.data;

  // 2. ハード制約を適用
  const candidates = applyHardConstraints(slot, teachers);

  // 3. ソフト条件でスコアリング
  const scored = applySoftScoring(slot, candidates, settings);

  return scored;
}

/**
 * ハード制約フィルタリング
 * 条件を満たさない講師を除外
 */
function applyHardConstraints(slot: Slot, teachers: Teacher[]): Teacher[] {
  return teachers.filter(teacher => {
    // 空き枠チェック
    const isAvailable = teacher.teacher_availability.some(
      av => av.slot_id === slot.id && av.is_available
    );
    if (!isAvailable) return false;

    // 教科・学年チェック（全生徒に対応できるか）
    const canTeachAll = slot.slot_students.every(ss => {
      return teacher.teacher_skills.some(skill =>
        skill.subject === ss.subject &&
        skill.grade_min <= ss.student.grade &&
        skill.grade_max >= ss.student.grade
      );
    });
    if (!canTeachAll) return false;

    // NG講師チェック
    const isNG = slot.slot_students.some(ss =>
      ss.student.student_ng?.some(ng => ng.teacher_id === teacher.id)
    );
    if (isNG) return false;

    // 1:2可否チェック
    if (slot.slot_students.length === 2 && !teacher.allow_pair) return false;

    // 上限チェック（週あたりコマ数）
    const currentLoad = teacher.teacher_availability.filter(av => !av.is_available).length;
    if (currentLoad >= teacher.cap_week_slots) return false;

    return true;
  });
}

/**
 * ソフト条件スコアリング
 * 候補をスコア付けして優先順位をつける
 */
function applySoftScoring(
  slot: Slot,
  candidates: Teacher[],
  settings: Settings
): TeacherCandidate[] {
  return candidates
    .map(teacher => {
      let score = 0;
      const reasons: string[] = [];

      // 負荷が低い（重み付き）
      const currentLoad = teacher.teacher_availability.filter(av => !av.is_available).length;
      const loadRatio = 1 - (currentLoad / teacher.cap_week_slots);
      score += loadRatio * settings.load_weight;

      if (currentLoad < teacher.cap_week_slots * 0.5) {
        reasons.push(`負荷が低い（今週: ${currentLoad}コマ）`);
      }

      // 継続性（既にこの生徒を担当している場合は優先）
      // TODO: 過去の割当履歴から判定

      // 学年差（1:2の場合、学年が近い方が優先）
      if (slot.slot_students.length === 2) {
        const grades = slot.slot_students.map(ss => ss.student.grade);
        const gradeDiff = Math.abs(grades[0] - grades[1]);
        const gradeDiffScore = 1 - (gradeDiff / 6); // 最大6学年差を想定
        score += gradeDiffScore * settings.grade_diff_weight;

        if (gradeDiff <= 1) {
          reasons.push('学年が近い（1:2指導に適している）');
        }
      }

      return {
        teacher,
        score,
        reasons,
        load: {
          today_slots: 0, // TODO: 今日のコマ数を計算
          week_slots: currentLoad
        }
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * 候補が0人の場合の理由を集計
 */
export function getRejectionReasons(slot: Slot, teachers: Teacher[]): Record<string, number> {
  const reasons: Record<string, number> = {
    '空き枠なし': 0,
    '教科・学年が合わない': 0,
    'NG講師': 0,
    '1:2不可': 0,
    '上限到達': 0
  };

  teachers.forEach(teacher => {
    const isAvailable = teacher.teacher_availability.some(
      av => av.slot_id === slot.id && av.is_available
    );
    if (!isAvailable) {
      reasons['空き枠なし']++;
      return;
    }

    const canTeachAll = slot.slot_students.every(ss =>
      teacher.teacher_skills.some(skill =>
        skill.subject === ss.subject &&
        skill.grade_min <= ss.student.grade &&
        skill.grade_max >= ss.student.grade
      )
    );
    if (!canTeachAll) {
      reasons['教科・学年が合わない']++;
      return;
    }

    const isNG = slot.slot_students.some(ss =>
      ss.student.student_ng?.some(ng => ng.teacher_id === teacher.id)
    );
    if (isNG) {
      reasons['NG講師']++;
      return;
    }

    if (slot.slot_students.length === 2 && !teacher.allow_pair) {
      reasons['1:2不可']++;
      return;
    }

    const currentLoad = teacher.teacher_availability.filter(av => !av.is_available).length;
    if (currentLoad >= teacher.cap_week_slots) {
      reasons['上限到達']++;
      return;
    }
  });

  return reasons;
}
```

#### 6. 割当操作（PostgreSQL RPC Function）

```sql
-- supabase/migrations/001_assign_teacher_function.sql
CREATE OR REPLACE FUNCTION assign_teacher(
  p_slot_id VARCHAR(10),
  p_teacher_id UUID,
  p_assigned_by UUID
) RETURNS slot_teacher AS $$
DECLARE
  v_result slot_teacher;
BEGIN
  -- トランザクション開始（自動）

  -- 1. slot_teacher に保存
  INSERT INTO slot_teacher (slot_id, teacher_id, assigned_by, assigned_at)
  VALUES (p_slot_id, p_teacher_id, p_assigned_by, NOW())
  ON CONFLICT (slot_id) DO UPDATE
    SET teacher_id = EXCLUDED.teacher_id,
        assigned_by = EXCLUDED.assigned_by,
        assigned_at = EXCLUDED.assigned_at
  RETURNING * INTO v_result;

  -- 2. teacher_availability を消化（is_available = FALSE）
  UPDATE teacher_availability
  SET is_available = FALSE, updated_at = NOW()
  WHERE teacher_id = p_teacher_id AND slot_id = p_slot_id;

  -- 3. audit_logs に記録
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (p_assigned_by, 'ASSIGN', jsonb_build_object(
    'slot_id', p_slot_id,
    'teacher_id', p_teacher_id
  ));

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// フロントエンドから呼び出し
const AssignmentAPI = {
  async assignTeacher(
    slotId: string,
    teacherId: string
  ): Promise<Assignment> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.rpc('assign_teacher', {
      p_slot_id: slotId,
      p_teacher_id: teacherId,
      p_assigned_by: user!.id
    });
    if (error) throw error;
    return data;
  }
};
```

#### 7. Undo機能（クライアント Redux + RPC）

```typescript
// Redux Store（クライアント側）
interface UndoState {
  lastOperation: {
    type: 'ASSIGN' | 'CHANGE' | 'UNASSIGN';
    slotId: string;
    prevTeacherId: string | null;
    newTeacherId: string | null;
  } | null;
}

// Undo RPC Function（SQL）
CREATE OR REPLACE FUNCTION undo_assignment(
  p_slot_id VARCHAR(10),
  p_prev_teacher_id UUID,
  p_actor_id UUID
) RETURNS VOID AS $$
BEGIN
  -- 割当を復元
  IF p_prev_teacher_id IS NULL THEN
    DELETE FROM slot_teacher WHERE slot_id = p_slot_id;
  ELSE
    UPDATE slot_teacher
    SET teacher_id = p_prev_teacher_id
    WHERE slot_id = p_slot_id;
  END IF;

  -- 監査ログに記録
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (p_actor_id, 'UNDO', jsonb_build_object('slot_id', p_slot_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 8. 監査ログ（Supabase Trigger + REST API）

```sql
-- 自動監査ログ記録（PostgreSQL Trigger）
CREATE OR REPLACE FUNCTION log_teacher_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (actor_id, action, payload)
  VALUES (
    auth.uid(),
    TG_OP,
    jsonb_build_object('table', TG_TABLE_NAME, 'data', NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER teachers_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON teachers
FOR EACH ROW EXECUTE FUNCTION log_teacher_changes();
```

#### 9. CSV入出力（Edge Function）

```typescript
// supabase/functions/csv-import/index.ts
serve(async (req) => {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const dataType = formData.get('dataType') as string;

  // CSVパース・バリデーション
  const csv = await file.text();
  const rows = parseCSV(csv);

  // バリデーション
  const errors = validateRows(rows, dataType);
  if (errors.length > 0) {
    return new Response(JSON.stringify({ errors }), { status: 400 });
  }

  // Supabase一括インサート
  const { data, error } = await supabaseClient
    .from(dataType)
    .upsert(rows);

  return new Response(JSON.stringify({ inserted: data.length }));
});
```

#### 10. システム設定（Supabase REST API）

```typescript
const SettingsAPI = {
  async getSettings(): Promise<Settings> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return data;
  },

  async updateSettings(data: SettingsUpdate): Promise<Settings> {
    const { data: updated, error } = await supabase
      .from('settings')
      .update(data)
      .eq('id', 1)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }
};
```

### Frontend Components

| Component | Responsibility | Props/State |
|-----------|---------------|-------------|
| **App** | ルートコンポーネント、ルーティング | ユーザー認証状態、ロール |
| **LoginPage** | ログイン画面 | email, password, error |
| **AssignmentBoard** | 割当ボード（週次グリッド） | slots, onCellClick, undoEnabled |
| **SlotCell** | スロットセル（先生欄+生徒枠×2） | slot, teacher, students, onClick |
| **CandidateModal** | 候補講師リストモーダル | candidates, onSelect, onClose |
| **TeacherAvailabilityPage** | 講師空き枠入力画面 | teacherId, availability, onToggle |
| **WeekCalendar** | 週次カレンダーコンポーネント | slots, availability, onCellClick |
| **MasterDataPage** | マスタ管理画面（講師/生徒/コマ） | dataType, data, onEdit, onDelete |
| **TeacherForm** | 講師登録/編集フォーム | teacher, subjects, grades, onSubmit |
| **StudentForm** | 生徒登録/編集フォーム | student, subjects, ngTeachers, onSubmit |
| **CSVImportDialog** | CSVインポートダイアログ | dataType, onUpload, onClose |
| **CSVExportDialog** | CSVエクスポートダイアログ | dataType, onExport, onClose |
| **SettingsPage** | システム設定画面 | settings, onSave |
| **AuditLogViewer** | 監査ログ閲覧画面 | logs, filters, onFilter |
| **ErrorToast** | エラー通知トースト | message, severity, onClose |

### API Endpoints

Supabaseでは、3種類のAPIを組み合わせて使用します：

1. **Supabase REST API**: 自動生成されるCRUD API（`/rest/v1/`）
2. **Supabase RPC**: PostgreSQL関数を呼び出すAPI（`/rest/v1/rpc/`）
3. **Edge Functions**: カスタムロジック（`/functions/v1/`）

#### Authentication (Supabase Auth API)
| Method | Route | Purpose | Status Codes |
|--------|-------|---------|--------------|
| POST | `/auth/v1/signup` | 新規登録 | 200, 400, 500 |
| POST | `/auth/v1/token?grant_type=password` | ログイン（JWT発行） | 200, 401, 500 |
| POST | `/auth/v1/logout` | ログアウト | 204, 401, 500 |
| GET | `/auth/v1/user` | 現在のユーザー情報取得 | 200, 401, 500 |

#### Teachers (Supabase REST API + RLS)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/teachers?select=*` | 講師一覧取得 | Required | すべてのロール可 |
| POST | `/rest/v1/teachers` | 新規講師登録 | Admin | `auth.jwt() ->> 'role' = 'admin'` |
| GET | `/rest/v1/teachers?id=eq.{id}&select=*` | 講師詳細取得 | Required | すべてのロール可 |
| PATCH | `/rest/v1/teachers?id=eq.{id}` | 講師情報更新 | Admin | admin のみ |
| DELETE | `/rest/v1/teachers?id=eq.{id}` | 講師無効化 | Admin | admin のみ |

#### Students (Supabase REST API + RLS)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/students?select=*` | 生徒一覧取得 | Required | すべてのロール可 |
| POST | `/rest/v1/students` | 新規生徒登録 | Admin | admin のみ |
| GET | `/rest/v1/students?id=eq.{id}&select=*` | 生徒詳細取得 | Required | すべてのロール可 |
| PATCH | `/rest/v1/students?id=eq.{id}` | 生徒情報更新 | Admin | admin のみ |
| POST | `/rest/v1/student_ng` | NG講師追加 | Admin | admin のみ |
| DELETE | `/rest/v1/student_ng?student_id=eq.{id}&teacher_id=eq.{tid}` | NG講師解除 | Admin | admin のみ |

#### Slots (Supabase REST API + RLS)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/slots?select=*,slot_students(*,student:students(*)),slot_teacher(*)` | 週次スケジュール取得 | Required | すべてのロール可 |
| GET | `/rest/v1/slots?id=eq.{slot_id}&select=*` | スロット詳細取得 | Required | すべてのロール可 |
| POST | `/rest/v1/slot_students` | 生徒をスロットに配置 | Admin | admin のみ |
| DELETE | `/rest/v1/slot_students?slot_id=eq.{id}&seat=eq.{seat}` | スロットから生徒を削除 | Admin | admin のみ |

#### Availability (Supabase REST API + RLS)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/teacher_availability?select=*` | 自分の空き枠取得 | Teacher | `teacher_id = auth.uid()` |
| POST/PATCH | `/rest/v1/teacher_availability` | 空き枠トグル（UPSERT） | Teacher | `teacher_id = auth.uid()` |
| GET | `/rest/v1/teacher_availability?teacher_id=eq.{id}` | 講師の空き枠取得 | Admin | admin のみ |

#### Recommendations (クライアント側実装)

推薦エンジンはクライアント側のTypeScriptで実装されており、APIエンドポイントは不要です。

```typescript
// フロントエンドで直接呼び出し
import { getCandidates } from '@/services/recommendationEngine';

const candidates = await getCandidates('MON-A');
// → TeacherCandidate[] を返す
```

**戻り値**:
```typescript
interface TeacherCandidate {
  teacher: Teacher;
  score: number;
  reasons: string[];
  load: {
    today_slots: number;
    week_slots: number;
  };
}
```

#### Assignments (PostgreSQL RPC)
| Method | Route | Purpose | Auth | Status Codes |
|--------|-------|---------|------|--------------|
| POST | `/rest/v1/rpc/assign_teacher` | 講師割当 | Admin | 200, 400, 401, 403, 500 |
| POST | `/rest/v1/rpc/change_teacher` | 割当変更 | Admin | 200, 400, 401, 403, 500 |
| POST | `/rest/v1/rpc/unassign_teacher` | 割当解除 | Admin | 200, 401, 403, 500 |
| POST | `/rest/v1/rpc/undo_assignment` | Undo実行 | Admin | 200, 400, 401, 403, 500 |

**Example**: `assign_teacher`
```json
{
  "p_slot_id": "MON-A",
  "p_teacher_id": "teacher-uuid",
  "p_assigned_by": "admin-uuid"
}
```

#### CSV (Edge Function)
| Method | Route | Purpose | Auth | Status Codes |
|--------|-------|---------|------|--------------|
| POST | `/functions/v1/csv-import` | CSVインポート | Admin | 200, 400, 401, 403, 500 |
| POST | `/functions/v1/csv-export` | CSVエクスポート | Admin | 200, 401, 403, 500 |

#### Settings (Supabase REST API)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/settings?id=eq.1` | 設定取得 | Admin | admin のみ |
| PATCH | `/rest/v1/settings?id=eq.1` | 設定更新 | Admin | admin のみ |

#### Audit Logs (Supabase REST API)
| Method | Route | Purpose | Auth | RLS Policy |
|--------|-------|---------|------|------------|
| GET | `/rest/v1/audit_logs?select=*&order=created_at.desc` | 監査ログ取得 | Admin | admin のみ |

---

## Data Models

### Domain Entities

1. **User**: システムユーザー（ログイン、ロール管理）
2. **Teacher**: 講師（スキル、上限、空き枠）
3. **Student**: 生徒（学年、受講教科、NG講師）
4. **Koma**: コママスタ（0, 1, A, B, C + 順序）
5. **Slot**: 授業枠（DAY-KOMA識別子）
6. **SlotStudent**: スロット内生徒配置（座席1/2、教科）
7. **SlotTeacher**: スロット割当講師
8. **TeacherSkill**: 講師の対応教科・学年範囲
9. **TeacherAvailability**: 講師の空き枠
10. **StudentNG**: 生徒のNG講師
11. **AuditLog**: 監査ログ（操作履歴）
12. **Settings**: システム設定（ソフト条件の重み、1:2ルール）

### Entity Relationships

```mermaid
erDiagram
    USER ||--o{ TEACHER : "is"
    USER ||--o{ AUDIT_LOG : "performs"

    TEACHER ||--o{ TEACHER_SKILL : "has"
    TEACHER ||--o{ TEACHER_AVAILABILITY : "has"
    TEACHER ||--o{ SLOT_TEACHER : "assigned_to"
    TEACHER ||--o{ STUDENT_NG : "excluded_by"

    STUDENT ||--o{ SLOT_STUDENT : "placed_in"
    STUDENT ||--o{ STUDENT_NG : "excludes"

    KOMA ||--o{ SLOT : "defines"

    SLOT ||--o{ SLOT_STUDENT : "contains"
    SLOT ||--o| SLOT_TEACHER : "has"

    SLOT_STUDENT }o--|| STUDENT : "references"
    SLOT_TEACHER }o--|| TEACHER : "references"
    TEACHER_AVAILABILITY }o--|| SLOT : "references"
```

### Data Model Definitions

#### TypeScript Interfaces (Frontend)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'viewer';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Teacher {
  id: string;
  name: string;
  active: boolean;
  capWeekSlots: number;       // 週あたり上限コマ数
  capStudents: number;         // 同時担当可能生徒数
  allowPair: boolean;          // 1:2指導可否
  skills: TeacherSkill[];
  availability: TeacherAvailability[];
  createdAt: Date;
  updatedAt: Date;
}

interface TeacherSkill {
  teacherId: string;
  subject: string;             // 教科
  gradeMin: number;            // 対応最小学年
  gradeMax: number;            // 対応最大学年
}

interface TeacherAvailability {
  teacherId: string;
  slotId: string;              // DAY-KOMA形式
  isAvailable: boolean;
  updatedAt: Date;
}

interface Student {
  id: string;
  name: string;
  grade: number;
  active: boolean;
  subjects: string[];          // 受講教科リスト
  ngTeachers: string[];        // NG講師IDリスト
  createdAt: Date;
  updatedAt: Date;
}

interface Koma {
  code: string;                // "0" | "1" | "A" | "B" | "C"
  order: number;               // 表示順序 (0, 1, 2, 3, 4)
}

interface Slot {
  id: string;                  // "MON-A" 形式
  day: string;                 // "MON" | "TUE" | ... | "SUN"
  komaCode: string;            // "0" | "1" | "A" | "B" | "C"
  students: SlotStudent[];     // 最大2人
  teacher: SlotTeacher | null;
}

interface SlotStudent {
  slotId: string;
  seat: 1 | 2;
  studentId: string;
  student: Student;
  subject: string;             // この枠での教科
  grade: number;               // この時点の学年
}

interface SlotTeacher {
  slotId: string;
  teacherId: string;
  teacher: Teacher;
  assignedBy: string;
  assignedAt: Date;
}

interface TeacherCandidate {
  teacher: Teacher;
  score: number;
  reasons: string[];           // 推薦理由
  load: {
    todaySlots: number;
    weekSlots: number;
  };
}

interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;              // "ASSIGN" | "CHANGE" | "UNASSIGN" | "UNDO" | ...
  payload: Record<string, any>;
  createdAt: Date;
}

interface Settings {
  loadWeight: number;          // 負荷優先度の重み
  continuityWeight: number;    // 継続性の重み
  gradeDiffWeight: number;     // 学年差の重み
  pairSameSubjectRequired: boolean;  // 1:2で同一教科必須
  pairMaxGradeDiff: number;    // 1:2の学年差上限
  updatedAt: Date;
}
```

#### Python Dataclasses (Backend)

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class Teacher:
    id: str
    name: str
    active: bool
    cap_week_slots: int
    cap_students: int
    allow_pair: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class TeacherSkill:
    teacher_id: str
    subject: str
    grade_min: int
    grade_max: int

@dataclass
class TeacherAvailability:
    teacher_id: str
    slot_id: str
    is_available: bool
    updated_at: datetime

@dataclass
class Student:
    id: str
    name: str
    grade: int
    active: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class Koma:
    code: str  # "0" | "1" | "A" | "B" | "C"
    order: int

@dataclass
class Slot:
    id: str  # "MON-A" 形式
    day: str
    koma_code: str

@dataclass
class SlotStudent:
    slot_id: str
    seat: int  # 1 or 2
    student_id: str
    subject: str
    grade: int

@dataclass
class SlotTeacher:
    slot_id: str
    teacher_id: Optional[str]
    assigned_by: Optional[str]
    assigned_at: Optional[datetime]

@dataclass
class AuditLog:
    id: str
    actor_id: str
    action: str
    payload: dict
    created_at: datetime

@dataclass
class Settings:
    load_weight: float
    continuity_weight: float
    grade_diff_weight: float
    pair_same_subject_required: bool
    pair_max_grade_diff: int
    updated_at: datetime

@dataclass
class TeacherCandidate:
    teacher: Teacher
    score: float
    reasons: list[str]
    load: dict[str, int]  # {"today_slots": 2, "week_slots": 8}
```

### Database Schema

#### PostgreSQL DDL

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'viewer')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    cap_week_slots INT NOT NULL,
    cap_students INT NOT NULL,
    allow_pair BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Teacher Skills (Many-to-Many)
CREATE TABLE teacher_skills (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade_min INT NOT NULL,
    grade_max INT NOT NULL,
    PRIMARY KEY (teacher_id, subject)
);

-- Koma Master
CREATE TABLE koma_master (
    code VARCHAR(1) PRIMARY KEY CHECK (code IN ('0', '1', 'A', 'B', 'C')),
    koma_order INT NOT NULL UNIQUE
);

-- Slots
CREATE TABLE slots (
    id VARCHAR(10) PRIMARY KEY,  -- "MON-A" 形式
    day VARCHAR(3) NOT NULL CHECK (day IN ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN')),
    koma_code VARCHAR(1) NOT NULL REFERENCES koma_master(code)
);

-- Teacher Availability
CREATE TABLE teacher_availability (
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (teacher_id, slot_id)
);

-- Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    grade INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Student Subjects (Array)
CREATE TABLE student_subjects (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    PRIMARY KEY (student_id, subject)
);

-- Student NG Teachers
CREATE TABLE student_ng (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, teacher_id)
);

-- Slot Students
CREATE TABLE slot_students (
    slot_id VARCHAR(10) NOT NULL REFERENCES slots(id),
    seat INT NOT NULL CHECK (seat IN (1, 2)),
    student_id UUID NOT NULL REFERENCES students(id),
    subject VARCHAR(100) NOT NULL,
    grade INT NOT NULL,
    PRIMARY KEY (slot_id, seat)
);

-- Slot Teacher
CREATE TABLE slot_teacher (
    slot_id VARCHAR(10) PRIMARY KEY REFERENCES slots(id),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings (Singleton)
CREATE TABLE settings (
    id INT PRIMARY KEY CHECK (id = 1),  -- 1レコードのみ
    load_weight FLOAT NOT NULL DEFAULT 1.0,
    continuity_weight FLOAT NOT NULL DEFAULT 0.5,
    grade_diff_weight FLOAT NOT NULL DEFAULT 0.3,
    pair_same_subject_required BOOLEAN NOT NULL DEFAULT TRUE,
    pair_max_grade_diff INT NOT NULL DEFAULT 2,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_teacher_availability_teacher ON teacher_availability(teacher_id);
CREATE INDEX idx_teacher_availability_slot ON teacher_availability(slot_id);
CREATE INDEX idx_slot_students_student ON slot_students(student_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==================================================================
-- Row Level Security (RLS) Policies
-- ==================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_ng ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_teacher ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user role from JWT
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    (SELECT role FROM users WHERE id = auth.uid())
  );
$$ LANGUAGE SQL STABLE;

-- Users: admin can manage, users can read own data
CREATE POLICY "Users: admin full access" ON users
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Users: users can read own data" ON users
  FOR SELECT USING (id = auth.uid());

-- Teachers: admin can manage, all authenticated can read
CREATE POLICY "Teachers: admin full access" ON teachers
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Teachers: authenticated can read" ON teachers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Teacher Skills: admin can manage, all authenticated can read
CREATE POLICY "Teacher Skills: admin full access" ON teacher_skills
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Teacher Skills: authenticated can read" ON teacher_skills
  FOR SELECT USING (auth.role() = 'authenticated');

-- Teacher Availability: teachers can manage own, admin can manage all, all can read
CREATE POLICY "Availability: teachers can manage own" ON teacher_availability
  FOR ALL USING (
    teacher_id = auth.uid() OR auth.user_role() = 'admin'
  );

CREATE POLICY "Availability: authenticated can read" ON teacher_availability
  FOR SELECT USING (auth.role() = 'authenticated');

-- Students: admin can manage, all authenticated can read
CREATE POLICY "Students: admin full access" ON students
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Students: authenticated can read" ON students
  FOR SELECT USING (auth.role() = 'authenticated');

-- Student Subjects: admin can manage, all authenticated can read
CREATE POLICY "Student Subjects: admin full access" ON student_subjects
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Student Subjects: authenticated can read" ON student_subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- Student NG: admin can manage, all authenticated can read
CREATE POLICY "Student NG: admin full access" ON student_ng
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Student NG: authenticated can read" ON student_ng
  FOR SELECT USING (auth.role() = 'authenticated');

-- Slots: admin can manage, all authenticated can read
CREATE POLICY "Slots: admin full access" ON slots
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Slots: authenticated can read" ON slots
  FOR SELECT USING (auth.role() = 'authenticated');

-- Slot Students: admin can manage, all authenticated can read
CREATE POLICY "Slot Students: admin full access" ON slot_students
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Slot Students: authenticated can read" ON slot_students
  FOR SELECT USING (auth.role() = 'authenticated');

-- Slot Teacher: admin can manage, all authenticated can read
CREATE POLICY "Slot Teacher: admin full access" ON slot_teacher
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Slot Teacher: authenticated can read" ON slot_teacher
  FOR SELECT USING (auth.role() = 'authenticated');

-- Audit Logs: admin can read, system can write (via triggers)
CREATE POLICY "Audit Logs: admin can read" ON audit_logs
  FOR SELECT USING (auth.user_role() = 'admin');

CREATE POLICY "Audit Logs: system can insert" ON audit_logs
  FOR INSERT WITH CHECK (true);  -- Triggers/RPC functions can insert

-- Settings: admin full access, others can read
CREATE POLICY "Settings: admin full access" ON settings
  FOR ALL USING (auth.user_role() = 'admin');

CREATE POLICY "Settings: authenticated can read" ON settings
  FOR SELECT USING (auth.role() = 'authenticated');
```

### Migration Strategy

#### Alembic Migrations
```python
# alembic/versions/001_initial_schema.py
def upgrade():
    # Create tables in dependency order
    op.create_table('users', ...)
    op.create_table('teachers', ...)
    op.create_table('koma_master', ...)
    # ...

    # Insert initial data
    op.execute("""
        INSERT INTO koma_master (code, koma_order) VALUES
        ('0', 0), ('1', 1), ('A', 2), ('B', 3), ('C', 4);
    """)

    op.execute("""
        INSERT INTO settings (id, load_weight, continuity_weight, grade_diff_weight)
        VALUES (1, 1.0, 0.5, 0.3);
    """)

def downgrade():
    # Drop tables in reverse order
    op.drop_table('audit_logs')
    op.drop_table('slot_teacher')
    # ...
```

#### Backward Compatibility
- **新カラム追加**: `ALTER TABLE ADD COLUMN ... DEFAULT ...` で既存データに影響なし
- **カラム削除**: 段階的削除（1. アプリで未使用にする → 2. マイグレーションで削除）
- **データ変換**: マイグレーション内で `UPDATE` 文で変換

#### Indexing Strategy
- **外部キー**: 自動インデックス（PostgreSQL）
- **頻繁な検索**: `teacher_availability`, `audit_logs` にインデックス
- **部分インデックス**: `WHERE active = TRUE` で有効な講師/生徒のみ
- **JSONB**: `audit_logs.payload` に GIN インデックス（必要に応じて）

---

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データに誤りがあります",
    "details": [
      {
        "field": "cap_week_slots",
        "message": "週あたりの上限コマ数は1以上である必要があります"
      }
    ]
  }
}
```

### Error Categories

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | 入力バリデーションエラー |
| `AUTHENTICATION_ERROR` | 401 | 認証失敗（JWT無効、期限切れ） |
| `AUTHORIZATION_ERROR` | 403 | 認可失敗（権限不足） |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `CONFLICT` | 409 | データ競合（重複キーなど） |
| `BUSINESS_RULE_ERROR` | 422 | ビジネスルール違反 |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

### Error Handling Middleware (FastAPI)

```python
@app.exception_handler(ValidationException)
async def validation_exception_handler(request: Request, exc: ValidationException):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(exc),
                "details": exc.details
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "エラーが発生しました。管理者に連絡してください。"
            }
        }
    )
```

---

## Security Considerations

### Authentication & Authorization

#### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant SupaAuth as Supabase Auth
    participant SupaDB as Supabase PostgreSQL
    participant RLS as Row Level Security

    User->>Frontend: メール・パスワード入力
    Frontend->>SupaAuth: supabase.auth.signInWithPassword()
    SupaAuth->>SupaDB: SELECT user WHERE email
    SupaDB-->>SupaAuth: user (password_hash)
    SupaAuth->>SupaAuth: bcrypt.verify(password, hash)
    SupaAuth->>SupaAuth: generate JWT (role, user_id)
    SupaAuth-->>Frontend: JWT token + session
    Frontend->>Frontend: Supabase Client saves token

    Frontend->>SupaDB: GET /rest/v1/slots (Authorization: Bearer JWT)
    SupaDB->>RLS: Verify JWT signature
    RLS->>RLS: Extract role from JWT
    RLS->>RLS: Apply RLS policies
    SupaDB-->>Frontend: 200 OK (filtered data)
```

#### JWT Structure (Supabase)
```json
{
  "sub": "user-id-uuid",
  "aud": "authenticated",
  "role": "authenticated",
  "email": "admin@example.com",
  "user_metadata": {
    "name": "山田太郎",
    "role": "admin"
  },
  "app_metadata": {
    "provider": "email"
  },
  "exp": 1678900000,
  "iat": 1678896400
}
```

**Note**: ユーザーの実際のロール（admin/teacher/viewer）は `user_metadata.role` に保存されます。RLSポリシーでは `auth.user_role()` ヘルパー関数を使用してアクセスします。

#### Authorization Matrix

| Resource | Admin | Teacher | Viewer |
|----------|-------|---------|--------|
| 講師マスタ CRUD | ✅ | ❌ | ❌ |
| 生徒マスタ CRUD | ✅ | ❌ | ❌ |
| 授業枠 CRUD | ✅ | ❌ | ❌ |
| 自分の空き枠編集 | ✅ | ✅ | ❌ |
| 講師割当操作 | ✅ | ❌ | ❌ |
| 候補講師表示 | ✅ | ❌ | ❌ |
| Undo | ✅ | ❌ | ❌ |
| CSV入出力 | ✅ | ❌ | ❌ |
| 監査ログ閲覧 | ✅ | ❌ | ❌ |
| 割当ボード閲覧 | ✅ | ✅（制限） | ✅ |
| 自分の担当一覧 | ✅ | ✅ | ❌ |

### Data Protection

#### Input Validation
- **Pydantic**: すべての API リクエストボディをバリデーション
- **サニタイゼーション**: XSS対策（HTMLエスケープ）
- **型チェック**: TypeScript + Zod でフロントエンド側も検証

#### Data Encryption
- **通信**: HTTPS（TLS 1.3）で暗号化
- **パスワード**: bcrypt（cost=12）でハッシュ化
- **機密データ**: 個人情報（生徒名、講師名）は暗号化不要（HTTPS で十分）

#### Sensitive Data Handling
- **ログ**: パスワード、トークンをログに出力しない
- **CSV**: 個人情報含む場合はダウンロード前に確認ダイアログ
- **エラーメッセージ**: DBエラーの詳細を外部に漏らさない

### Security Best Practices

#### OWASP Top 10 Mitigation

| OWASP Top 10 | 対策 |
|--------------|------|
| A01: Broken Access Control | JWT + ロールベース認可、全エンドポイントで権限チェック |
| A02: Cryptographic Failures | HTTPS、bcrypt、セッショントークンはRedisで管理 |
| A03: Injection | Pydantic バリデーション、SQLAlchemy ORM（パラメータ化クエリ） |
| A04: Insecure Design | 監査ログ、Undo機能、権限分離設計 |
| A05: Security Misconfiguration | 環境変数で秘密鍵管理、デフォルト設定変更 |
| A06: Vulnerable Components | 依存関係を定期的に更新（Dependabot） |
| A07: Identification Failures | JWT有効期限30分、セッション管理 |
| A08: Software Integrity Failures | Docker イメージの署名検証 |
| A09: Logging Failures | 監査ログ、エラーログ、アクセスログ |
| A10: SSRF | 外部APIアクセスなし（該当なし） |

#### API Rate Limiting
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/slots/{slot_id}/candidates")
@limiter.limit("10/minute")  # 1分間に10回まで
async def get_candidates(slot_id: str):
    # ...
```

#### CORS Configuration
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://example.com"],  # 本番環境のFQDN
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

#### Security Headers
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware

app.add_middleware(HTTPSRedirectMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["example.com"])

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000"
    return response
```

---

## Performance & Scalability

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| 割当ボード表示（p95） | < 500ms | API /api/slots レスポンス時間 |
| 候補講師生成（p95） | < 800ms | API /api/slots/{id}/candidates レスポンス時間 |
| 割当操作（p95） | < 300ms | API POST /api/assignments レスポンス時間 |
| DB クエリ（p99） | < 50ms | PostgreSQL スロークエリログ |
| 同時ユーザー | 10人（管理者） | 負荷テストで検証 |
| データ量 | 講師100人、生徒500人、週35スロット | 想定規模 |

### Caching Strategy

#### Browser Cache
- **静的アセット**: JS/CSS/画像（Cache-Control: max-age=31536000）
- **API レスポンス**: Cache-Control: no-store（リアルタイム性重視）

#### Redis Cache
```python
# 候補講師リストのキャッシュ（5分間有効）
@cache(ttl=300, key="candidates:{slot_id}")
async def get_candidates(slot_id: str) -> list[TeacherCandidate]:
    # ...

# 週次スケジュールのキャッシュ（1分間有効）
@cache(ttl=60, key="week_schedule")
async def get_week_schedule() -> dict[str, Slot]:
    # ...
```

#### Database Query Optimization
- **N+1問題**: `joinedload` で一括取得
  ```python
  # Bad: N+1問題
  slots = session.query(Slot).all()
  for slot in slots:
      students = slot.students  # 毎回クエリ発行

  # Good: 一括取得
  slots = session.query(Slot).options(
      joinedload(Slot.students).joinedload(SlotStudent.student)
  ).all()
  ```
- **インデックス**: 頻繁な検索カラムにインデックス
- **EXPLAIN ANALYZE**: スロークエリを分析して最適化

### Scalability Approach

#### Horizontal Scaling
- **アプリケーションサーバー**: Dockerコンテナを複数起動（Kubernetes or Docker Swarm）
- **ロードバランサー**: Nginx or AWS ALB でトラフィック分散
- **ステートレス**: JWTでステートレス化（セッション情報はRedis）

#### Database Scaling
- **Read Replicas**: 読み取り専用レプリカで参照負荷を分散
- **Connection Pooling**: SQLAlchemy の connection pool（max_connections=50）
- **Partitioning**: 監査ログを月次パーティション（将来的に）

#### Background Jobs
```python
# Celery for async processing
from celery import Celery

celery = Celery('tasks', broker='redis://localhost:6379/0')

@celery.task
def import_csv_async(file_path: str, data_type: str, user_id: str):
    # CSV インポートを非同期処理
    # ...
```

#### Auto-scaling
- **メトリクス**: CPU使用率、メモリ使用率、リクエスト数
- **スケールアウト**: CPU > 70% で追加コンテナ起動
- **スケールイン**: CPU < 30% でコンテナ削減

---

## Testing Strategy

### Test Coverage Requirements

- **Unit Tests**: ≥80% コードカバレッジ
  - `RecommendationEngine`: 100%（コアロジック）
  - `AssignmentService`: 100%（重要な操作）
  - その他サービス: ≥80%
- **Integration Tests**: 全APIエンドポイント
- **E2E Tests**: 3つの主要ユーザーフロー
- **Performance Tests**: 負荷テストで検証

### Testing Approach

#### 1. Unit Testing (pytest)
```python
# tests/test_recommendation_engine.py
def test_apply_hard_constraints_removes_unavailable_teachers():
    # Given
    slot = create_slot_with_students(subject="数学", grade=3)
    teachers = [
        create_teacher(id="T1", available=True, subjects=["数学"]),
        create_teacher(id="T2", available=False, subjects=["数学"]),
    ]
    engine = RecommendationEngine()

    # When
    candidates = engine.apply_hard_constraints(slot, teachers)

    # Then
    assert len(candidates) == 1
    assert candidates[0].id == "T1"

def test_apply_soft_scoring_prioritizes_low_load():
    # Given
    slot = create_slot_with_students(subject="数学", grade=3)
    teachers = [
        create_teacher(id="T1", current_load=2),
        create_teacher(id="T2", current_load=8),
    ]
    settings = Settings(load_weight=1.0, continuity_weight=0.5)
    engine = RecommendationEngine()

    # When
    scored = engine.apply_soft_scoring(slot, teachers, settings)

    # Then
    assert scored[0].teacher.id == "T1"  # 低負荷が優先
    assert scored[0].score > scored[1].score
```

#### 2. Integration Testing (FastAPI TestClient)
```python
# tests/test_api_assignments.py
from fastapi.testclient import TestClient

def test_assign_teacher_success(client: TestClient, auth_headers):
    # Given
    slot_id = "MON-A"
    teacher_id = "teacher-uuid"

    # When
    response = client.post(
        "/api/assignments",
        json={"slot_id": slot_id, "teacher_id": teacher_id},
        headers=auth_headers
    )

    # Then
    assert response.status_code == 201
    data = response.json()
    assert data["slot_id"] == slot_id
    assert data["teacher_id"] == teacher_id

def test_assign_teacher_unauthorized(client: TestClient):
    # When
    response = client.post("/api/assignments", json={})

    # Then
    assert response.status_code == 401
```

#### 3. End-to-End Testing (Playwright)
```typescript
// e2e/assignment-flow.spec.ts
import { test, expect } from '@playwright/test';

test('管理者が講師を割り当てるフロー', async ({ page }) => {
  // 1. ログイン
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/board');

  // 2. 割当ボードで先生欄をクリック
  await page.click('[data-testid="slot-MON-A-teacher"]');
  await expect(page.locator('[data-testid="candidate-modal"]')).toBeVisible();

  // 3. 候補講師を選択
  await page.click('[data-testid="candidate-T1"]');
  await page.click('button:has-text("確定")');

  // 4. 割当が反映されることを確認
  await expect(page.locator('[data-testid="slot-MON-A-teacher"]')).toContainText('山田太郎');
});
```

#### 4. Performance Testing (Locust)
```python
# locustfile.py
from locust import HttpUser, task, between

class AdminUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        # ログインしてトークン取得
        response = self.client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "password"
        })
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    @task(3)
    def view_board(self):
        self.client.get("/api/slots", headers=self.headers)

    @task(2)
    def get_candidates(self):
        self.client.get("/api/slots/MON-A/candidates", headers=self.headers)

    @task(1)
    def assign_teacher(self):
        self.client.post("/api/assignments", json={
            "slot_id": "MON-A",
            "teacher_id": "teacher-uuid"
        }, headers=self.headers)
```

### CI/CD Pipeline

```mermaid
graph LR
    A[Git Push] --> B[Lint & Format]
    B --> C[Unit Tests]
    C --> D[Integration Tests]
    D --> E[Build Docker Image]
    E --> F[Deploy to Staging]
    F --> G[E2E Tests]
    G --> H[Performance Tests]
    H --> I{Approved?}
    I -->|Yes| J[Deploy to Production]
    I -->|No| K[Rollback]
```

#### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run linter
        run: ruff check .

      - name: Run unit tests
        run: pytest tests/ --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t teacher-assignment:${{ github.sha }} .

      - name: Push to registry
        run: docker push teacher-assignment:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: |
          ssh staging "docker pull teacher-assignment:${{ github.sha }}"
          ssh staging "docker-compose up -d"

  e2e-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Playwright
        run: npm install && npx playwright install

      - name: Run E2E tests
        run: npx playwright test
```

---

## Deployment & Infrastructure

### PoC環境（完全無料）

#### Supabase無料枠の利用

| リソース | 無料枠 | 本システムの利用見込み | 十分性 |
|---------|--------|---------------------|--------|
| PostgreSQL | 500MB | 講師100人+生徒500人+ログ: ~50MB | ✅ 十分 |
| Auth (MAU) | 50,000 | 管理者+講師: ~10-20人 | ✅ 十分 |
| Edge Functions | 500k呼出/月 | 推薦エンジン: ~1,000呼出/月 | ✅ 十分 |
| Storage | 1GB | CSV一時保存: ~10MB | ✅ 十分 |
| Bandwidth | 5GB/月 | フロントエンド転送: ~500MB/月 | ✅ 十分 |

#### フロントエンドホスティング（Vercel無料枠）

| リソース | 無料枠 | 本システムの利用見込み | 十分性 |
|---------|--------|---------------------|--------|
| Bandwidth | 100GB/月 | ~2GB/月 | ✅ 十分 |
| ビルド時間 | 6,000分/月 | ~100分/月 | ✅ 十分 |
| デプロイ数 | 100回/日 | ~10回/日 | ✅ 十分 |

**結論**: PoCは完全無料で運用可能（$0/月）

### ローカル開発環境

```bash
# 1. Supabase CLIインストール
npm install -g supabase

# 2. プロジェクト初期化
supabase init

# 3. ローカルSupabase起動（Dockerが必要）
supabase start
# → PostgreSQL, Auth, Edge Functions, Storage がローカルで起動

# 4. マイグレーション作成
supabase migration new initial_schema

# 5. マイグレーション適用
supabase db push

# 6. Edge Function作成
supabase functions new get-candidates

# 7. Edge Function実行（ローカル）
supabase functions serve

# 8. フロントエンド開発
cd frontend
npm run dev
```

### デプロイメント手順

#### 初回デプロイ

```bash
# 1. Supabaseプロジェクト作成（Web UI）
# https://supabase.com/dashboard

# 2. ローカルとリンク
supabase link --project-ref YOUR_PROJECT_REF

# 3. データベースマイグレーション
supabase db push

# 4. Edge Functions デプロイ（CSV処理のみ）
supabase functions deploy csv-import
supabase functions deploy csv-export

# 5. 環境変数設定
supabase secrets set OPENAI_API_KEY=xxx

# 6. フロントエンドデプロイ（Vercel）
cd frontend
vercel --prod
# 環境変数: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

#### CI/CDパイプライン（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Supabase

on:
  push:
    branches: [main]

jobs:
  deploy-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Run migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}

  deploy-functions:
    runs-on: ubuntu-latest
    needs: deploy-database
    steps:
      - uses: actions/checkout@v3

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy csv-import
          supabase functions deploy csv-export
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### スケーリング戦略（本番移行時）

#### Supabase有料プラン（Pro: $25/月〜）

| 項目 | 無料枠 | Pro ($25/月) | 備考 |
|-----|--------|--------------|------|
| DB容量 | 500MB | 8GB | 生徒1,000人超で必要 |
| Bandwidth | 5GB | 250GB | アクセス増加時 |
| Edge Functions | 500k | 2M呼出 | 推薦エンジン頻繁利用時 |
| Auth MAU | 50k | 100k | ユーザー増加時 |
| Point-in-time Recovery | ❌ | ✅ | 本番運用で必須 |
| Daily Backups | ❌ | ✅ | 本番運用で必須 |

#### AWS移行パス（将来的に）

もしSupabaseの無料枠/有料プランでは不十分になった場合、以下の移行パスがあります：

1. **データベース**: Supabase PostgreSQL → AWS RDS/Aurora Serverless v2
   - PostgreSQL互換なので `pg_dump` でマイグレーション可能
   - RLSポリシーもそのまま利用可能

2. **認証**: Supabase Auth → AWS Cognito
   - JWT形式は維持、クレーム構造を調整

3. **Edge Functions**: Supabase Edge Functions → AWS Lambda
   - Deno → Node.js への書き換え必要（TypeScriptは維持）

4. **Storage**: Supabase Storage → S3
   - API互換性はないが、移行スクリプトで対応可能

**移行コスト見積もり（AWS）**:
- Aurora Serverless v2: $50-100/月（0.5-1 ACU）
- Lambda: $10-20/月（推薦エンジン、CSV処理）
- Cognito: $0（MAU 50k まで無料）
- S3: $5/月（1GBストレージ + 転送）
- **合計**: $65-125/月

### 監視・運用

#### Supabase Dashboard（無料）

- リアルタイムAPI使用量モニタリング
- ログ検索（直近7日間）
- パフォーマンスメトリクス（クエリ実行時間）
- エラーアラート（Email通知）

#### 追加監視（オプション）

- **Sentry**: フロントエンドエラー追跡（無料枠: 5k events/月）
- **LogRocket**: セッションリプレイ（無料枠: 1k sessions/月）
- **UptimeRobot**: 死活監視（無料枠: 50 monitors）

### セキュリティ対策

#### Supabase組み込みセキュリティ

- ✅ HTTPS/TLS 1.3 強制
- ✅ Row Level Security (RLS) 有効化
- ✅ JWT有効期限管理（デフォルト: 1時間）
- ✅ Rate Limiting（デフォルト: 1000 req/分）
- ✅ DDoS保護（Cloudflare経由）

#### 追加セキュリティ設定

```sql
-- JWT有効期限を30分に短縮
ALTER TABLE auth.refresh_tokens
SET (refresh_token_reuse_interval = '1800');

-- パスワードポリシー強化
ALTER DATABASE postgres SET password_encryption = 'scram-sha-256';

-- 監査ログの保持期間（90日）
CREATE POLICY "Audit log retention" ON audit_logs
FOR DELETE USING (created_at < NOW() - INTERVAL '90 days');
```

### バックアップ戦略

#### Supabase組み込みバックアップ

- **無料枠**: バックアップなし（開発用）
- **Pro枠**: 日次自動バックアップ（7日保持）、Point-in-time Recovery（7日）

#### 手動バックアップ（PoC推奨）

```bash
# データベース全体をダンプ
supabase db dump -f backup.sql

# 復元
supabase db reset
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql

# 定期実行（cron）
0 2 * * * /usr/local/bin/supabase db dump -f /backups/db-$(date +\%Y\%m\%d).sql
```

---

## コスト見積もり

### PoC段階（0-50人利用）

| 項目 | サービス | プラン | コスト |
|-----|---------|--------|--------|
| データベース | Supabase | Free | **$0** |
| 認証 | Supabase Auth | Free | **$0** |
| Edge Functions | Supabase | Free | **$0** |
| Storage | Supabase | Free | **$0** |
| フロントエンド | Vercel | Free | **$0** |
| ドメイン | 独自ドメイン | オプション | $0-12/年 |
| **合計** | | | **$0/月** |

### 本番移行（50-500人利用）

| 項目 | サービス | プラン | コスト |
|-----|---------|--------|--------|
| データベース | Supabase | Pro | **$25/月** |
| フロントエンド | Vercel | Pro | **$20/月** |
| 監視 | Sentry | Team | **$0** (無料枠で十分) |
| ドメイン | 独自ドメイン | 必須 | $12/年 |
| **合計** | | | **$45-50/月** |

### スケール時（500-2000人利用）

| 項目 | サービス | プラン | コスト |
|-----|---------|--------|--------|
| データベース | AWS Aurora Serverless v2 | 1 ACU | **$75/月** |
| Lambda | AWS Lambda | 100万呼出 | **$15/月** |
| Cognito | AWS Cognito | 50k MAU | **$0** |
| S3 + CloudFront | AWS | 10GB | **$10/月** |
| フロントエンド | Vercel | Pro | **$20/月** |
| 監視 | Datadog | - | **$30/月** |
| **合計** | | | **$150-180/月** |

---

**STATUS**: 設計生成完了（Supabaseベース、完全無料PoC対応）
**NEXT STEP**: 設計をレビューし、承認後に `/kiro:spec-tasks teacher-assignment-system` でタスク分解フェーズに進む
**PoC実装パス**: Supabase無料枠で即座に開発開始可能（$0初期コスト）
