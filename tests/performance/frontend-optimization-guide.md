# フロントエンドパフォーマンス最適化ガイド

Task 10.3: フロントエンドのパフォーマンス最適化

## 1. React Query キャッシング設定

### 現在の設定確認

```typescript
// src/lib/react-query.ts または QueryClientProvider設定箇所を確認

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      cacheTime: 10 * 60 * 1000, // 10分
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
})
```

### 推奨設定

- **パターンリスト**: `staleTime: 5 * 60 * 1000` (5分) - パターンは頻繁に変更されない
- **月次カレンダーデータ**: `staleTime: 2 * 60 * 1000` (2分) - カレンダーデータは比較的静的
- **例外処理リスト**: `staleTime: 1 * 60 * 1000` (1分) - 例外は比較的動的

```typescript
// 使用例
const { data: patterns } = useQuery({
  queryKey: ['recurring-patterns', teacherId],
  queryFn: () => listRecurringAssignments(teacherId),
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
})
```

## 2. useMemo と useCallback の適用

### RecurringPatternList コンポーネント

```typescript
// src/components/recurring-patterns/RecurringPatternList.tsx

import { useMemo, useCallback } from 'react'

export const RecurringPatternList: React.FC<RecurringPatternListProps> = ({
  patterns,
  onEdit,
  onDelete,
}) => {
  // フィルタリングとソートロジックをメモ化
  const sortedAndFilteredPatterns = useMemo(() => {
    return patterns
      .filter((pattern) => pattern.active)
      .sort((a, b) => {
        // 曜日でソート
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek
        }
        // コマでソート
        return a.timeSlotId.localeCompare(b.timeSlotId)
      })
  }, [patterns])

  // イベントハンドラをメモ化
  const handleEdit = useCallback(
    (pattern: RecurringAssignment) => {
      onEdit(pattern)
    },
    [onEdit]
  )

  const handleDelete = useCallback(
    (patternId: string) => {
      onDelete(patternId)
    },
    [onDelete]
  )

  return (
    <PatternListContainer>
      {sortedAndFilteredPatterns.map((pattern) => (
        <PatternListItem
          key={pattern.id}
          pattern={pattern}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </PatternListContainer>
  )
}
```

### MonthlyCalendarPage コンポーネント

```typescript
// src/pages/MonthlyCalendarPage.tsx

import { useMemo, useCallback } from 'react'

export const MonthlyCalendarPage: React.FC = () => {
  // ... existing code

  // カレンダーデータのフィルタリングをメモ化
  const filteredCalendarData = useMemo(() => {
    if (dataSourceFilter === 'all') return calendarData
    return calendarData.filter((item) => item.dataSource === dataSourceFilter)
  }, [calendarData, dataSourceFilter])

  // セルの背景色計算をメモ化
  const getCellBackgroundColor = useCallback((dataSource: string | null) => {
    switch (dataSource) {
      case 'pattern':
        return '#DBEAFE' // 青
      case 'assignment':
        return '#D1FAE5' // 緑
      case 'exception':
        return '#F3F4F6' // グレー
      default:
        return 'transparent'
    }
  }, [])

  // コンテキストメニューハンドラをメモ化
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: MonthlyCalendarData) => {
      e.preventDefault()
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        item,
      })
    },
    []
  )

  // ... rest of the component
}
```

## 3. 仮想スクロールの実装

### react-window の導入

パターン一覧が100件以上の場合、仮想スクロールを実装してレンダリング性能を向上：

```bash
npm install react-window
npm install --save-dev @types/react-window
```

```typescript
// src/components/recurring-patterns/VirtualizedPatternList.tsx

import { FixedSizeList as List } from 'react-window'

interface VirtualizedPatternListProps {
  patterns: RecurringAssignment[]
  onEdit: (pattern: RecurringAssignment) => void
  onDelete: (patternId: string) => void
}

export const VirtualizedPatternList: React.FC<VirtualizedPatternListProps> = ({
  patterns,
  onEdit,
  onDelete,
}) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const pattern = patterns[index]
    return (
      <div style={style}>
        <PatternListItem pattern={pattern} onEdit={onEdit} onDelete={onDelete} />
      </div>
    )
  }

  return (
    <List
      height={600} // リストの高さ
      itemCount={patterns.length}
      itemSize={80} // 各アイテムの高さ
      width="100%"
    >
      {Row}
    </List>
  )
}
```

### 使用条件

```typescript
// RecurringPatternList.tsx で条件分岐

export const RecurringPatternList: React.FC<RecurringPatternListProps> = (props) => {
  const { patterns } = props

  // 100件以上の場合は仮想スクロールを使用
  if (patterns.length >= 100) {
    return <VirtualizedPatternList {...props} />
  }

  // 100件未満の場合は通常のリスト
  return <StandardPatternList {...props} />
}
```

## 4. Lazy Loading の実装

### React.lazy による遅延ロード

