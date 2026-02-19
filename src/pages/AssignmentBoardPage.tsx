/**
 * AssignmentBoardPage
 *
 * Main assignment board page for managing teacher assignments.
 * Full-screen table layout optimized for desktop.
 * Supports week-based navigation using V2 calendar data.
 */

import React, { useEffect, useMemo, useRef } from 'react'
import styled from 'styled-components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchWeeklyScheduleAsync,
  selectAllSlots,
  selectScheduleLoading,
  selectWeekStartDate,
  assignTeacherAsync,
  assignStudentAsync,
} from '@/store/scheduleSlice'
import { selectUser } from '@/store/authSlice'
import { AssignmentBoard } from '@/components/schedule/AssignmentBoard'
import { TeacherSelectModal } from '@/components/schedule/TeacherSelectModal'
import { StudentSelectModal } from '@/components/schedule/StudentSelectModal'
import { getMondayOfWeek } from '@/utils/weeklyBoardTransform'

const PageContainer = styled.div`
  height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PageHeader = styled.div`
  padding: 1.5rem 2rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
`

const PageTitle = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const WeekNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const NavButton = styled.button`
  padding: 0.375rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  &:active {
    background: #e5e7eb;
  }
`

const TodayButton = styled(NavButton)`
  font-weight: 600;
  color: #2563eb;
  border-color: #93c5fd;

  &:hover {
    background: #eff6ff;
    border-color: #60a5fa;
  }
`

const WeekLabelButton = styled.button`
  font-size: 0.9375rem;
  color: #374151;
  font-weight: 500;
  min-width: 200px;
  text-align: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }
`

const HiddenDateInput = styled.input`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: none;
  /* Allow click-through to open the picker */
  &::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
`

const BoardWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 1.5rem;
`

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const startYear = monday.getFullYear()
  const startMonth = monday.getMonth() + 1
  const startDay = monday.getDate()
  const endMonth = sunday.getMonth() + 1
  const endDay = sunday.getDate()

  if (startMonth === endMonth) {
    return `${startYear}年${startMonth}月${startDay}日 〜 ${endDay}日`
  }
  return `${startYear}年${startMonth}月${startDay}日 〜 ${endMonth}月${endDay}日`
}

