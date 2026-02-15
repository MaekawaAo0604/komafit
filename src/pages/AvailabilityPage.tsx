/**
 * AvailabilityPage Component
 *
 * 講師の空き枠管理ページ
 * - 週次カレンダー表示（MON-SUN × コマ0,1,A,B,C）
 * - 空き枠のON/OFFトグル機能
 * - 一括設定機能（全空き/全埋め/翌月コピー/クリア）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { useAppSelector } from '@/store/hooks'
import { selectUser, selectIsAdmin } from '@/store/authSlice'
import {
  getTeacherAvailability,
  setTeacherAvailability,
  batchSetWeekAvailability,
  copyWeekAvailability,
  clearWeekAvailability,
} from '@/services/teacherAvailabilityV2'
import { listTeachers } from '@/services/teachers'
import { Button } from '@/components/ui/Button'
import type { Teacher } from '@/types'

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const Controls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`

const TeacherSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  background: white;
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    ring: 2px solid #dbeafe;
  }
`

const MonthNav = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`

const MonthLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  min-width: 120px;
  text-align: center;
`

const BatchActions = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
`

const CalendarContainer = styled.div`
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: 120px repeat(7, 1fr);
  border-collapse: collapse;
`

const HeaderCell = styled.div`
  padding: 1rem;
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
  text-align: center;
  font-size: 0.875rem;

  &:first-child {
    background: #f3f4f6;
  }
`

const TimeCell = styled.div`
  padding: 1rem;
  background: #f3f4f6;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #6b7280;
  text-align: center;
  font-size: 0.875rem;
`

const AvailabilityCell = styled.div<{ $isAvailable: boolean; $isClickable: boolean }>`
  padding: 1.5rem;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  background: ${(props) => (props.$isAvailable ? '#dcfce7' : '#fee2e2')};
  cursor: ${(props) => (props.$isClickable ? 'pointer' : 'default')};
  transition: all 150ms ease;
  text-align: center;
  font-size: 0.75rem;
  color: ${(props) => (props.$isAvailable ? '#166534' : '#991b1b')};
  font-weight: 500;

  &:hover {
    ${(props) =>
      props.$isClickable &&
      `
      background: ${props.$isAvailable ? '#bbf7d0' : '#fecaca'};
      transform: scale(1.05);
    `}
  }
`

const LoadingMessage = styled.div`
  padding: 3rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
`

const ErrorMessage = styled.div`
  padding: 1rem;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const
const KOMA_CODES = ['0', '1', 'A', 'B', 'C'] as const

interface AvailabilityData {
  [date: string]: {
    [komaCode: string]: boolean
  }
}

export const AvailabilityPage: React.FC = () => {
  const user = useAppSelector(selectUser)
  const isAdmin = useAppSelector(selectIsAdmin)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 教師一覧取得
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const data = await listTeachers(true) // activeOnly = true
        setTeachers(data)

        // デフォルト選択
        if (isAdmin && data.length > 0) {
          setSelectedTeacherId(data.find((t) => t.active)?.id || '')
        } else if (user) {
          // 講師ユーザーの場合、自分のIDをセット（user.idがteacher.idと紐づいていると仮定）
          setSelectedTeacherId(user.id)
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err)
        setError('講師一覧の取得に失敗しました')
      }
    }

    fetchTeachers()
  }, [isAdmin, user])

  // 空き枠データ取得
  useEffect(() => {
    if (!selectedTeacherId) return

    const fetchAvailability = async () => {
      setLoading(true)
      setError(null)

      try {
        // 月の最初の月曜日から最後の日曜日までのデータを取得
        const year = currentMonth.getFullYear()
        const month = currentMonth.getMonth()

        // 月の最初の日
        const firstDayOfMonth = new Date(year, month, 1)
        // 月の最初の月曜日を探す
        const firstMonday = new Date(firstDayOfMonth)
        const dayOfWeek = firstMonday.getDay()
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        firstMonday.setDate(firstMonday.getDate() + daysToMonday)

        // 月の最後の日
        const lastDayOfMonth = new Date(year, month + 1, 0)
        // 月の最後の日曜日を探す
        const lastSunday = new Date(lastDayOfMonth)
        const lastDayOfWeek = lastSunday.getDay()
        const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek
        lastSunday.setDate(lastSunday.getDate() + daysToSunday)

        const startDate = firstMonday.toISOString().split('T')[0]
        const endDate = lastSunday.toISOString().split('T')[0]

        const data = await getTeacherAvailability(selectedTeacherId, startDate, endDate)

        // データを整形
        const formatted: AvailabilityData = {}
        data.forEach((item) => {
          if (!formatted[item.date]) {
            formatted[item.date] = {}
          }
          formatted[item.date][item.koma_code] = item.is_available
        })

        setAvailabilityData(formatted)
      } catch (err) {
        console.error('Failed to fetch availability:', err)
        setError('空き枠データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [selectedTeacherId, currentMonth])

  // 月の週ごとの日付を計算
  const getWeeksInMonth = (): Date[][] => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // 月の最初の月曜日を探す
    const firstMonday = new Date(firstDayOfMonth)
    const dayOfWeek = firstMonday.getDay()
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    firstMonday.setDate(firstMonday.getDate() + daysToMonday)

    // 月の最後の日曜日を探す
    const lastSunday = new Date(lastDayOfMonth)
    const lastDayOfWeek = lastSunday.getDay()
    const daysToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek
    lastSunday.setDate(lastSunday.getDate() + daysToSunday)

    // 週ごとに分割
    const weeks: Date[][] = []
    let currentDate = new Date(firstMonday)

    while (currentDate <= lastSunday) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate))
        currentDate.setDate(currentDate.getDate() + 1)
      }
      weeks.push(week)
    }

    return weeks
  }

  const weeks = getWeeksInMonth()

  // セル切り替え
  const handleCellClick = async (date: Date, komaCode: string) => {
    if (!selectedTeacherId) return

    const dateStr = date.toISOString().split('T')[0]
    const currentValue = availabilityData[dateStr]?.[komaCode] ?? true

    try {
      await setTeacherAvailability({
        teacher_id: selectedTeacherId,
        date: dateStr,
        koma_code: komaCode,
        is_available: !currentValue,
      })

      // ローカル状態を更新
      setAvailabilityData((prev) => ({
        ...prev,
        [dateStr]: {
          ...prev[dateStr],
          [komaCode]: !currentValue,
        },
      }))
    } catch (err) {
      console.error('Failed to update availability:', err)
      setError('空き枠の更新に失敗しました')
    }
  }

  // 一括設定
  const handleBatchSetAvailability = async (isAvailable: boolean) => {
    if (!selectedTeacherId) return

    setLoading(true)
    setError(null)

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      await batchSetWeekAvailability(selectedTeacherId, startDate, endDate, isAvailable)

      // データ再取得
      const data = await getTeacherAvailability(selectedTeacherId, startDate, endDate)
      const formatted: AvailabilityData = {}
      data.forEach((item) => {
        if (!formatted[item.date]) {
          formatted[item.date] = {}
        }
        formatted[item.date][item.koma_code] = item.is_available
      })
      setAvailabilityData(formatted)
    } catch (err) {
      console.error('Failed to batch update availability:', err)
      setError('一括設定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // クリア
  const handleClear = async () => {
    if (!selectedTeacherId) return
    if (!confirm('この月の空き枠をすべてクリアしますか？')) return

    setLoading(true)
    setError(null)

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      await clearWeekAvailability(selectedTeacherId, startDate, endDate)

      setAvailabilityData({})
    } catch (err) {
      console.error('Failed to clear availability:', err)
      setError('クリアに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 翌月コピー
  const handleCopyToNextMonth = async () => {
    if (!selectedTeacherId) return
    if (!confirm('この月の空き枠パターンを翌月にコピーしますか？')) return

    setLoading(true)
    setError(null)

    try {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()

      const sourceStartDate = new Date(year, month, 1).toISOString().split('T')[0]
      const sourceEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const targetStartDate = new Date(year, month + 1, 1).toISOString().split('T')[0]

      await copyWeekAvailability(
        selectedTeacherId,
        sourceStartDate,
        sourceEndDate,
        targetStartDate
      )

      alert('翌月へコピーしました')
    } catch (err) {
      console.error('Failed to copy availability:', err)
      setError('翌月コピーに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 月移動
  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  return (
    <PageContainer>
      <PageHeader>
        <Title>空き枠管理</Title>

        <Controls>
          {isAdmin && (
            <TeacherSelect
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">講師を選択</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </TeacherSelect>
          )}

          <MonthNav>
            <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Button>

            <MonthLabel>
              {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
            </MonthLabel>

            <Button variant="ghost" size="sm" onClick={handleNextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Button>
          </MonthNav>
        </Controls>
      </PageHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <BatchActions>
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleBatchSetAvailability(true)}
          disabled={loading || !selectedTeacherId}
        >
          全開放
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleBatchSetAvailability(false)}
          disabled={loading || !selectedTeacherId}
        >
          全埋め
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopyToNextMonth}
          disabled={loading || !selectedTeacherId}
        >
          翌月コピー
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={loading || !selectedTeacherId}
        >
          クリア
        </Button>
      </BatchActions>

      <CalendarContainer>
        {loading && <LoadingMessage>読み込み中...</LoadingMessage>}

        {!loading && selectedTeacherId && (
          <CalendarGrid>
            {/* ヘッダー行 */}
            <HeaderCell>コマ / 曜日</HeaderCell>
            {DAYS.map((day) => (
              <HeaderCell key={day}>{day}</HeaderCell>
            ))}

            {/* 各コマの行 */}
            {KOMA_CODES.map((komaCode) => (
              <React.Fragment key={komaCode}>
                <TimeCell>コマ {komaCode}</TimeCell>
                {weeks[0].map((date, dayIndex) => {
                  const dateStr = date.toISOString().split('T')[0]
                  const isAvailable = availabilityData[dateStr]?.[komaCode] ?? true

                  return (
                    <AvailabilityCell
                      key={`${komaCode}-${dayIndex}`}
                      $isAvailable={isAvailable}
                      $isClickable={!loading}
                      onClick={() => !loading && handleCellClick(date, komaCode)}
                    >
                      {isAvailable ? '○' : '×'}
                    </AvailabilityCell>
                  )
                })}
              </React.Fragment>
            ))}
          </CalendarGrid>
        )}

        {!loading && !selectedTeacherId && (
          <LoadingMessage>講師を選択してください</LoadingMessage>
        )}
      </CalendarContainer>
    </PageContainer>
  )
}
