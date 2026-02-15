/**
 * Student Form Component
 *
 * Form for creating and editing student master data.
 * Requirements: REQ-4（生徒マスタ管理）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Student, Teacher } from '@/types/entities'
import { GRADE_OPTIONS, gradeToDisplay, getSchoolLevel } from '@/utils/gradeHelper'
import { SUBJECT_OPTIONS } from '@/utils/subjectOptions'

interface StudentFormProps {
  student?: Student | null
  teachers: Teacher[]
  onSubmit: (data: StudentFormData) => Promise<void>
  onCancel: () => void
}

export interface StudentFormData {
  name: string
  grade: number
  requiresOneOnOne: boolean
  lessonLabel: string
  subjects: string[]
  ngTeachers: string[]
}

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const Label = styled.label`
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
`

const ListSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const ListItem = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
`

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #374151;
  background: white;
  transition: all 0.2s;
  flex: 1;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

const SubjectSelect = styled(Select)`
  min-width: 200px;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`

const ErrorText = styled.p`
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0;
`

const AddItemGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: end;
`

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`

const Checkbox = styled.input`
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
`

const CheckboxLabel = styled.label`
  font-weight: 400;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
`

export const StudentForm: React.FC<StudentFormProps> = ({
  student,
  teachers,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<StudentFormData>({
    name: student?.name || '',
    grade: student?.grade || 7,
    requiresOneOnOne: student?.requiresOneOnOne || false,
    lessonLabel: student?.lessonLabel || '',
    subjects: student?.subjects || [],
    ngTeachers: student?.ngTeachers || [],
  })

  const [newSubject, setNewSubject] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedNgTeacher, setSelectedNgTeacher] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 全ての科目を表示（学年による絞り込みは講師のスキル設定で対応）
  const availableSubjects = SUBJECT_OPTIONS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('生徒名を入力してください')
      return
    }

    if (formData.grade < 1 || formData.grade > 12) {
      setError('学年を選択してください')
      return
    }

    try {
      setLoading(true)
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const addSubject = () => {
    // プルダウンから選択された場合
    if (selectedSubject) {
      if (formData.subjects.includes(selectedSubject)) {
        setError('この教科は既に追加されています')
        return
      }
      setFormData({
        ...formData,
        subjects: [...formData.subjects, selectedSubject],
      })
      setSelectedSubject('')
      setError(null)
      return
    }

    // テキスト入力から追加された場合（カスタム科目）
    if (!newSubject.trim()) return
    if (formData.subjects.includes(newSubject.trim())) {
      setError('この教科は既に追加されています')
      return
    }
    setFormData({
      ...formData,
      subjects: [...formData.subjects, newSubject.trim()],
    })
    setNewSubject('')
    setError(null)
  }

  const removeSubject = (subject: string) => {
    setFormData({
      ...formData,
      subjects: formData.subjects.filter((s) => s !== subject),
    })
  }

  const addNgTeacher = () => {
    if (!selectedNgTeacher) return
    if (formData.ngTeachers.includes(selectedNgTeacher)) {
      setError('この講師は既に追加されています')
      return
    }
    setFormData({
      ...formData,
      ngTeachers: [...formData.ngTeachers, selectedNgTeacher],
    })
    setSelectedNgTeacher('')
    setError(null)
  }

  const removeNgTeacher = (teacherId: string) => {
    setFormData({
      ...formData,
      ngTeachers: formData.ngTeachers.filter((id) => id !== teacherId),
    })
  }

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId)
    return teacher?.name || '不明'
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormContainer>
        <FormGroup>
          <Label htmlFor="name">生徒名 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 鈴木花子"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="grade">学年 *</Label>
          <Select
            id="grade"
            value={formData.grade}
            onChange={(e) =>
              setFormData({ ...formData, grade: parseInt(e.target.value) })
            }
            required
          >
            {GRADE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormGroup>

        <FormGroup>
          <CheckboxGroup>
            <Checkbox
              id="requiresOneOnOne"
              type="checkbox"
              checked={formData.requiresOneOnOne}
              onChange={(e) =>
                setFormData({ ...formData, requiresOneOnOne: e.target.checked })
              }
            />
            <CheckboxLabel htmlFor="requiresOneOnOne">
              1対1指導必須（PS1など）
            </CheckboxLabel>
          </CheckboxGroup>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="lessonLabel">表示ラベル（オプション）</Label>
          <Input
            id="lessonLabel"
            value={formData.lessonLabel}
            onChange={(e) => setFormData({ ...formData, lessonLabel: e.target.value })}
            placeholder="例: PS1, PS2"
          />
        </FormGroup>

        <ListSection>
          <Label>受講教科</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <AddItemGroup>
              <SubjectSelect
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">プルダウンから選択</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </SubjectSelect>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubject}
                disabled={!selectedSubject}
              >
                追加
              </Button>
            </AddItemGroup>

            <AddItemGroup>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="または、カスタム科目を入力"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSubject}
                disabled={!newSubject.trim()}
              >
                追加
              </Button>
            </AddItemGroup>
          </div>

          {formData.subjects.map((subject) => (
            <ListItem key={subject}>
              <span style={{ flex: 1 }}>{subject}</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeSubject(subject)}
              >
                削除
              </Button>
            </ListItem>
          ))}
        </ListSection>

        <ListSection>
          <Label>NG講師</Label>
          <AddItemGroup>
            <Select
              value={selectedNgTeacher}
              onChange={(e) => setSelectedNgTeacher(e.target.value)}
              style={{ flex: 1 }}
            >
              <option value="">講師を選択</option>
              {teachers
                .filter((t) => !formData.ngTeachers.includes(t.id))
                .map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNgTeacher}
              disabled={!selectedNgTeacher}
            >
              追加
            </Button>
          </AddItemGroup>

          {formData.ngTeachers.map((teacherId) => (
            <ListItem key={teacherId}>
              <span style={{ flex: 1 }}>{getTeacherName(teacherId)}</span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeNgTeacher(teacherId)}
              >
                削除
              </Button>
            </ListItem>
          ))}
        </ListSection>

        {error && <ErrorText>{error}</ErrorText>}
      </FormContainer>

      <ButtonGroup>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {student ? '更新' : '作成'}
        </Button>
      </ButtonGroup>
    </form>
  )
}
