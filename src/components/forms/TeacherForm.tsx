/**
 * Teacher Form Component
 *
 * Form for creating and editing teacher master data.
 * Requirements: REQ-3（講師マスタ管理）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Teacher, TeacherSkill } from '@/types/entities'
import { GRADE_OPTIONS, gradeToDisplay } from '@/utils/gradeHelper'
import { SUBJECT_OPTIONS } from '@/utils/subjectOptions'

interface TeacherFormProps {
  teacher?: Teacher | null
  onSubmit: (data: TeacherFormData) => Promise<void>
  onCancel: () => void
}

export interface TeacherFormData {
  name: string
  email?: string
  createUserAccount?: boolean
  capWeekSlots: number
  capStudents: number
  allowPair: boolean
  skills: TeacherSkill[]
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.5rem;
`

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
`

const SkillsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const SkillItem = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 0.75rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
  align-items: end;
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

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #374151;
  background: white;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`

export const TeacherForm: React.FC<TeacherFormProps> = ({
  teacher,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<TeacherFormData>({
    name: teacher?.name || '',
    email: teacher?.user?.email || '',
    createUserAccount: false,
    capWeekSlots: teacher?.capWeekSlots || 10,
    capStudents: teacher?.capStudents || 4,
    allowPair: teacher?.allowPair || false,
    skills: teacher?.skills || [],
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('講師名を入力してください')
      return
    }

    if (formData.createUserAccount && !formData.email?.trim()) {
      setError('ユーザーアカウントを作成する場合は、メールアドレスを入力してください')
      return
    }

    if (formData.email && !formData.email.includes('@')) {
      setError('有効なメールアドレスを入力してください')
      return
    }

    if (formData.capWeekSlots < 1) {
      setError('週あたりの上限コマ数は1以上である必要があります')
      return
    }

    if (formData.capStudents < 1) {
      setError('同時担当可能な生徒数は1以上である必要があります')
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

  const addSkill = () => {
    setFormData({
      ...formData,
      skills: [
        ...formData.skills,
        {
          teacherId: teacher?.id || '',
          subject: '',
          gradeMin: 1,
          gradeMax: 12,
        },
      ],
    })
  }

  const updateSkill = (index: number, field: keyof TeacherSkill, value: any) => {
    const newSkills = [...formData.skills]
    newSkills[index] = { ...newSkills[index], [field]: value }
    setFormData({ ...formData, skills: newSkills })
  }

  const removeSkill = (index: number) => {
    const newSkills = formData.skills.filter((_, i) => i !== index)
    setFormData({ ...formData, skills: newSkills })
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormContainer>
        <FormGroup>
          <Label htmlFor="name">講師名 *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 山田太郎"
            required
          />
        </FormGroup>

        {!teacher && (
          <>
            <FormGroup>
              <Label htmlFor="email">メールアドレス（オプション）</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="例: teacher@example.com"
              />
            </FormGroup>

            <CheckboxGroup>
              <CheckboxLabel>
                <input
                  type="checkbox"
                  checked={formData.createUserAccount}
                  onChange={(e) =>
                    setFormData({ ...formData, createUserAccount: e.target.checked })
                  }
                  disabled={!formData.email?.trim()}
                />
                ユーザーアカウントを作成（ログイン可能にする）
              </CheckboxLabel>
            </CheckboxGroup>
          </>
        )}

        <FormGroup>
          <Label htmlFor="capWeekSlots">週あたり上限コマ数 *</Label>
          <Input
            id="capWeekSlots"
            type="number"
            min="1"
            max="35"
            value={formData.capWeekSlots}
            onChange={(e) =>
              setFormData({ ...formData, capWeekSlots: parseInt(e.target.value) })
            }
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="capStudents">同時担当可能生徒数 *</Label>
          <Input
            id="capStudents"
            type="number"
            min="1"
            max="10"
            value={formData.capStudents}
            onChange={(e) =>
              setFormData({ ...formData, capStudents: parseInt(e.target.value) })
            }
            required
          />
        </FormGroup>

        <CheckboxGroup>
          <CheckboxLabel>
            <input
              type="checkbox"
              checked={formData.allowPair}
              onChange={(e) =>
                setFormData({ ...formData, allowPair: e.target.checked })
              }
            />
            1:2指導を許可する
          </CheckboxLabel>
        </CheckboxGroup>

        <SkillsSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>対応教科・学年</Label>
            <Button type="button" variant="outline" size="sm" onClick={addSkill}>
              + 教科を追加
            </Button>
          </div>

          {formData.skills.map((skill, index) => (
            <SkillItem key={index}>
              <FormGroup>
                <Label>教科</Label>
                <Select
                  value={skill.subject}
                  onChange={(e) => updateSkill(index, 'subject', e.target.value)}
                >
                  <option value="">選択してください</option>
                  {SUBJECT_OPTIONS.map((subject) => (
                    <option key={subject.value} value={subject.value}>
                      {subject.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>最小学年</Label>
                <Select
                  value={skill.gradeMin}
                  onChange={(e) =>
                    updateSkill(index, 'gradeMin', parseInt(e.target.value))
                  }
                >
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <FormGroup>
                <Label>最大学年</Label>
                <Select
                  value={skill.gradeMax}
                  onChange={(e) =>
                    updateSkill(index, 'gradeMax', parseInt(e.target.value))
                  }
                >
                  {GRADE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => removeSkill(index)}
              >
                削除
              </Button>
            </SkillItem>
          ))}
        </SkillsSection>

        {error && <ErrorText>{error}</ErrorText>}
      </FormContainer>

      <ButtonGroup>
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {teacher ? '更新' : '作成'}
        </Button>
      </ButtonGroup>
    </form>
  )
}
