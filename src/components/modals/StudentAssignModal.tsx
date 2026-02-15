/**
 * StudentAssignModal Component
 *
 * Modal for assigning a student to a specific date/time slot with a teacher.
 * Allows admin to select a student and subject for the assignment.
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { listStudents } from '@/services/students'
import { assignStudent } from '@/services/assignments'
import { gradeToDisplay } from '@/utils/gradeHelper'
import { SUBJECT_OPTIONS } from '@/utils/subjectOptions'
import type { Student } from '@/types/entities'

interface StudentAssignModalProps {
  isOpen: boolean
  onClose: () => void
  date: string
  timeSlotId: string
  teacherId: string
  onSuccess?: () => void
}

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`

const Label = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`

const Select = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #374151;
  background: white;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #374151;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
`

const ErrorText = styled.p`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`

const InfoText = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 0.5rem;
`

const StudentInfo = styled.div`
  background: #f9fafb;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-top: 0.5rem;
`

const StudentDetail = styled.div`
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 0.25rem;

  strong {
    font-weight: 600;
    color: #111827;
  }
`

export const StudentAssignModal: React.FC<StudentAssignModalProps> = ({
  isOpen,
  onClose,
  date,
  timeSlotId,
  teacherId,
  onSuccess,
}) => {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [customSubject, setCustomSubject] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadStudents()
      // Reset form
      setSelectedStudentId('')
      setSelectedSubject('')
      setCustomSubject('')
      setError(null)
    }
  }, [isOpen])

  const loadStudents = async () => {
    try {
      setLoading(true)
      const data = await listStudents(true)
      setStudents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生徒リストの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedStudentId) {
      setError('生徒を選択してください')
      return
    }

    const subject = selectedSubject === 'custom' ? customSubject : selectedSubject
    if (!subject.trim()) {
      setError('科目を選択または入力してください')
      return
    }

    try {
      setLoading(true)
      await assignStudent({
        date,
        timeSlotId,
        teacherId,
        studentId: selectedStudentId,
        subject: subject.trim(),
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アサインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  // Format date for display
  const dateObj = new Date(date + 'T00:00:00')
  const dateDisplay = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="生徒アサイン"
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <InfoText>
          <strong>日付:</strong> {dateDisplay}　<strong>コマ:</strong> {timeSlotId}
        </InfoText>

        <FormGroup>
          <Label htmlFor="student">生徒 *</Label>
          <Select
            id="student"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={loading}
            required
          >
            <option value="">生徒を選択してください</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {gradeToDisplay(student.grade)} {student.name}
                {student.lessonLabel && ` (${student.lessonLabel})`}
              </option>
            ))}
          </Select>

          {selectedStudent && (
            <StudentInfo>
              <StudentDetail>
                <strong>学年:</strong> {gradeToDisplay(selectedStudent.grade)}
              </StudentDetail>
              {selectedStudent.lessonLabel && (
                <StudentDetail>
                  <strong>授業ラベル:</strong> {selectedStudent.lessonLabel}
                </StudentDetail>
              )}
              {selectedStudent.requiresOneOnOne && (
                <StudentDetail style={{ color: '#ef4444' }}>
                  <strong>※ 1対1授業必須</strong>
                </StudentDetail>
              )}
            </StudentInfo>
          )}
        </FormGroup>

        <FormGroup>
          <Label htmlFor="subject">科目 *</Label>
          <Select
            id="subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={loading}
            required
          >
            <option value="">科目を選択してください</option>
            {SUBJECT_OPTIONS.map((subject) => (
              <option key={subject.value} value={subject.value}>
                {subject.label}
              </option>
            ))}
            <option value="custom">その他（手入力）</option>
          </Select>

          {selectedSubject === 'custom' && (
            <Input
              type="text"
              placeholder="科目名を入力してください"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              disabled={loading}
              required
              style={{ marginTop: '0.5rem' }}
            />
          )}
        </FormGroup>

        {error && <ErrorText>{error}</ErrorText>}

        <ButtonGroup>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'アサイン中...' : 'アサイン'}
          </Button>
        </ButtonGroup>
      </form>
    </Modal>
  )
}