export const AssignmentBoardPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const slots = useAppSelector(selectAllSlots)
  const loading = useAppSelector(selectScheduleLoading)
  const user = useAppSelector(selectUser)
  const weekStartDateStr = useAppSelector(selectWeekStartDate)

  const currentMonday = useMemo(() => getMondayOfWeek(new Date()), [])

  const weekStartDate = useMemo(() => {
    if (weekStartDateStr) return new Date(weekStartDateStr)
    return currentMonday
  }, [weekStartDateStr, currentMonday])

  const [selectedSlot, setSelectedSlot] = React.useState<{ slotId: string; position: number } | null>(null)
  const [showTeacherModal, setShowTeacherModal] = React.useState(false)
  const [currentTeacherId, setCurrentTeacherId] = React.useState<string | null>(null)

  const [selectedSeat, setSelectedSeat] = React.useState<{ slotId: string; position: number; seat: 1 | 2 } | null>(null)
  const [showStudentModal, setShowStudentModal] = React.useState(false)
  const [currentStudentId, setCurrentStudentId] = React.useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchWeeklyScheduleAsync(weekStartDate))
  }, [dispatch, weekStartDate])

  const handlePrevWeek = () => {
    const prev = new Date(weekStartDate)
    prev.setDate(prev.getDate() - 7)
    dispatch(fetchWeeklyScheduleAsync(prev))
  }

  const handleNextWeek = () => {
    const next = new Date(weekStartDate)
    next.setDate(next.getDate() + 7)
    dispatch(fetchWeeklyScheduleAsync(next))
  }

  const handleToday = () => {
    const monday = getMondayOfWeek(new Date())
    dispatch(fetchWeeklyScheduleAsync(monday))
  }

  const dateInputRef = useRef<HTMLInputElement>(null)

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return
    const selected = new Date(val + 'T00:00:00')
    const monday = getMondayOfWeek(selected)
    dispatch(fetchWeeklyScheduleAsync(monday))
  }

  const dateInputValue = useMemo(() => {
    const y = weekStartDate.getFullYear()
    const m = String(weekStartDate.getMonth() + 1).padStart(2, '0')
    const d = String(weekStartDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [weekStartDate])

  const handleSelectSlot = (slotId: string, position: number) => {
    const slot = slots.find(s => s.id === slotId)
    const positionData = slot?.positions.find(p => p.position === position)
    const teacherId = positionData?.teacher?.teacherId || null

    setSelectedSlot({ slotId, position })
    setCurrentTeacherId(teacherId)
    setShowTeacherModal(true)
  }

  const handleCloseModal = () => {
    setShowTeacherModal(false)
    setSelectedSlot(null)
    setCurrentTeacherId(null)
  }

  const handleSelectTeacher = async (teacherId: string) => {
    if (!selectedSlot || !user) return

    try {
      await dispatch(assignTeacherAsync({
        slotId: selectedSlot.slotId,
        position: selectedSlot.position,
        teacherId,
        assignedBy: user.id,
      })).unwrap()

      // Refresh with weekly data
      dispatch(fetchWeeklyScheduleAsync(weekStartDate))
    } catch (error) {
      console.error('Failed to assign teacher:', error)
      alert('講師の割り当てに失敗しました')
    }
  }

  const handleSelectSeat = (slotId: string, position: number, seat: 1 | 2) => {
    const slot = slots.find(s => s.id === slotId)
    const positionData = slot?.positions.find(p => p.position === position)
    const student = positionData?.students.find(s => s.seat === seat)
    const studentId = student?.studentId || null

    setSelectedSeat({ slotId, position, seat })
    setCurrentStudentId(studentId)
    setShowStudentModal(true)
  }

  const handleCloseStudentModal = () => {
    setShowStudentModal(false)
    setSelectedSeat(null)
    setCurrentStudentId(null)
  }

  const handleSelectStudent = async (studentId: string, subject: string, grade: number) => {
    if (!selectedSeat || !user) return

    try {
      await dispatch(assignStudentAsync({
        slotId: selectedSeat.slotId,
        position: selectedSeat.position,
        seat: selectedSeat.seat,
        studentId,
        subject,
        grade,
      })).unwrap()

      // Refresh with weekly data
      dispatch(fetchWeeklyScheduleAsync(weekStartDate))
      handleCloseStudentModal()
    } catch (error) {
      console.error('Failed to assign student:', error)
      alert('生徒の割り当てに失敗しました')
    }
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderRow>
          <PageTitle>割当ボード</PageTitle>
          <WeekNav>
            <NavButton onClick={handlePrevWeek}>◀ 前週</NavButton>
            <TodayButton onClick={handleToday}>今週</TodayButton>
            <NavButton onClick={handleNextWeek}>翌週 ▶</NavButton>
            <WeekLabelButton>
              {formatWeekRange(weekStartDate)}
              <HiddenDateInput
                type="date"
                ref={dateInputRef}
                value={dateInputValue}
                onChange={handleDateChange}
              />
            </WeekLabelButton>
          </WeekNav>
        </HeaderRow>
      </PageHeader>

      <BoardWrapper>
        <AssignmentBoard
          slots={slots}
          weekStartDate={weekStartDate}
          onSelectSlot={handleSelectSlot}
          onStudentClick={handleSelectSeat}
          selectedSlotId={selectedSlot ? `${selectedSlot.slotId}-${selectedSlot.position}` : null}
          loading={loading}
        />
      </BoardWrapper>

      <TeacherSelectModal
        isOpen={showTeacherModal}
        onClose={handleCloseModal}
        onSelect={handleSelectTeacher}
        slotId={selectedSlot?.slotId || ''}
        position={selectedSlot?.position || 0}
        currentTeacherId={currentTeacherId}
      />

      <StudentSelectModal
        isOpen={showStudentModal}
        onClose={handleCloseStudentModal}
        onSelect={handleSelectStudent}
        slotId={selectedSeat?.slotId || ''}
        currentStudentId={currentStudentId}
      />
    </PageContainer>
  )
}
