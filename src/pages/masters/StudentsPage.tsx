/**
 * Students Master Page
 *
 * Page for managing student master data.
 * Requirements: REQ-4（生徒マスタ管理）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { StudentForm, StudentFormData } from '@/components/forms/StudentForm'
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  addStudentSubject,
  removeStudentSubject,
  getStudentSubjects,
  addStudentNgTeacher,
  removeStudentNgTeacher,
  getStudentNgTeachers,
} from '@/services/students'
import { listTeachers } from '@/services/teachers'
import type { Student, Teacher } from '@/types/entities'

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
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const StudentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`

const StudentCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const StudentName = styled.h3`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;

  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  font-size: 0.875rem;
  color: #6b7280;
`

const InfoValue = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const TagsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
`

const Tag = styled.span<{ $variant?: 'subject' | 'ng' }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: ${(props) => (props.$variant === 'ng' ? '#fef2f2' : '#eff6ff')};
  color: ${(props) => (props.$variant === 'ng' ? '#ef4444' : '#3b82f6')};
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
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

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [studentsData, teachersData] = await Promise.all([
        listStudents(true),
        listTeachers(true),
      ])
      setStudents(studentsData)
      setTeachers(teachersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingStudent(null)
    setShowModal(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setShowModal(true)
  }

  const handleDelete = async (student: Student) => {
    if (
      !window.confirm(
        `「${student.name}」を削除してもよろしいですか？\n\n※この操作は取り消せません。`
      )
    ) {
      return
    }

    try {
      await deleteStudent(student.id)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  const handleSubmit = async (data: StudentFormData) => {
    try {
      if (editingStudent) {
        // Update existing student
        await updateStudent(editingStudent.id, {
          name: data.name,
          grade: data.grade,
          requiresOneOnOne: data.requiresOneOnOne,
          lessonLabel: data.lessonLabel || null,
        })

        // Update subjects
        const currentSubjects = await getStudentSubjects(editingStudent.id)
        for (const subject of currentSubjects) {
          await removeStudentSubject(editingStudent.id, subject)
        }
        for (const subject of data.subjects) {
          await addStudentSubject(editingStudent.id, subject)
        }

        // Update NG teachers
        const currentNgTeachers = await getStudentNgTeachers(editingStudent.id)
        for (const teacherId of currentNgTeachers) {
          await removeStudentNgTeacher(editingStudent.id, teacherId)
        }
        for (const teacherId of data.ngTeachers) {
          await addStudentNgTeacher(editingStudent.id, teacherId)
        }
      } else {
        // Create new student
        const newStudent = await createStudent({
          name: data.name,
          grade: data.grade,
          requiresOneOnOne: data.requiresOneOnOne,
          lessonLabel: data.lessonLabel || null,
        })

        // Add subjects
        for (const subject of data.subjects) {
          await addStudentSubject(newStudent.id, subject)
        }

        // Add NG teachers
        for (const teacherId of data.ngTeachers) {
          await addStudentNgTeacher(newStudent.id, teacherId)
        }
      }

      setShowModal(false)
      await loadData()
    } catch (err) {
      throw err
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingStudent(null)
  }

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId)
    return teacher?.name || '不明'
  }

  if (loading) {
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
          <Button onClick={loadData}>再読み込み</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Title>生徒マスタ</Title>
        <Button onClick={handleCreate}>+ 新規生徒</Button>
      </PageHeader>

      {students.length === 0 ? (
        <Card padding="lg">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              生徒が登録されていません
            </p>
            <Button onClick={handleCreate}>最初の生徒を登録</Button>
          </div>
        </Card>
      ) : (
        <StudentsGrid>
          {students.map((student) => (
            <Card key={student.id}>
              <StudentCardContent>
                <StudentName>{student.name}</StudentName>

                <div>
                  <InfoRow>
                    <InfoLabel>学年</InfoLabel>
                    <InfoValue>{student.grade}年生</InfoValue>
                  </InfoRow>
                  {student.requiresOneOnOne && (
                    <InfoRow>
                      <InfoLabel>指導形式</InfoLabel>
                      <InfoValue>
                        1対1必須
                        {student.lessonLabel && ` (${student.lessonLabel})`}
                      </InfoValue>
                    </InfoRow>
                  )}
                </div>

                {student.subjects && student.subjects.length > 0 && (
                  <div>
                    <InfoLabel>受講教科</InfoLabel>
                    <TagsList>
                      {student.subjects.map((subject, idx) => (
                        <Tag key={idx} $variant="subject">
                          {subject}
                        </Tag>
                      ))}
                    </TagsList>
                  </div>
                )}

                {student.ngTeachers && student.ngTeachers.length > 0 && (
                  <div>
                    <InfoLabel>NG講師</InfoLabel>
                    <TagsList>
                      {student.ngTeachers.map((teacherId, idx) => (
                        <Tag key={idx} $variant="ng">
                          {getTeacherName(teacherId)}
                        </Tag>
                      ))}
                    </TagsList>
                  </div>
                )}

                <ButtonRow>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleEdit(student)}
                  >
                    編集
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    fullWidth
                    onClick={() => handleDelete(student)}
                  >
                    削除
                  </Button>
                </ButtonRow>
              </StudentCardContent>
            </Card>
          ))}
        </StudentsGrid>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCancel}
          title={editingStudent ? '生徒を編集' : '新規生徒を作成'}
          size="lg"
        >
          <StudentForm
            student={editingStudent}
            teachers={teachers}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </Modal>
      )}
    </PageContainer>
  )
}
