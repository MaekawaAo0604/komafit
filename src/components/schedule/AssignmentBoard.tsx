/**
 * AssignmentBoard Component
 *
 * Calendar-style table view for teacher assignments.
 * Displays multiple teacher positions per slot.
 *
 * - Admin view: Shows all positions (0/1: 6 positions, A/B/C: 10 positions)
 * - Teacher view: Shows only positions assigned to them
 */

import React from 'react'
import styled from 'styled-components'
import type { BoardSlot, DayOfWeek } from '@/types/entities'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin, selectUser } from '@/store/authSlice'

interface AssignmentBoardProps {
  slots: BoardSlot[]
  weekStartDate?: Date
  onSelectSlot?: (slotId: string, position: number) => void
  onStudentClick?: (slotId: string, position: number, seat: 1 | 2) => void
  selectedSlotId?: string | null
  loading?: boolean
}

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS: Record<DayOfWeek, string> = {
  MON: '月',
  TUE: '火',
  WED: '水',
  THU: '木',
  FRI: '金',
  SAT: '土',
  SUN: '日',
}

const KOMA_CODES = ['0', '1', 'A', 'B', 'C'] as const
const KOMA_POSITIONS: Record<string, number> = {
  '0': 6,
  '1': 6,
  'A': 10,
  'B': 10,
  'C': 10,
}

const Container = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`

const Table = styled.table`
  width: 100%;
  min-width: 1200px;
  border-collapse: collapse;
`

const Thead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`

const Tbody = styled.tbody``

const Th = styled.th<{ $isKoma?: boolean }>`
  padding: ${props => props.$isKoma ? '1rem 0.5rem' : '1rem'};
  text-align: center;
  font-weight: 600;
  font-size: ${props => props.$isKoma ? '1.5rem' : '1rem'};
  color: #1f2937;
  border-bottom: 2px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  background: ${props => props.$isKoma ? '#f9fafb' : '#fff'};
  white-space: nowrap;
  width: ${props => props.$isKoma ? '80px' : 'auto'};

  &:first-child {
    border-left: 1px solid #e5e7eb;
  }
`

const DateInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const DateDay = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: #3b82f6;
`

const DateMonth = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`

const Tr = styled.tr<{ $isEven?: boolean }>`
  background: ${props => props.$isEven ? '#f9fafb' : '#fff'};
`

const Td = styled.td<{ $isKoma?: boolean }>`
  padding: 0;
  border: 1px solid #e5e7eb;
  vertical-align: top;
  background: ${props => props.$isKoma && '#f9fafb'};
`

const KomaLabel = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 600px;
`

const PositionsContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const PositionRow = styled.div<{ $isSelected?: boolean; $hasTeacher?: boolean }>`
  min-height: 50px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: stretch;
  background: ${props => {
    if (props.$isSelected) return '#dbeafe'
    if (props.$hasTeacher) return '#fff'
    return '#fef3c7'
  }};
  transition: all 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f0f9ff;
  }
`

const TeacherCell = styled.div`
  flex: 0 0 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1f2937;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
`

const SeatsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`

const SeatRow = styled.div`
  display: flex;
  align-items: stretch;
  min-height: 40px;
  border-bottom: 1px solid #e5e7eb;

  &:last-child {
    border-bottom: none;
  }
`

const GradeSubjectCell = styled.div`
  flex: 0 0 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
  white-space: nowrap;
  border-right: 1px solid #e5e7eb;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
`

const StudentCell = styled.div`
  flex: 1;
  min-width: 150px;
  display: flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  color: #1f2937;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(59, 130, 246, 0.1);
  }
`

const EmptyCell = styled.span`
  color: #9ca3af;
  font-size: 0.75rem;
  user-select: none;
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: #6b7280;
  z-index: 100;
`

