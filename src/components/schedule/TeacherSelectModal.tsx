/**
 * TeacherSelectModal Component
 *
 * Modal for selecting a teacher to assign to a position
 * 講師推薦エンジンによる候補絞り込み＋優先順位表示
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import type { SlotStudent } from '@/types/entities'
import { supabase } from '@/lib/supabase'
import { getTeacherCandidates, type CandidateTeacher } from '@/services/recommendations'

interface TeacherSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (teacherId: string) => void
  slotId: string
  position: number
  currentTeacherId?: string | null
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Modal = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;

  &:hover {
    background: #f3f4f6;
    color: #1f2937;
  }
`

const Content = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  transition: border-color 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`

const TeacherList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const TeacherItem = styled.button<{ $isSelected?: boolean }>`
  width: 100%;
  padding: 1rem;
  border: 2px solid ${props => props.$isSelected ? '#3b82f6' : '#e5e7eb'};
  border-radius: 8px;
  background: ${props => props.$isSelected ? '#eff6ff' : 'white'};
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: #3b82f6;
    background: #f0f9ff;
  }
`

const TeacherName = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
`

const TeacherInfo = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
`

const Footer = styled.div`
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s;
  border: none;

  ${props => props.$variant === 'primary' ? `
    background: #3b82f6;
    color: white;
    &:hover {
      background: #2563eb;
    }
    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
    &:hover {
      background: #f9fafb;
    }
  `}
`

export const TeacherSelectModal: React.FC<TeacherSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  slotId,
  position,
  currentTeacherId,
}) => {
  const [candidates, setCandidates] = useState<CandidateTeacher[]>([])
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateTeacher[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(currentTeacherId || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && slotId) {
      fetchCandidates()
      setSelectedTeacherId(currentTeacherId || null)
    }
  }, [isOpen, slotId, currentTeacherId])

  useEffect(() => {
    if (searchQuery) {
      setFilteredCandidates(
        candidates.filter(c => c.teacher.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    } else {
      setFilteredCandidates(candidates)
    }
  }, [searchQuery, candidates])

  const fetchCandidates = async () => {
    setLoading(true)
    try {
      // 1. スロット情報を取得
      const { data: slotData, error: slotError } = await supabase
        .from('slots')
        .select('id, day, koma_code')
        .eq('id', slotId)
        .single()

      if (slotError) throw slotError
      if (!slotData) throw new Error('Slot not found')

      const slot = slotData as { id: string; day: string; koma_code: string | number }

      // koma_codeを文字列に変換し、time_slot_idとして使用（数値の場合に対応）
      const timeSlotId = String(slot.koma_code)

      // 2. スロット内の生徒情報を取得
      const { data: studentsData, error: studentsError } = await supabase
        .from('slot_students')
        .select('student_id, seat, subject, grade')
        .eq('slot_id', slotId)
        .eq('position', position)

      if (studentsError) throw studentsError

      // 3. 生徒の詳細情報を取得（必要な場合）
      const studentIds = studentsData?.map((s: any) => s.student_id) || []
      let studentsDetails: Array<{ id: string; name: string }> = []

      if (studentIds.length > 0) {
        const { data: details } = await supabase
          .from('students')
          .select('id, name')
          .in('id', studentIds)

        studentsDetails = details || []
      }

      const slotStudents: SlotStudent[] = (studentsData || []).map((s: any) => {
        const studentDetail = studentsDetails.find(d => d.id === s.student_id)
        return {
          slotId: slotId,
          position: position,
          seat: s.seat as 1 | 2,
          studentId: s.student_id,
          subject: s.subject,
          grade: s.grade,
          student: studentDetail ? {
            id: studentDetail.id,
            name: studentDetail.name,
            grade: s.grade,
            active: true,
            requiresOneOnOne: false,
            lessonLabel: null,
            createdAt: '',
            updatedAt: '',
          } : undefined,
        }
      })

      // 4. レコメンドエンジンで候補取得
      const results = await getTeacherCandidates(
        slotId,
        slot.day,
        timeSlotId,
        slotStudents
      )

      // 5. 既に同じスロットに割り当てられている講師を除外（現在の講師は除く）
      const { data: assignedData, error: assignedError } = await supabase
        .from('slot_teacher')
        .select('teacher_id')
        .eq('slot_id', slotId)
        .not('teacher_id', 'is', null)

      if (assignedError) throw assignedError

      const assigned = (assignedData || []) as Array<{ teacher_id: string }>
      const assignedTeacherIds = new Set(assigned.map(t => t.teacher_id))

      const filteredResults = results.filter(
        c => !assignedTeacherIds.has(c.teacher.id) || c.teacher.id === currentTeacherId
      )

      setCandidates(filteredResults)
      setFilteredCandidates(filteredResults)
    } catch (error) {
      console.error('Failed to fetch candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedTeacherId) {
      onSelect(selectedTeacherId)
      onClose()
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <Modal>
        <Header>
          <Title>講師を選択</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          <SearchInput
            type="text"
            placeholder="講師名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {loading ? (
            <EmptyState>読み込み中...</EmptyState>
          ) : filteredCandidates.length === 0 ? (
            <EmptyState>
              条件に合う講師が見つかりません
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#9ca3af' }}>
                空き枠、教科、学年、NG講師、1:2可否のいずれかの条件を満たしていません
              </div>
            </EmptyState>
          ) : (
            <TeacherList>
              {filteredCandidates.map(candidate => (
                <TeacherItem
                  key={candidate.teacher.id}
                  $isSelected={selectedTeacherId === candidate.teacher.id}
                  onClick={() => setSelectedTeacherId(candidate.teacher.id)}
                >
                  <TeacherName>{candidate.teacher.name}</TeacherName>
                  <TeacherInfo>
                    現在の担当: {candidate.currentLoad}コマ |
                    {candidate.reasons.join(', ')} |
                    ペア指導: {candidate.teacher.allowPair ? '可' : '不可'}
                  </TeacherInfo>
                </TeacherItem>
              ))}
            </TeacherList>
          )}
        </Content>

        <Footer>
          <Button $variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            $variant="primary"
            onClick={handleSelect}
            disabled={!selectedTeacherId}
          >
            割り当て
          </Button>
        </Footer>
      </Modal>
    </Overlay>
  )
}