```typescript
// src/pages/MonthlyCalendarPage.tsx

import { lazy, Suspense } from 'react'

// モーダルコンポーネントを遅延ロード
const RecurringPatternModal = lazy(
  () => import('@/components/recurring-patterns/RecurringPatternModal')
)

export const MonthlyCalendarPage: React.FC = () => {
  // ... existing code

  return (
    <Container>
      {/* ... existing JSX */}

      {/* モーダルを Suspense でラップ */}
      <Suspense fallback={<div>読み込み中...</div>}>
        {isPatternModalOpen && (
          <RecurringPatternModal
            isOpen={isPatternModalOpen}
            pattern={editingPattern}
            onClose={handleClosePatternModal}
          />
        )}
      </Suspense>
    </Container>
  )
}
```

### Code Splitting の確認

```bash
# ビルド後のバンドルサイズを確認
npm run build

# vite-bundle-visualizer などを使用してバンドルを視覚化
npm install --save-dev rollup-plugin-visualizer
```

```typescript
// vite.config.ts

import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: true,
    }),
  ],
})
```

## 5. Lighthouse パフォーマンススコア確認

### テスト手順

1. **開発サーバーを起動**

```bash
npm run dev
```

2. **Chrome DevTools で Lighthouse を実行**

- Chrome DevTools を開く (F12)
- Lighthouse タブを選択
- Categories で "Performance" のみを選択
- "Analyze page load" をクリック

3. **目標スコア**

- Performance: 80以上
- First Contentful Paint (FCP): 1.8秒以下
- Largest Contentful Paint (LCP): 2.5秒以下
- Time to Interactive (TTI): 3.8秒以下
- Total Blocking Time (TBT): 200ms以下
- Cumulative Layout Shift (CLS): 0.1以下

### 改善項目チェックリスト

- [ ] 画像の最適化（WebP形式、適切なサイズ）
- [ ] 未使用のJavaScriptの削除
- [ ] Code Splitting の実装
- [ ] リソースの事前読み込み（Preload/Prefetch）
- [ ] CSSの最小化
- [ ] フォントの最適化（font-display: swap）

## 6. パフォーマンス測定ツール

### React DevTools Profiler

```typescript
// src/pages/MonthlyCalendarPage.tsx

import { Profiler } from 'react'

const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`)
}

export const MonthlyCalendarPage: React.FC = () => {
  return (
    <Profiler id="MonthlyCalendar" onRender={onRenderCallback}>
      {/* Component content */}
    </Profiler>
  )
}
```

### Web Vitals 測定

```bash
npm install web-vitals
```

```typescript
// src/main.tsx

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric: any) {
  console.log(metric)
  // 実際のプロダクションでは、アナリティクスサービスに送信
}

getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

## 7. 最適化チェックリスト

### React コンポーネント

- [ ] useMemo で高コストな計算をメモ化
- [ ] useCallback でイベントハンドラをメモ化
- [ ] React.memo で不要な再レンダリングを防止
- [ ] 仮想スクロールで長いリストを最適化

### データフェッチング

- [ ] React Query でキャッシングを最適化
- [ ] staleTime を適切に設定
- [ ] 不要な refetch を無効化

### バンドルサイズ

- [ ] Code Splitting を実装
- [ ] Lazy Loading でモーダルなどを遅延ロード
- [ ] Tree Shaking で未使用コードを削除

### パフォーマンス測定

- [ ] Lighthouse スコア 80以上
- [ ] React DevTools Profiler でボトルネック特定
- [ ] Web Vitals で Core Web Vitals を測定

## 8. 実行手順

```bash
# 1. 依存関係のインストール
npm install react-window web-vitals
npm install --save-dev @types/react-window rollup-plugin-visualizer

# 2. パフォーマンス測定
npm run dev
# Chrome DevTools で Lighthouse 実行

# 3. バンドルサイズの確認
npm run build
# dist/stats.html を確認

# 4. 最適化の適用
# - useMemo/useCallback の追加
# - Lazy Loading の実装
# - 仮想スクロールの実装（必要に応じて）

# 5. 再測定
# Lighthouse で改善を確認
```

## 9. 期待される改善効果

| 項目 | 最適化前 | 最適化後 | 改善率 |
|------|---------|---------|--------|
| Lighthouse Performance | 60-70 | 80+ | +15-25% |
| First Contentful Paint | 2.5s | 1.5s | -40% |
| Time to Interactive | 5.0s | 3.0s | -40% |
| Total Blocking Time | 400ms | 150ms | -62% |
| Bundle Size | 500KB | 350KB | -30% |

## 10. 継続的なモニタリング

- CI/CD パイプラインに Lighthouse CI を統合
- Web Vitals を継続的に測定
- バンドルサイズの監視（budget.json設定）

```json
// budget.json
{
  "budgets": [
    {
      "path": "dist/**/*.js",
      "limit": "400KB",
      "type": "initial"
    }
  ]
}
```
