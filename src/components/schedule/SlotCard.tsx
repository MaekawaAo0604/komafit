/**
 * SlotCard Component
 *
 * Displays a single time slot with students and assigned teacher.
 * Core component of the assignment board.
 */

import React from 'react'
import styled, { css } from 'styled-components'
import type { BoardSlot } from '@/types/entities'
import { Badge } from '@/components/ui/Badge'

interface SlotCardProps {
  slot: BoardSlot
  onClickSlot?: (slotId: string) => void
  onClickTeacher?: (slotId: string, teacherId: string | null) => void
  isSelected?: boolean
  showRecommendation?: boolean
}

const CardContainer = styled.div<{ $isSelected?: boolean; $hasTeacher?: boolean }>`
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1rem;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;

  /* Status indicator bar */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${(props) =>
      props.$hasTeacher
        ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
        : 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'};
    transition: all 250ms ease;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
      0 8px 10px -6px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;

    &::before {
      height: 6px;
    }
  }

  ${(props) =>
    props.$isSelected &&
    css`
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    `}
`

const SlotHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
`

const SlotId = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
`

const StudentsSection = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
`

const SectionTitle = styled.div`
  font-family: 'Inter', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
`

const StudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const StudentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
`

const StudentName = styled.span`
  font-weight: 600;
  color: #374151;
`

const StudentSubject = styled.span`
  color: #6b7280;
  font-size: 0.75rem;
`

const TeacherSection = styled.div<{ $hasTeacher?: boolean }>`
  padding: 0.75rem;
  background: ${(props) =>
    props.$hasTeacher
      ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
      : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'};
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 250ms ease;

  &:hover {
    transform: scale(1.02);
  }
`

const TeacherInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const TeacherAvatar = styled.div<{ $color: string }>`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
`

const TeacherName = styled.div`
  font-weight: 600;
  color: #374151;
`

const EmptySlot = styled.div`
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0.5rem;
`

const RecommendationBadge = styled.div`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
`

// Generate consistent color for teacher avatar
const getTeacherColor = (name: string): string => {
  const colors = [
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#06b6d4',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export const SlotCard: React.FC<SlotCardProps> = ({
  slot,
  onClickSlot,
  onClickTeacher,
  isSelected = false,
  showRecommendation = false,
}) => {
  const hasTeacher = !!slot.teacher?.teacherId
  const studentCount = slot.students.length

  const handleCardClick = () => {
    onClickSlot?.(slot.id)
  }

  const handleTeacherClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClickTeacher?.(slot.id, slot.teacher?.teacherId || null)
  }

  return (
    <CardContainer
      $isSelected={isSelected}
      $hasTeacher={hasTeacher}
      onClick={handleCardClick}
    >
      {showRecommendation && (
        <RecommendationBadge>
          <Badge variant="primary" size="sm" dot>
            推薦あり
          </Badge>
        </RecommendationBadge>
      )}

      <SlotHeader>
        <SlotId>{slot.id}</SlotId>
        <Badge variant={hasTeacher ? 'success' : 'warning'} size="sm">
          {hasTeacher ? '割当済' : '未割当'}
        </Badge>
      </SlotHeader>

      {studentCount > 0 ? (
        <StudentsSection>
          <SectionTitle>
            生徒 ({studentCount}/{studentCount === 1 ? '1' : '2'})
          </SectionTitle>
          <StudentList>
            {slot.students.map((student, index) => (
              <StudentItem key={`${student.studentId}-${index}`}>
                <StudentName>{student.student?.name || '生徒名不明'}</StudentName>
                <div>
                  <Badge variant="info" size="sm">
                    {student.subject}
                  </Badge>
                  <StudentSubject> 学年{student.grade}</StudentSubject>
                </div>
              </StudentItem>
            ))}
          </StudentList>
        </StudentsSection>
      ) : (
        <StudentsSection>
          <EmptySlot>生徒が配置されていません</EmptySlot>
        </StudentsSection>
      )}

      <TeacherSection $hasTeacher={hasTeacher} onClick={handleTeacherClick}>
        {hasTeacher && slot.teacher ? (
          <TeacherInfo>
            <TeacherAvatar
              $color={getTeacherColor(slot.teacher.teacher?.name || 'T')}
            >
              {(slot.teacher.teacher?.name || 'T')[0]}
            </TeacherAvatar>
            <TeacherName>{slot.teacher.teacher?.name}</TeacherName>
          </TeacherInfo>
        ) : (
          <TeacherInfo>
            <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
              講師未割当
            </div>
          </TeacherInfo>
        )}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </TeacherSection>
    </CardContainer>
  )
}
