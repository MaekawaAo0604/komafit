/**
 * TeacherCandidateList Component
 *
 * Displays recommended teachers for a slot with scores and constraints.
 */

import React from 'react'
import styled from 'styled-components'
import type { TeacherCandidate } from '@/types/entities'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface TeacherCandidateListProps {
  candidates: TeacherCandidate[]
  onSelectTeacher?: (teacherId: string) => void
  loading?: boolean
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const CandidateCard = styled(Card)`
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  }
`

const CandidateHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`

const TeacherInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const TeacherAvatar = styled.div<{ $color: string }>`
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: linear-gradient(135deg, ${(props) => props.$color}dd 0%, ${(
  props
) => props.$color} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`

const TeacherDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`

const TeacherName = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
`

const TeacherMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
`

const ScoreBadge = styled.div<{ $score: number }>`
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  background: linear-gradient(
    135deg,
    ${(props) => {
      if (props.$score >= 2.5) return '#d1fae5'
      if (props.$score >= 1.5) return '#fef3c7'
      return '#fee2e2'
    }}
      0%,
    ${(props) => {
      if (props.$score >= 2.5) return '#a7f3d0'
      if (props.$score >= 1.5) return '#fde68a'
      return '#fecaca'
    }}
      100%
  );
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  color: ${(props) => {
    if (props.$score >= 2.5) return '#065f46'
    if (props.$score >= 1.5) return '#92400e'
    return '#991b1b'
  }};
`

const ConstraintsSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const ConstraintBadge = styled(Badge)<{ $satisfied: boolean }>`
  opacity: ${(props) => (props.$satisfied ? 1 : 0.5)};
`

const ReasonsSection = styled.div`
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  margin-bottom: 1rem;
`

const ReasonItem = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  padding: 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &::before {
    content: '•';
    color: #3b82f6;
    font-weight: 700;
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
`

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`

const EmptyText = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  color: #6b7280;
`

const LoadingState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`

const Spinner = styled.div`
  width: 3rem;
  height: 3rem;
  margin: 0 auto 1rem;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
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

export const TeacherCandidateList: React.FC<TeacherCandidateListProps> = ({
  candidates,
  onSelectTeacher,
  loading = false,
}) => {
  if (loading) {
    return (
      <LoadingState>
        <Spinner />
        <div style={{ color: '#6b7280' }}>推薦候補を計算中...</div>
      </LoadingState>
    )
  }

  if (candidates.length === 0) {
    return (
      <EmptyState>
        <EmptyIcon>🔍</EmptyIcon>
        <EmptyText>該当する講師が見つかりませんでした</EmptyText>
        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
          制約条件を満たす講師がいません
        </div>
      </EmptyState>
    )
  }

  return (
    <ListContainer>
      {candidates.map((candidate, index) => (
        <CandidateCard key={candidate.teacher.id} padding="lg">
          <CandidateHeader>
            <TeacherInfo>
              <TeacherAvatar $color={getTeacherColor(candidate.teacher.name)}>
                {candidate.teacher.name[0]}
              </TeacherAvatar>
              <TeacherDetails>
                <TeacherName>{candidate.teacher.name}</TeacherName>
                <TeacherMeta>
                  <span>
                    週{candidate.teacher.capWeekSlots}コマまで / 生徒
                    {candidate.teacher.capStudents}名まで
                  </span>
                  {candidate.teacher.allowPair && (
                    <Badge variant="info" size="sm">
                      1:2可
                    </Badge>
                  )}
                </TeacherMeta>
              </TeacherDetails>
            </TeacherInfo>
            <ScoreBadge $score={candidate.score}>
              {candidate.score.toFixed(2)}
            </ScoreBadge>
          </CandidateHeader>

          <ConstraintsSection>
            <ConstraintBadge
              variant={
                candidate.hardConstraints.hasAvailability ? 'success' : 'error'
              }
              size="sm"
              $satisfied={candidate.hardConstraints.hasAvailability}
            >
              空き枠あり
            </ConstraintBadge>
            <ConstraintBadge
              variant={
                candidate.hardConstraints.canTeachAllSubjects ? 'success' : 'error'
              }
              size="sm"
              $satisfied={candidate.hardConstraints.canTeachAllSubjects}
            >
              教科対応
            </ConstraintBadge>
            <ConstraintBadge
              variant={candidate.hardConstraints.notInNGList ? 'success' : 'error'}
              size="sm"
              $satisfied={candidate.hardConstraints.notInNGList}
            >
              NG講師外
            </ConstraintBadge>
            <ConstraintBadge
              variant={candidate.hardConstraints.allowsPair ? 'success' : 'error'}
              size="sm"
              $satisfied={candidate.hardConstraints.allowsPair}
            >
              ペア可
            </ConstraintBadge>
            <ConstraintBadge
              variant={
                candidate.hardConstraints.underCapacity ? 'success' : 'error'
              }
              size="sm"
              $satisfied={candidate.hardConstraints.underCapacity}
            >
              キャパ内
            </ConstraintBadge>
          </ConstraintsSection>

          <ReasonsSection>
            {candidate.reasons.map((reason, idx) => (
              <ReasonItem key={idx}>{reason}</ReasonItem>
            ))}
          </ReasonsSection>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => onSelectTeacher?.(candidate.teacher.id)}
          >
            この講師を割り当てる
          </Button>
        </CandidateCard>
      ))}
    </ListContainer>
  )
}
