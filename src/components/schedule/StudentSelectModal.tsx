/**
 * StudentSelectModal Component
 *
 * Modal for selecting a student and subject to assign to a seat
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import type { Student } from '@/types/entities'
import { supabase } from '@/lib/supabase'

interface StudentSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (studentId: string, subject: string, grade: number) => void
  slotId: string
  currentStudentId?: string | null
}

const SUBJECTS = ['数学', '英語', '国語', '理科', '社会'] as const

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

const SubjectSelect = styled.select`
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

const StudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const StudentItem = styled.button<{ $isSelected?: boolean }>`
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

const StudentName = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
`

const StudentInfo = styled.div`
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

const getGradeLabel = (grade: number): string => {
  if (grade <= 6) return `小${grade}`
  if (grade <= 9) return `中${grade - 6}`
  return `高${grade - 9}`
}

export const StudentSelectModal: React.FC<StudentSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  slotId,
  currentStudentId,
}) => {
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(currentStudentId || null)
  const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchStudents()
      setSelectedStudentId(currentStudentId || null)
      setSelectedSubject(SUBJECTS[0])
    }
  }, [isOpen, currentStudentId])

  useEffect(() => {
    if (searchQuery) {
      setFilteredStudents(
        students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    } else {
      setFilteredStudents(students)
    }
  }, [searchQuery, students])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Fetch all active students
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('active', true)
        .order('grade', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      // Fetch students already assigned to this slot
      const { data: assignedData, error: assignedError } = await supabase
        .from('slot_students')
        .select('student_id')
        .eq('slot_id', slotId)

      if (assignedError) throw assignedError

      const assignedStudentIds = new Set(assignedData?.map(s => s.student_id) || [])

      // Filter out students already assigned to this slot (except current student)
      const mappedStudents: Student[] = data
        .filter(s => !assignedStudentIds.has(s.id) || s.id === currentStudentId)
        .map(s => ({
          id: s.id,
          name: s.name,
          grade: s.grade,
          active: s.active,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }))

      setStudents(mappedStudents)
      setFilteredStudents(mappedStudents)
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId)
      if (student) {
        onSelect(selectedStudentId, selectedSubject, student.grade)
        onClose()
      }
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
          <Title>生徒と科目を選択</Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          <SearchInput
            type="text"
            placeholder="生徒名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <SubjectSelect
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {SUBJECTS.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </SubjectSelect>

          {loading ? (
            <EmptyState>読み込み中...</EmptyState>
          ) : filteredStudents.length === 0 ? (
            <EmptyState>生徒が見つかりません</EmptyState>
          ) : (
            <StudentList>
              {filteredStudents.map(student => (
                <StudentItem
                  key={student.id}
                  $isSelected={selectedStudentId === student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <StudentName>{student.name}</StudentName>
                  <StudentInfo>
                    学年: {getGradeLabel(student.grade)}
                  </StudentInfo>
                </StudentItem>
              ))}
            </StudentList>
          )}
        </Content>

        <Footer>
          <Button $variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            $variant="primary"
            onClick={handleSelect}
            disabled={!selectedStudentId}
          >
            割り当て
          </Button>
        </Footer>
      </Modal>
    </Overlay>
  )
}
