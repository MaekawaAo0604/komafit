/**
 * Recurring Pattern List Component
 *
 * Displays a list of recurring assignment patterns with sorting, filtering, and actions.
 */

import { useState, useMemo, useEffect } from 'react'
import styled from 'styled-components'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  listRecurringAssignments,
  deleteRecurringAssignment,
  updateRecurringAssignment,
} from '@/services/recurringAssignments'
import type { RecurringAssignment } from '@/types/entities'

// ============================================================================
// Types
// ============================================================================

interface RecurringPatternListProps {
  teacherId?: string
  onEdit: (pattern: RecurringAssignment) => void
  onDelete: (pattern: RecurringAssignment) => void
}

type SortKey = 'dayOfWeek' | 'timeSlotId' | 'teacherName' | 'studentName'
type SortDirection = 'asc' | 'desc'

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Toolbar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  align-items: center;
  justify-content: space-between;
`

const BulkActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  align-items: center;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 150px;
`

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6b7280;
`

const ErrorContainer = styled.div`
  padding: 1.5rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  color: #991b1b;
  font-size: 0.875rem;
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`

const TableHead = styled.thead`
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
`

const TableRow = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }

  &:hover {
    background: #f9fafb;
  }
`

const TableHeader = styled.th<{ $sortable?: boolean }>`
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: ${(props) => (props.$sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    background: ${(props) => (props.$sortable ? '#f3f4f6' : 'transparent')};
  }
`

const SortIcon = styled.span<{ $direction?: SortDirection }>`
  display: inline-block;
  margin-left: 0.25rem;
  opacity: ${(props) => (props.$direction ? 1 : 0.3)};
  transform: ${(props) => (props.$direction === 'desc' ? 'rotate(180deg)' : 'none')};
  transition: all 0.2s;
`

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
  cursor: pointer;
`

const ConfirmDialog = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`

const DialogBox = styled.div`
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 500px;
  width: 100%;
  padding: 1.5rem;
`

const DialogTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
`

const DialogMessage = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
`

const DialogActions = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`

const TableCell = styled.td`
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: #374151;
`

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(props) => (props.$active ? '#d1fae5' : '#fee2e2')};
  color: ${(props) => (props.$active ? '#065f46' : '#991b1b')};
`

const ActionButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  &:active {
    background: #f3f4f6;
  }
`

const ActionButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 0.875rem;
`

const Spinner = styled.div`
  width: 2rem;
  height: 2rem;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`

// ============================================================================
// Utility Functions
// ============================================================================

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

const formatDateRange = (startDate: string, endDate: string | null): string => {
  if (endDate) {
    return `${startDate} 〜 ${endDate}`
  }
  return `${startDate} 〜 無期限`
}

// ============================================================================
// Component
// ============================================================================