export const AssignmentBoard: React.FC<AssignmentBoardProps> = ({
  slots,
  weekStartDate,
  onSelectSlot,
  onStudentClick,
  selectedSlotId,
  loading
}) => {
  const isAdmin = useAppSelector(selectIsAdmin)
  const user = useAppSelector(selectUser)

  // Get date for a given day index (0=Monday, 4=Friday)
  const getDateForDay = (dayIndex: number) => {
    if (weekStartDate) {
      const targetDate = new Date(weekStartDate)
      targetDate.setDate(weekStartDate.getDate() + dayIndex)
      return targetDate
    }
    // Fallback: calculate from today
    const today = new Date()
    const currentDay = today.getDay() // 0 = Sunday
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + mondayOffset + dayIndex)
    return targetDate
  }

  // Group slots by day and koma
  const slotMap = new Map<string, BoardSlot>()
  slots.forEach(slot => {
    const key = `${slot.day}-${slot.komaCode}`
    slotMap.set(key, slot)
  })

  const getSlot = (day: DayOfWeek, komaCode: string): BoardSlot | undefined => {
    return slotMap.get(`${day}-${komaCode}`)
  }

  const handleTeacherClick = (slot: BoardSlot | undefined, position: number) => {
    if (slot && onSelectSlot) {
      onSelectSlot(slot.id, position)
    }
  }

  const handleStudentClick = (slot: BoardSlot | undefined, position: number, seat: number) => {
    if (slot && onStudentClick) {
      onStudentClick(slot.id, position, seat as 1 | 2)
    }
  }

  // Filter positions based on user role and teacher user ID
  const getPositionsToShow = (slot: BoardSlot | undefined): number[] => {
    if (!slot) return []

    // Admin sees all positions
    if (isAdmin) {
      return slot.positions.map(p => p.position)
    }

    // Teacher sees only positions assigned to them (match by teacher.userId)
    if (user && user.role === 'teacher') {
      // Debug logging
      console.log('🔍 [AssignmentBoard] Debug Info:', {
        slotId: slot.id,
        userId: user.id,
        positions: slot.positions.map(p => ({
          position: p.position,
          hasTeacher: !!p.teacher,
          teacherId: p.teacher?.teacherId,
          teacherName: p.teacher?.teacher?.name,
          teacherUserId: p.teacher?.teacher?.userId,
          matchesUser: p.teacher?.teacher?.userId === user.id
        }))
      })

      const assignedPositions = slot.positions
        .filter(p => p.teacher?.teacher?.userId === user.id)
        .map(p => p.position)

      console.log('✅ [AssignmentBoard] Assigned positions:', assignedPositions)

      // If teacher has no assignments in this slot, don't show any positions
      return assignedPositions
    }

    // Default: show all positions
    return slot.positions.map(p => p.position)
  }

  return (
    <Container>
      {loading && (
        <LoadingOverlay>
          読み込み中...
        </LoadingOverlay>
      )}
      <Table>
        <Thead>
          <tr>
            <Th $isKoma>コマ</Th>
            {DAYS.map((day, index) => {
              const date = getDateForDay(index)
              return (
                <Th key={day}>
                  <DateInfo>
                    <DateMonth>{`${date.getMonth() + 1}/${date.getDate()}`}</DateMonth>
                    <DateDay>{`${DAY_LABELS[day]}曜日`}</DateDay>
                  </DateInfo>
                </Th>
              )
            })}
          </tr>
        </Thead>
        <Tbody>
          {KOMA_CODES.map((komaCode, rowIndex) => (
            <Tr key={komaCode} $isEven={rowIndex % 2 === 0}>
              <Td $isKoma>
                <KomaLabel>{komaCode}</KomaLabel>
              </Td>
{DAYS.map(day => {
                const slot = getSlot(day, komaCode)
                const positionsToShow = getPositionsToShow(slot)

                return (
                  <Td key={`${day}-${komaCode}`}>
                    <PositionsContainer>
                      {positionsToShow.length > 0 ? (
                        positionsToShow.map(posNum => {
                          const positionData = slot?.positions.find(p => p.position === posNum)
                          const hasTeacher = !!positionData?.teacher?.teacherId
                          const isSelected = selectedSlotId === `${slot?.id}-${posNum}`
                          const seat1 = positionData?.students.find(s => s.seat === 1)
                          const seat2 = positionData?.students.find(s => s.seat === 2)

                          return (
                            <PositionRow
                              key={posNum}
                              $hasTeacher={hasTeacher}
                              $isSelected={isSelected}
                            >
                              {/* 先生 */}
                              <TeacherCell onClick={() => handleTeacherClick(slot, posNum)}>
                                {positionData?.teacher?.teacher?.name || <EmptyCell>先生</EmptyCell>}
                              </TeacherCell>

                              {/* 生徒2人（縦並び） */}
                              <SeatsContainer>
                                {/* 座席1 */}
                                <SeatRow>
                                  <GradeSubjectCell onClick={() => handleStudentClick(slot, posNum, 1)}>
                                    {seat1 ? (
                                      `${seat1.grade > 6 ? `中${seat1.grade - 6}` : `小${seat1.grade}`}・${seat1.subject}`
                                    ) : (
                                      <EmptyCell>学年・教科</EmptyCell>
                                    )}
                                  </GradeSubjectCell>
                                  <StudentCell onClick={() => handleStudentClick(slot, posNum, 1)}>
                                    {seat1?.student?.name || <EmptyCell>生徒名</EmptyCell>}
                                  </StudentCell>
                                </SeatRow>

                                {/* 座席2 */}
                                <SeatRow>
                                  <GradeSubjectCell onClick={() => handleStudentClick(slot, posNum, 2)}>
                                    {seat2 ? (
                                      `${seat2.grade > 6 ? `中${seat2.grade - 6}` : `小${seat2.grade}`}・${seat2.subject}`
                                    ) : (
                                      <EmptyCell>学年・教科</EmptyCell>
                                    )}
                                  </GradeSubjectCell>
                                  <StudentCell onClick={() => handleStudentClick(slot, posNum, 2)}>
                                    {seat2?.student?.name || <EmptyCell>生徒名</EmptyCell>}
                                  </StudentCell>
                                </SeatRow>
                              </SeatsContainer>
                            </PositionRow>
                          )
                        })
                      ) : (
                        <PositionRow>
                          <TeacherCell>
                            <EmptyCell>割当なし</EmptyCell>
                          </TeacherCell>
                          <SeatsContainer>
                            <SeatRow>
                              <EmptyCell>-</EmptyCell>
                            </SeatRow>
                          </SeatsContainer>
                        </PositionRow>
                      )}
                    </PositionsContainer>
                  </Td>
                )
              })}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Container>
  )
}
