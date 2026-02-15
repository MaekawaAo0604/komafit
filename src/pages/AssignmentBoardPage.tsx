/**
 * AssignmentBoardPage
 *
 * Main assignment board page for managing teacher assignments.
 * Full-screen table layout optimized for desktop.
 */

import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchScheduleAsync, selectAllSlots, selectScheduleLoading, assignTeacherAsync, assignStudentAsync } from '@/store/scheduleSlice'
import { selectUser } from '@/store/authSlice'
import { AssignmentBoard } from '@/components/schedule/AssignmentBoard'
import { TeacherSelectModal } from '@/components/schedule/TeacherSelectModal'
import { StudentSelectModal } from '@/components/schedule/StudentSelectModal'

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

const PageTitle = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
`

const PageDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`

const BoardWrapper = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 1.5rem;
`

export const AssignmentBoardPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const slots = useAppSelector(selectAllSlots)
  const loading = useAppSelector(selectScheduleLoading)
  const user = useAppSelector(selectUser)

  const [selectedSlot, setSelectedSlot] = useState<{ slotId: string; position: number } | null>(null)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null)

  const [selectedSeat, setSelectedSeat] = useState<{ slotId: string; position: number; seat: 1 | 2 } | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchScheduleAsync())
  }, [dispatch])

  const handleSelectSlot = (slotId: string, position: number) => {
    // Get current teacher for this position
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

      // Refresh schedule
      await dispatch(fetchScheduleAsync())
    } catch (error) {
      console.error('Failed to assign teacher:', error)
      alert('講師の割り当てに失敗しました')
    }
  }

  const handleSelectSeat = (slotId: string, position: number, seat: 1 | 2) => {
    // Get current student for this seat
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

      // Refresh schedule
      await dispatch(fetchScheduleAsync())
      handleCloseStudentModal()
    } catch (error) {
      console.error('Failed to assign student:', error)
      alert('生徒の割り当てに失敗しました')
    }
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>割当ボード</PageTitle>
        <PageDescription>週間スケジュールと講師割当の管理</PageDescription>
      </PageHeader>

      <BoardWrapper>
        <AssignmentBoard
          slots={slots}
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
