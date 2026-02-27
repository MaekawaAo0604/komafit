/**
 * Monthly Calendar Page
 *
 * Date-based scheduling calendar showing teacher availability
 * and student assignments in a monthly view.
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Button } from '@/components/ui/Button'
import { StudentAssignModal } from '@/components/modals/StudentAssignModal'
import { RecurringPatternModal } from '@/components/recurring-patterns/RecurringPatternModal'
import { RecurringPatternList } from '@/components/recurring-patterns/RecurringPatternList'
import { getMonthlyCalendar, getMonthlyCalendarWithPatterns, getTimeSlots } from '@/services/calendar'
import { listTeachers } from '@/services/teachers'
import { listStudents } from '@/services/students'
import {
  setTeacherAvailability,
  batchSetWeekAvailability,
  copyWeekAvailability,
  clearWeekAvailability,
} from '@/services/teacherAvailabilityV2'
import { createException, deleteException } from '@/services/assignmentExceptions'
import { deleteRecurringAssignment } from '@/services/recurringAssignments'
import { useAppSelector } from '@/store/hooks'
import { selectUser, selectIsAdmin, selectRole } from '@/store/authSlice'
import type { MonthlyCalendarData, TimeSlot, Teacher, Student, RecurringAssignment, ExtendedMonthlyCalendarData } from '@/types/entities'
import { gradeToDisplay } from '@/utils/gradeHelper'

const PageContainer = styled.div`
  padding: 1.5rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 100%;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const PageHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-shrink: 0;

  @media (min-width: 1400px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
`

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  white-space: nowrap;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`

const HeaderControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 1400px) {
    width: auto;
    gap: 1rem;
  }
`

const BatchControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  width: 100%;

  @media (min-width: 1400px) {
    width: auto;
  }
`

const ModeToggle = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: 2px solid ${(props) => (props.$active ? '#3b82f6' : '#d1d5db')};
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${(props) => (props.$active ? '#ffffff' : '#374151')};
  background: ${(props) => (props.$active ? '#3b82f6' : '#ffffff')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.$active ? '#2563eb' : '#f3f4f6')};
  }
`

const TeacherSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const Select = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #374151;
  background: white;
  min-width: 180px;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const MonthSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (min-width: 768px) {
    gap: 1rem;
  }
`

const MonthDisplay = styled.span`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  min-width: 120px;
  text-align: center;

  @media (min-width: 768px) {
    font-size: 1.25rem;
    min-width: 150px;
  }
`

const CalendarContainer = styled.div`
  flex: 1;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  min-height: 400px;
  max-height: calc(100vh - 220px);

  @media (max-width: 768px) {
    max-height: calc(100vh - 180px);
  }
`

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: 100px repeat(auto-fill, minmax(140px, 1fr));
  min-width: fit-content;

  @media (min-width: 1024px) {
    grid-template-columns: 120px repeat(auto-fill, minmax(160px, 1fr));
  }
`

const HeaderCell = styled.div<{ $sticky?: boolean }>`
  padding: 0.75rem;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  border-bottom: 2px solid #d1d5db;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  text-align: center;
  position: ${(props) => (props.$sticky ? 'sticky' : 'static')};
  left: ${(props) => (props.$sticky ? '0' : 'auto')};
  z-index: ${(props) => (props.$sticky ? '10' : 'auto')};
`

const TimeSlotCell = styled.div`
  padding: 0.75rem;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  position: sticky;
  left: 0;
  z-index: 5;
`

const DataCell = styled.div<{
  $isAvailable?: boolean
  $hasAssignment?: boolean
  $dataSource?: 'pattern' | 'assignment' | 'exception' | null
}>`
  padding: 0.4rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  min-height: 70px;
  position: relative;
  background: ${(props) => {
    // dataSourceに基づく色分け
    if (props.$dataSource === 'pattern') return '#DBEAFE' // 青系：パターン由来
    if (props.$dataSource === 'assignment') return '#D1FAE5' // 緑系：個別アサイン
    if (props.$dataSource === 'exception') return '#F3F4F6' // グレー系：例外
    // 従来のロジック（後方互換性）
    if (props.$hasAssignment) return '#ffffff'
    if (props.$isAvailable === false) return '#e5e7eb' // グレー：来れない
    return '#ffffff' // デフォルト：空き枠（白）
  }};
  cursor: pointer;
  transition: background-color 0.2s;
  overflow: hidden;

  &:hover {
    background: ${(props) => {
      if (props.$dataSource === 'pattern') return '#BFDBFE' // 濃い青
      if (props.$dataSource === 'assignment') return '#A7F3D0' // 濃い緑
      if (props.$dataSource === 'exception') return '#E5E7EB' // 濃いグレー
      return props.$isAvailable === false ? '#d1d5db' : '#f3f4f6'
    }};
  }

  @media (min-width: 1024px) {
    padding: 0.5rem;
    min-height: 80px;
  }
`

const AssignmentInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
`

const StudentGrade = styled.span`
  font-weight: 600;
  color: #6b7280;
`

const StudentName = styled.span`
  font-weight: 600;
  color: #111827;
`

const Subject = styled.span`
  color: #3b82f6;
  font-weight: 500;
`

const SourceIcon = styled.div<{ $type: 'pattern' | 'assignment' }>`
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.625rem;
  font-weight: 700;
  background: ${(props) => (props.$type === 'pattern' ? '#3B82F6' : '#10B981')};
  color: white;
`

const PatternBadge = styled.div`
  position: absolute;
  top: 0.25rem;
  left: 0.25rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: #3B82F6;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1;
`

const CellTooltip = styled.div`
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #1F2937;
  color: white;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;

  ${DataCell}:hover & {
    opacity: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 0.25rem solid transparent;
    border-top-color: #1F2937;
  }
`

const ContextMenu = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  left: ${(props) => props.$x}px;
  top: ${(props) => props.$y}px;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 2000;
  min-width: 180px;
  padding: 0.5rem 0;
  border: 1px solid #e5e7eb;
`

const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 0.625rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: ${(props) => (props.$danger ? '#dc2626' : '#374151')};
  transition: background-color 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${(props) => (props.$danger ? '#fee2e2' : '#f3f4f6')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const ContextMenuDivider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 0.5rem 0;
`

const LoadingText = styled.p`
  text-align: center;
  color: #6b7280;
  padding: 2rem;
`

const ErrorText = styled.p`
  color: #ef4444;
  text-align: center;
  padding: 2rem;
`

export const MonthlyCalendarPage: React.FC = () => {
  const user = useAppSelector(selectUser)
  const isAdmin = useAppSelector(selectIsAdmin)
  const role = useAppSelector(selectRole)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [calendarData, setCalendarData] = useState<MonthlyCalendarData[] | ExtendedMonthlyCalendarData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignModalData, setAssignModalData] = useState<{
    date: string
    timeSlotId: string
  } | null>(null)
  const [fillMode, setFillMode] = useState(false) // 埋めるモード

  // パターン関連の状態
  const [showPatterns, setShowPatterns] = useState(true) // パターン表示ON/OFF
  const [showPatternModal, setShowPatternModal] = useState(false)
  const [showPatternList, setShowPatternList] = useState(false)
  const [editingPattern, setEditingPattern] = useState<RecurringAssignment | undefined>(undefined)

  // フィルタの状態
  const [dataSourceFilter, setDataSourceFilter] = useState<'all' | 'pattern' | 'assignment' | 'exception'>('all')

  // コンテキストメニューの状態
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    data: MonthlyCalendarData | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  })

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedTeacherId) {
      loadCalendarData()
    }
  }, [year, month, selectedTeacherId, showPatterns])

  // コンテキストメニューを閉じるためのクリックイベント
  useEffect(() => {
    const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }))
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu.visible])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [slots, teachersData, studentsData] = await Promise.all([
        getTimeSlots(),
        listTeachers(true),
        listStudents(true),
      ])
      setTimeSlots(slots)
      setTeachers(teachersData)
      setStudents(studentsData)

      // 講師ユーザーの場合は自分のIDを自動選択
      if (role === 'teacher' && user) {
        const myTeacher = teachersData.find((t) => t.userId === user.id)
        if (myTeacher) {
          setSelectedTeacherId(myTeacher.id)
        }
      } else if (teachersData.length > 0) {
        // 管理者の場合は最初の講師を選択
        setSelectedTeacherId(teachersData[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const loadCalendarData = async () => {
    if (!selectedTeacherId) return

    try {
      setLoading(true)
      setError(null)

      // パターン表示ON/OFFに応じてAPIを切り替え
      const data = showPatterns
        ? await getMonthlyCalendarWithPatterns(year, month, selectedTeacherId)
        : await getMonthlyCalendar(year, month)

      // パターン表示OFFの場合は、選択された講師のデータのみをフィルタリング
      const filteredData = showPatterns
        ? data // パターン表示ONの場合は既にフィルタ済み
        : data.filter(
            (item) => item.teacherId === selectedTeacherId || item.teacherId === null
          )

      setCalendarData(filteredData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleCellClick = async (date: string, timeSlotId: string) => {
    if (!selectedTeacherId) {
      console.error('No teacher selected')
      return
    }

    // 現在のセルデータを取得
    const currentData = calendarData.find(
      (d) => d.date === date && d.timeSlotId === timeSlotId
    )

    console.log('🔍 Cell clicked:', {
      date,
      timeSlotId,
      selectedTeacherId,
      currentData,
      fillMode,
    })

    // 埋めるモードの場合：空き枠を「来れない」に変更
    if (fillMode) {
      // 「来れない」(false) → 「空き枠」(true) に戻す
      // 「空き枠」(true) または 未設定(null/undefined) → 「来れない」(false) に変更
      const newIsAvailable = currentData?.isAvailable === false ? true : false

      // 楽観的UI更新：先にstateを更新してUIを即座に反映
      setCalendarData((prev) => {
        const updated = [...prev]
        const index = updated.findIndex(
          (d) => d.date === date && d.timeSlotId === timeSlotId && d.teacherId === selectedTeacherId
        )

        if (index >= 0) {
          // 既存レコードを更新
          updated[index] = { ...updated[index], isAvailable: newIsAvailable }
        } else {
          // 新規レコードを追加（未設定の場合）
          updated.push({
            date,
            timeSlotId,
            teacherId: selectedTeacherId,
            isAvailable: newIsAvailable,
            studentId: null,
            studentName: null,
            studentGrade: null,
            studentLessonLabel: null,
            subject: null,
          })
        }
        return updated
      })

      // 非同期でAPIを呼んで確定（エラー時はロールバック）
      setTeacherAvailability({
        teacherId: selectedTeacherId,
        date,
        timeSlotId,
        isAvailable: newIsAvailable,
      }).catch((err) => {
        console.error('❌ Failed to set availability:', err)
        alert(err instanceof Error ? err.message : '空き枠の設定に失敗しました')
        // ロールバック：失敗したら再読み込み
        loadCalendarData()
      })

      return
    }

    // 通常モード：生徒アサインモーダルを開く
    setAssignModalData({ date, timeSlotId })
    setShowAssignModal(true)
  }

  const handleSetAllAvailable = async () => {
    if (!selectedTeacherId) return

    if (
      !confirm(
        `${year}年${month}月の全てのコマを空き枠にします。よろしいですか？`
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const result = await batchSetWeekAvailability(
        selectedTeacherId,
        startDate,
        endDate,
        true
      )

      alert(
        `${result.successCount}件の空き枠を設定しました${result.errorCount > 0 ? `（エラー: ${result.errorCount}件）` : ''}`
      )
      await loadCalendarData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '空き枠の一括設定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToNextMonth = async () => {
    if (!selectedTeacherId) return

    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year

    if (
      !confirm(
        `${year}年${month}月のパターンを${nextYear}年${nextMonth}月にコピーします。よろしいですか？`
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const sourceStartDate = `${year}-${String(month).padStart(2, '0')}-01`
      const sourceEndDate = new Date(year, month, 0).toISOString().split('T')[0]
      const targetStartDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

      const result = await copyWeekAvailability(
        selectedTeacherId,
        sourceStartDate,
        sourceEndDate,
        targetStartDate
      )

      alert(
        `${result.successCount}件の空き枠をコピーしました${result.errorCount > 0 ? `（エラー: ${result.errorCount}件）` : ''}`
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '空き枠のコピーに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleClearAvailability = async () => {
    if (!selectedTeacherId) return

    if (
      !confirm(
        `${year}年${month}月の空き枠を全てクリアします。\n※アサイン済みのコマは削除されません。\nよろしいですか？`
      )
    ) {
      return
    }

    try {
      setLoading(true)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]

      const deletedCount = await clearWeekAvailability(
        selectedTeacherId,
        startDate,
        endDate
      )

      alert(`${deletedCount}件の空き枠を削除しました`)
      await loadCalendarData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '空き枠のクリアに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // パターン関連のハンドラー
  const handleNewPattern = () => {
    setEditingPattern(undefined)
    setShowPatternModal(true)
  }

  const handleEditPattern = (pattern: RecurringAssignment) => {
    setEditingPattern(pattern)
    setShowPatternModal(true)
  }

  const handleDeletePattern = (pattern: RecurringAssignment) => {
    // RecurringPatternList コンポーネント内で削除処理を行うため、ここでは何もしない
  }

  const handlePatternSuccess = () => {
    // パターン作成/更新成功時にカレンダーを再読み込み
    loadCalendarData()
  }

  // コンテキストメニューハンドラー
  const handleContextMenu = (
    e: React.MouseEvent,
    cellData: MonthlyCalendarData[]
  ) => {
    e.preventDefault()

    const assignmentData = cellData.find((d) => d.studentId !== null)
    if (!assignmentData) return // 授業データがない場合はメニューを表示しない

    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      data: assignmentData,
    })
  }

  // この日だけ休みにする
  const handleMarkAsCancelled = async () => {
    const data = contextMenu.data
    if (!data || !data.patternId) return

    if (!confirm('この日だけ休みにしますか？\n\nパターン自体は保持され、他の日には影響しません。')) {
      return
    }

    try {
      await createException(data.patternId, data.date, 'cancelled')
      alert('この日を休みに設定しました')
      loadCalendarData()
    } catch (error) {
      alert(error instanceof Error ? error.message : '例外処理の作成に失敗しました')
    } finally {
      setContextMenu((prev) => ({ ...prev, visible: false }))
    }
  }

  // 例外を元に戻す
  const handleRestoreException = async () => {
    const data = contextMenu.data
    if (!data || data.dataSource !== 'exception') return

    // 例外IDを取得する必要があるが、現在のデータには含まれていない
    // RPC関数の戻り値を拡張する必要がある
    // 仮実装：日付とpatternIdから例外を検索して削除
    if (!confirm('例外処理を元に戻しますか？\n\nパターンに基づいた授業に戻ります。')) {
      return
    }

    try {
      // 注：実際には exception_id が必要
      // ここでは簡易実装として、再度カレンダーを読み込むことで対応
      alert('例外の削除機能は未実装です。\nRPC関数にexception_idを含める必要があります。')
      setContextMenu((prev) => ({ ...prev, visible: false }))
    } catch (error) {
      alert(error instanceof Error ? error.message : '例外処理の削除に失敗しました')
    }
  }

  // パターンを編集
  const handleEditPatternFromMenu = async () => {
    const data = contextMenu.data
    if (!data || !data.patternId) return

    // パターンIDから完全なパターンデータを取得する必要がある
    // 簡易実装：パターン一覧からIDで検索
    // より良い実装：RPC関数でパターンデータも返すようにする
    setContextMenu((prev) => ({ ...prev, visible: false }))
    alert('パターン編集機能は未実装です。\n「パターン管理」から編集してください。')
  }

  // パターンを削除
  const handleDeletePatternFromMenu = async () => {
    const data = contextMenu.data
    if (!data || !data.patternId) return

    if (!confirm('このパターンを削除しますか？\n\n全ての曜日からこのパターンが削除されます。\n個別の例外処理は保持されます。')) {
      return
    }

    try {
      await deleteRecurringAssignment(data.patternId)
      alert('パターンを削除しました')
      loadCalendarData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'パターンの削除に失敗しました')
    } finally {
      setContextMenu((prev) => ({ ...prev, visible: false }))
    }
  }

  // Get days in month
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // フィルタリングされたカレンダーデータ
  const filteredCalendarData = calendarData.filter((item) => {
    if (dataSourceFilter === 'all') return true
    return item.dataSource === dataSourceFilter
  })

  // Group calendar data by date and time slot
  const dataByDateAndSlot = new Map<string, MonthlyCalendarData[]>()
  filteredCalendarData.forEach((item) => {
    const key = `${item.date}_${item.timeSlotId}`
    if (!dataByDateAndSlot.has(key)) {
      dataByDateAndSlot.set(key, [])
    }
    dataByDateAndSlot.get(key)!.push(item)
  })

  if (loading && calendarData.length === 0) {
    return (
      <PageContainer>
        <LoadingText>読み込み中...</LoadingText>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorText>{error}</ErrorText>
        <div style={{ textAlign: 'center' }}>
          <Button onClick={loadCalendarData}>再読み込み</Button>
        </div>
      </PageContainer>
    )
  }

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId)

  return (
    <PageContainer>
      <PageHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Title>月次カレンダー</Title>
          <MonthSelector>
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              ◀
            </Button>
            <MonthDisplay>
              {year}年 {month}月
            </MonthDisplay>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              ▶
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              今月
            </Button>
          </MonthSelector>
        </div>

        <HeaderControls>
          {/* 講師選択 */}
          {isAdmin && (
            <TeacherSelector>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                講師:
              </label>
              <Select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </Select>
            </TeacherSelector>
          )}
          {!isAdmin && selectedTeacher && (
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', padding: '0.5rem' }}>
              講師: {selectedTeacher.name}
            </div>
          )}

          {/* パターン管理ボタン */}
          <Button variant="outline" size="sm" onClick={() => setShowPatternList(true)}>
            📋 パターン管理
          </Button>

          {/* 新規パターンボタン */}
          <Button variant="primary" size="sm" onClick={handleNewPattern}>
            ➕ 新規パターン
          </Button>

          {/* パターン表示切り替えトグル */}
          <ModeToggle
            $active={showPatterns}
            onClick={() => setShowPatterns(!showPatterns)}
            title={showPatterns ? 'パターン表示ON' : 'パターン表示OFF'}
          >
            {showPatterns ? '🔵 パターンON' : '⚪️ パターンOFF'}
          </ModeToggle>

          {/* データソースフィルタ */}
          {showPatterns && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                表示:
              </label>
              <Select
                value={dataSourceFilter}
                onChange={(e) => setDataSourceFilter(e.target.value as typeof dataSourceFilter)}
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="all">全て表示</option>
                <option value="pattern">定期パターンのみ</option>
                <option value="assignment">個別アサインのみ</option>
                <option value="exception">例外処理のみ</option>
              </Select>
            </div>
          )}

          {/* 一括操作コントロール */}
          {selectedTeacherId && (
            <BatchControls>
              <ModeToggle
                $active={fillMode}
                onClick={() => setFillMode(!fillMode)}
                title={fillMode ? '埋めるモードON：クリックで空き枠を「来れない」に変更' : '通常モード：クリックで生徒をアサイン'}
              >
                {fillMode ? '🔴 埋める' : '✏️ アサイン'}
              </ModeToggle>
              <div style={{ width: '1px', height: '24px', background: '#d1d5db' }} />
              <Button variant="outline" size="sm" onClick={handleSetAllAvailable}>
                全開放
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopyToNextMonth}>
                翌月コピー
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAvailability}>
                クリア
              </Button>
            </BatchControls>
          )}
        </HeaderControls>
      </PageHeader>

      <CalendarContainer>
        <CalendarGrid style={{ gridTemplateColumns: `120px repeat(${daysInMonth}, 180px)` }}>
          {/* Header row */}
          <HeaderCell $sticky>コマ / 日付</HeaderCell>
          {days.map((day) => (
            <HeaderCell key={day}>{day}日</HeaderCell>
          ))}

          {/* Data rows */}
          {timeSlots.map((slot) => (
            <React.Fragment key={slot.id}>
              <TimeSlotCell>
                {slot.id}
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  {slot.startTime.substring(0, 5)}〜
                </div>
              </TimeSlotCell>
              {days.map((day) => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const key = `${dateStr}_${slot.id}`
                const cellData = dataByDateAndSlot.get(key) || []

                // Check if any teacher is available or has assignments
                const hasAvailability = cellData.some((d) => d.isAvailable !== null)
                const hasAssignment = cellData.some((d) => d.studentId !== null)
                const isAvailable = cellData.some((d) => d.isAvailable === true)

                // パターンデータを取得
                const assignmentData = cellData.find((d) => d.studentId !== null)
                const dataSource = assignmentData?.dataSource || null
                const patternId = assignmentData?.patternId || null
                const exceptionType = assignmentData?.exceptionType || null

                // ツールチップ用のデータソース表示名
                const dataSourceLabel =
                  dataSource === 'pattern'
                    ? '定期パターン'
                    : dataSource === 'assignment'
                      ? '個別アサイン'
                      : dataSource === 'exception'
                        ? '例外'
                        : null

                return (
                  <DataCell
                    key={key}
                    $isAvailable={hasAvailability ? isAvailable : undefined}
                    $hasAssignment={hasAssignment}
                    $dataSource={dataSource}
                    onClick={() => handleCellClick(dateStr, slot.id)}
                    onContextMenu={(e) => handleContextMenu(e, cellData)}
                  >
                    {/* パターン由来の場合はバッジを表示 */}
                    {dataSource === 'pattern' && <PatternBadge>定期</PatternBadge>}

                    {/* アイコン表示 */}
                    {dataSource && (dataSource === 'pattern' || dataSource === 'assignment') && (
                      <SourceIcon $type={dataSource}>
                        {dataSource === 'pattern' ? 'P' : 'I'}
                      </SourceIcon>
                    )}

                    {/* 授業情報 */}
                    {cellData
                      .filter((d) => d.studentId !== null)
                      .map((assignment, idx) => (
                        <AssignmentInfo key={idx}>
                          <StudentGrade>
                            {assignment.studentGrade ? gradeToDisplay(assignment.studentGrade) : ''}
                            {assignment.studentLessonLabel && ` ${assignment.studentLessonLabel}`}
                          </StudentGrade>
                          <StudentName>{assignment.studentName}</StudentName>
                          <Subject>{assignment.subject}</Subject>
                        </AssignmentInfo>
                      ))}

                    {/* ツールチップ（ホバー時に表示） */}
                    {hasAssignment && dataSourceLabel && (
                      <CellTooltip>
                        <div>授業タイプ: {dataSourceLabel}</div>
                        {patternId && <div>パターンID: {patternId.slice(0, 8)}...</div>}
                        {exceptionType && <div>例外: {exceptionType === 'cancelled' ? '休み' : '振替'}</div>}
                      </CellTooltip>
                    )}
                  </DataCell>
                )
              })}
            </React.Fragment>
          ))}
        </CalendarGrid>
      </CalendarContainer>

      {/* Student Assign Modal */}
      {showAssignModal && assignModalData && selectedTeacherId && (
        <StudentAssignModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            setAssignModalData(null)
          }}
          date={assignModalData.date}
          timeSlotId={assignModalData.timeSlotId}
          teacherId={selectedTeacherId}
          onSuccess={() => {
            loadCalendarData()
          }}
        />
      )}

      {/* Recurring Pattern Modal */}
      {showPatternModal && (
        <RecurringPatternModal
          isOpen={showPatternModal}
          pattern={editingPattern}
          teacherId={role === 'teacher' ? selectedTeacherId : undefined}
          teachers={teachers}
          students={students}
          timeSlots={timeSlots}
          onClose={() => {
            setShowPatternModal(false)
            setEditingPattern(undefined)
          }}
          onSuccess={handlePatternSuccess}
        />
      )}

      {/* Recurring Pattern List Modal */}
      {showPatternList && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setShowPatternList(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '0.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '1200px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                }}
              >
                定期授業パターン一覧
              </h2>
              <button
                onClick={() => setShowPatternList(false)}
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: '#6b7280',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflow: 'auto', flex: 1 }}>
              <RecurringPatternList
                teacherId={role === 'teacher' ? selectedTeacherId : undefined}
                onEdit={handleEditPattern}
                onDelete={handleDeletePattern}
              />
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.data && (
        <ContextMenu
          $x={contextMenu.x}
          $y={contextMenu.y}
          onClick={(e) => e.stopPropagation()}
        >
          {/* パターン由来のセル */}
          {contextMenu.data.dataSource === 'pattern' && (
            <>
              <ContextMenuItem onClick={handleMarkAsCancelled}>
                🚫 この日だけ休み
              </ContextMenuItem>
              <ContextMenuItem onClick={handleEditPatternFromMenu}>
                ✏️ パターンを編集
              </ContextMenuItem>
              <ContextMenuDivider />
              <ContextMenuItem $danger onClick={handleDeletePatternFromMenu}>
                🗑️ パターンを削除
              </ContextMenuItem>
            </>
          )}

          {/* 例外処理のセル */}
          {contextMenu.data.dataSource === 'exception' && (
            <>
              <ContextMenuItem onClick={handleRestoreException}>
                ↩️ 元に戻す
              </ContextMenuItem>
            </>
          )}

          {/* 個別アサインのセル */}
          {contextMenu.data.dataSource === 'assignment' && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setContextMenu((prev) => ({ ...prev, visible: false }))
                  handleCellClick(contextMenu.data!.date, contextMenu.data!.timeSlotId)
                }}
              >
                ✏️ 授業を編集
              </ContextMenuItem>
            </>
          )}

          {/* 全てのセルに表示 */}
          {contextMenu.data.studentId && (
            <>
              <ContextMenuDivider />
              <ContextMenuItem
                onClick={() => {
                  alert(
                    `授業詳細:\n\n` +
                      `日付: ${contextMenu.data?.date}\n` +
                      `時間帯: ${contextMenu.data?.timeSlotId}\n` +
                      `生徒: ${contextMenu.data?.studentName}\n` +
                      `科目: ${contextMenu.data?.subject}\n` +
                      `授業タイプ: ${contextMenu.data?.dataSource === 'pattern' ? '定期パターン' : contextMenu.data?.dataSource === 'assignment' ? '個別アサイン' : '例外'}\n` +
                      (contextMenu.data?.patternId
                        ? `\nパターンID: ${contextMenu.data.patternId}`
                        : '')
                  )
                  setContextMenu((prev) => ({ ...prev, visible: false }))
                }}
              >
                ℹ️ 詳細を表示
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      )}
    </PageContainer>
  )
}