export function RecurringPatternList({
  teacherId,
  onEdit,
  onDelete,
}: RecurringPatternListProps) {
  // フィルタとソートの状態管理
  const [searchText, setSearchText] = useState('')
  const [filterDay, setFilterDay] = useState<number | 'all'>('all')
  const [filterTimeSlot, setFilterTimeSlot] = useState<string>('all')
  const [filterActive, setFilterActive] = useState<boolean | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('dayOfWeek')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // 一括選択の状態管理
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 確認ダイアログの状態管理
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  // データ取得の状態管理
  const [patterns, setPatterns] = useState<RecurringAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // データ取得関数
  const fetchPatterns = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await listRecurringAssignments(teacherId, true)
      setPatterns(data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  // 初回マウント時とteacherIdが変更された時にデータ取得
  useEffect(() => {
    fetchPatterns()
  }, [teacherId])

  // ソートハンドラー
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // 同じカラムをクリックした場合は方向を反転
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 異なるカラムをクリックした場合は新しいキーで昇順
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // フィルタとソートを適用したデータ
  const filteredAndSortedPatterns = useMemo(() => {
    if (!patterns) return []

    let result = [...patterns]

    // 検索フィルタ（生徒名、講師名）
    if (searchText) {
      const searchLower = searchText.toLowerCase()
      result = result.filter(
        (pattern) =>
          pattern.student?.name.toLowerCase().includes(searchLower) ||
          pattern.teacher?.name.toLowerCase().includes(searchLower)
      )
    }

    // 曜日フィルタ
    if (filterDay !== 'all') {
      result = result.filter((pattern) => pattern.dayOfWeek === filterDay)
    }

    // 時間帯フィルタ
    if (filterTimeSlot !== 'all') {
      result = result.filter((pattern) => pattern.timeSlotId === filterTimeSlot)
    }

    // 状態フィルタ
    if (filterActive !== 'all') {
      result = result.filter((pattern) => pattern.active === filterActive)
    }

    // ソート
    result.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'dayOfWeek':
          comparison = a.dayOfWeek - b.dayOfWeek
          break
        case 'timeSlotId':
          comparison = a.timeSlotId.localeCompare(b.timeSlotId)
          break
        case 'teacherName':
          comparison = (a.teacher?.name || '').localeCompare(b.teacher?.name || '')
          break
        case 'studentName':
          comparison = (a.student?.name || '').localeCompare(b.student?.name || '')
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [patterns, searchText, filterDay, filterTimeSlot, filterActive, sortKey, sortDirection])

  // 利用可能な時間帯の一覧を取得
  const availableTimeSlots = useMemo(() => {
    if (!patterns) return []
    const slots = new Set(patterns.map((p) => p.timeSlotId))
    return Array.from(slots).sort()
  }, [patterns])

  // 全選択 / 全解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSortedPatterns.map((p) => p.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // 個別選択
  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  // 削除処理（単一）
  const handleDeleteOne = (pattern: RecurringAssignment) => {
    setConfirmDialog({
      isOpen: true,
      title: 'パターン削除の確認',
      message: `このパターンを削除しますか？\n\n曜日: ${DAY_NAMES[pattern.dayOfWeek]}\n時間帯: ${pattern.timeSlotId}\n生徒: ${pattern.student?.name || '-'}\n\n個別の例外処理は保持されます。`,
      onConfirm: async () => {
        try {
          await deleteRecurringAssignment(pattern.id)
          fetchPatterns()
          onDelete(pattern)
          setConfirmDialog(null)
        } catch (error) {
          console.error('Delete error:', error)
          alert(error instanceof Error ? error.message : '削除に失敗しました')
        }
      },
    })
  }

  // 一括削除
  const handleBulkDelete = () => {
    const count = selectedIds.size
    if (count === 0) return

    setConfirmDialog({
      isOpen: true,
      title: '一括削除の確認',
      message: `選択された ${count} 件のパターンを削除しますか？\n\n個別の例外処理は保持されます。`,
      onConfirm: async () => {
        try {
          await Promise.all(Array.from(selectedIds).map((id) => deleteRecurringAssignment(id)))
          fetchPatterns()
          setSelectedIds(new Set())
          setConfirmDialog(null)
        } catch (error) {
          console.error('Bulk delete error:', error)
          alert(error instanceof Error ? error.message : '一括削除に失敗しました')
        }
      },
    })
  }

  // 一括無効化
  const handleBulkDeactivate = async () => {
    const count = selectedIds.size
    if (count === 0) return

    setConfirmDialog({
      isOpen: true,
      title: '一括無効化の確認',
      message: `選択された ${count} 件のパターンを無効化しますか？`,
      onConfirm: async () => {
        try {
          await Promise.all(
            Array.from(selectedIds).map((id) => updateRecurringAssignment(id, { active: false }))
          )
          fetchPatterns()
          setSelectedIds(new Set())
          setConfirmDialog(null)
        } catch (error) {
          console.error('Bulk deactivate error:', error)
          alert(error instanceof Error ? error.message : '一括無効化に失敗しました')
        }
      },
    })
  }

  // 全選択されているか確認
  const isAllSelected =
    filteredAndSortedPatterns.length > 0 &&
    filteredAndSortedPatterns.every((p) => selectedIds.has(p.id))

  // ローディング状態
  if (isLoading) {
    return (
      <LoadingContainer>
        <Spinner />
      </LoadingContainer>
    )
  }

  // エラー状態
  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : '予期しないエラーが発生しました'
    return <ErrorContainer>{errorMessage}</ErrorContainer>
  }

  // データが空の場合
  if (!patterns || patterns.length === 0) {
    return (
      <EmptyState>
        登録されている定期授業パターンがありません。
        <br />
        「新規パターン」ボタンから登録してください。
      </EmptyState>
    )
  }

  return (
    <Container>
      {/* 一括操作ツールバー */}
      {selectedIds.size > 0 && (
        <Toolbar>
          <div>
            <strong>{selectedIds.size}</strong> 件選択中
          </div>
          <BulkActions>
            <Button variant="secondary" onClick={handleBulkDeactivate}>
              一括無効化
            </Button>
            <Button variant="secondary" onClick={handleBulkDelete}>
              一括削除
            </Button>
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              選択解除
            </Button>
          </BulkActions>
        </Toolbar>
      )}

      {/* フィルタバー */}
      <FilterBar>
        <FilterGroup>
          <FilterLabel>検索</FilterLabel>
          <Input
            type="text"
            placeholder="生徒名・講師名で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </FilterGroup>

        <FilterGroup style={{ flex: '0 0 150px' }}>
          <FilterLabel>曜日</FilterLabel>
          <Select
            value={filterDay}
            onChange={(e) =>
              setFilterDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
            }
          >
            <option value="all">全て</option>
            {DAY_NAMES.map((day, index) => (
              <option key={index} value={index}>
                {day}曜日
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup style={{ flex: '0 0 150px' }}>
          <FilterLabel>時間帯</FilterLabel>
          <Select value={filterTimeSlot} onChange={(e) => setFilterTimeSlot(e.target.value)}>
            <option value="all">全て</option>
            {availableTimeSlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup style={{ flex: '0 0 120px' }}>
          <FilterLabel>状態</FilterLabel>
          <Select
            value={filterActive === 'all' ? 'all' : filterActive ? 'active' : 'inactive'}
            onChange={(e) =>
              setFilterActive(
                e.target.value === 'all'
                  ? 'all'
                  : e.target.value === 'active'
                    ? true
                    : false
              )
            }
          >
            <option value="all">全て</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      {/* テーブル */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader style={{ width: '40px' }}>
              <Checkbox
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </TableHeader>
            <TableHeader $sortable onClick={() => handleSort('dayOfWeek')}>
              曜日
              <SortIcon $direction={sortKey === 'dayOfWeek' ? sortDirection : undefined}>
                ▲
              </SortIcon>
            </TableHeader>
            <TableHeader $sortable onClick={() => handleSort('timeSlotId')}>
              時間帯
              <SortIcon $direction={sortKey === 'timeSlotId' ? sortDirection : undefined}>
                ▲
              </SortIcon>
            </TableHeader>
            <TableHeader $sortable onClick={() => handleSort('teacherName')}>
              講師
              <SortIcon $direction={sortKey === 'teacherName' ? sortDirection : undefined}>
                ▲
              </SortIcon>
            </TableHeader>
            <TableHeader $sortable onClick={() => handleSort('studentName')}>
              生徒
              <SortIcon $direction={sortKey === 'studentName' ? sortDirection : undefined}>
                ▲
              </SortIcon>
            </TableHeader>
            <TableHeader>科目</TableHeader>
            <TableHeader>有効期間</TableHeader>
            <TableHeader>状態</TableHeader>
            <TableHeader>アクション</TableHeader>
          </TableRow>
        </TableHead>
        <tbody>
          {filteredAndSortedPatterns.map((pattern) => (
            <TableRow key={pattern.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(pattern.id)}
                  onChange={(e) => handleSelectOne(pattern.id, e.target.checked)}
                />
              </TableCell>
              <TableCell>{DAY_NAMES[pattern.dayOfWeek]}</TableCell>
              <TableCell>{pattern.timeSlot?.id || pattern.timeSlotId}</TableCell>
              <TableCell>{pattern.teacher?.name || '-'}</TableCell>
              <TableCell>{pattern.student?.name || '-'}</TableCell>
              <TableCell>{pattern.subject}</TableCell>
              <TableCell>
                {formatDateRange(pattern.startDate, pattern.endDate)}
              </TableCell>
              <TableCell>
                <StatusBadge $active={pattern.active}>
                  {pattern.active ? '有効' : '無効'}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <ActionButtonGroup>
                  <ActionButton onClick={() => onEdit(pattern)}>編集</ActionButton>
                  <ActionButton onClick={() => handleDeleteOne(pattern)}>削除</ActionButton>
                </ActionButtonGroup>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      {/* 確認ダイアログ */}
      {confirmDialog?.isOpen && (
        <ConfirmDialog onClick={() => setConfirmDialog(null)}>
          <DialogBox onClick={(e) => e.stopPropagation()}>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogMessage style={{ whiteSpace: 'pre-line' }}>
              {confirmDialog.message}
            </DialogMessage>
            <DialogActions>
              <Button variant="secondary" onClick={() => setConfirmDialog(null)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={confirmDialog.onConfirm}>
                確認
              </Button>
            </DialogActions>
          </DialogBox>
        </ConfirmDialog>
      )}
    </Container>
  )
}
