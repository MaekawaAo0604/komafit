/**
 * Recurring Pattern Form Component
 *
 * Form for creating and editing recurring assignment patterns.
 * Allows teachers to register weekly lesson patterns that automatically expand to calendars.
 */

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled from 'styled-components'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type {
  RecurringAssignment,
  RecurringAssignmentInput,
  Teacher,
  Student,
  TimeSlot,
} from '@/types/entities'

// ============================================================================
// Types & Validation Schema
// ============================================================================

interface RecurringPatternFormProps {
  initialData?: RecurringAssignment
  teacherId?: string
  teachers: Teacher[]
  students: Student[]
  timeSlots: TimeSlot[]
  onSubmit: (data: RecurringAssignmentInput) => Promise<void>
  onCancel: () => void
}

/**
 * Zod validation schema for recurring pattern form
 */
const recurringPatternSchema = z.object({
  teacherId: z.string().uuid('有効な講師IDを選択してください'),
  dayOfWeek: z
    .number()
    .int()
    .min(0, '曜日を選択してください')
    .max(6, '曜日は0-6の範囲で指定してください'),
  timeSlotId: z.string().min(1, '時間帯を選択してください'),
  studentId: z.string().uuid('有効な生徒IDを選択してください'),
  subject: z.string().min(1, '科目を入力してください').max(50, '科目は50文字以内で入力してください'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '有効な日付を入力してください（YYYY-MM-DD）'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '有効な日付を入力してください（YYYY-MM-DD）')
    .optional()
    .nullable(),
  active: z.boolean().optional(),
})

type FormData = z.infer<typeof recurringPatternSchema>

// ============================================================================
// Styled Components
// ============================================================================

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

const ErrorText = styled.p`
  color: #ef4444;
  font-size: 0.875rem;
  margin: 0;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
`

const Description = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
`

const DayButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`

const DayButton = styled.button<{ $selected: boolean }>`
  padding: 0.75rem 1rem;
  border: 2px solid ${(props) => (props.$selected ? '#3b82f6' : '#d1d5db')};
  border-radius: 0.5rem;
  background: ${(props) => (props.$selected ? '#eff6ff' : 'white')};
  color: ${(props) => (props.$selected ? '#3b82f6' : '#374151')};
  font-weight: ${(props) => (props.$selected ? '600' : '500')};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 3rem;

  &:hover {
    border-color: #3b82f6;
    background: ${(props) => (props.$selected ? '#eff6ff' : '#f9fafb')};
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

  &:disabled {
    opacity: 0.5;
    background: #f9fafb;
    cursor: not-allowed;
  }
`

const SearchableSelect = styled.div`
  position: relative;
  width: 100%;
`

const SearchInput = styled(Input)`
  width: 100%;
`

const OptionsList = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  margin-top: 0.25rem;
  list-style: none;
  padding: 0;
  z-index: 10;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`

const OptionItem = styled.li<{ $selected: boolean }>`
  padding: 0.75rem;
  cursor: pointer;
  background: ${(props) => (props.$selected ? '#eff6ff' : 'white')};
  color: ${(props) => (props.$selected ? '#3b82f6' : '#374151')};

  &:hover {
    background: #f3f4f6;
  }
`

const ErrorAlert = styled.div`
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 0.5rem;
  color: #991b1b;
  font-size: 0.875rem;
  display: flex;
  align-items: start;
  gap: 0.75rem;

  svg {
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.125rem;
  }
`

// ============================================================================
// Component
// ============================================================================

// Constants
const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export function RecurringPatternForm({
  initialData,
  teacherId,
  teachers,
  students,
  timeSlots,
  onSubmit,
  onCancel,
}: RecurringPatternFormProps) {
  const [studentSearch, setStudentSearch] = useState('')
  const [showStudentList, setShowStudentList] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // React Hook Form setup with Zod resolver
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(recurringPatternSchema),
    defaultValues: initialData
      ? {
          teacherId: initialData.teacherId,
          dayOfWeek: initialData.dayOfWeek,
          timeSlotId: initialData.timeSlotId,
          studentId: initialData.studentId,
          subject: initialData.subject,
          startDate: initialData.startDate,
          endDate: initialData.endDate,
          active: initialData.active,
        }
      : {
          teacherId: teacherId || '',
          dayOfWeek: 1, // デフォルト: 月曜日
          timeSlotId: '',
          studentId: '',
          subject: '',
          startDate: '',
          endDate: null,
          active: true,
        },
  })

  const selectedStudentId = watch('studentId')
  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  // Filter students by search term
  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const handleFormSubmit = async (data: FormData) => {
    // エラーメッセージをクリア
    setSubmitError(null)

    try {
      await onSubmit(data)
      // 成功時はエラーをクリア
      setSubmitError(null)
    } catch (error) {
      console.error('Form submission error:', error)

      // エラーメッセージを解析して表示
      let errorMessage = '予期しないエラーが発生しました'

      if (error instanceof Error) {
        const message = error.message

        // エラーコード別のメッセージ
        if (message.includes('DUPLICATE_PATTERN')) {
          errorMessage = 'この組み合わせは既に登録されています'
        } else if (message.includes('PERMISSION_DENIED')) {
          errorMessage = '権限がありません'
        } else if (message.includes('VALIDATION_ERROR')) {
          errorMessage = '入力値が無効です: ' + message.split(':').pop()?.trim()
        } else if (message.includes('AUTHENTICATION_REQUIRED')) {
          errorMessage = 'ログインが必要です'
        } else if (message.includes('RESOURCE_NOT_FOUND')) {
          errorMessage = '指定されたリソースが見つかりません'
        } else {
          // その他のエラーメッセージをそのまま表示
          errorMessage = message
        }
      }

      setSubmitError(errorMessage)

      // エラーを親コンポーネントにも伝播（必要に応じてトースト通知などに使用可能）
      throw error
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <FormContainer>
        {/* エラーメッセージ表示 */}
        {submitError && (
          <ErrorAlert role="alert">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div>{submitError}</div>
          </ErrorAlert>
        )}

        {/* 講師選択 */}
        <FormGroup>
          <Label htmlFor="teacherId">講師 *</Label>
          {teacherId ? (
            <Description>
              {teachers.find((t) => t.id === teacherId)?.name || '講師情報を読み込み中...'}
              （自動設定）
            </Description>
          ) : (
            <Select {...register('teacherId')} disabled={isSubmitting}>
              <option value="">選択してください</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          )}
          {errors.teacherId && <ErrorText>{errors.teacherId.message}</ErrorText>}
        </FormGroup>

        {/* 曜日選択 */}
        <FormGroup>
          <Label>曜日 *</Label>
          <Description>授業を行う曜日を選択してください</Description>
          <Controller
            name="dayOfWeek"
            control={control}
            render={({ field }) => (
              <DayButtonGroup>
                {DAY_NAMES.map((day, index) => (
                  <DayButton
                    key={index}
                    type="button"
                    $selected={field.value === index}
                    onClick={() => field.onChange(index)}
                    disabled={isSubmitting}
                  >
                    {day}
                  </DayButton>
                ))}
              </DayButtonGroup>
            )}
          />
          {errors.dayOfWeek && <ErrorText>{errors.dayOfWeek.message}</ErrorText>}
        </FormGroup>

        {/* 時間帯選択 */}
        <FormGroup>
          <Label htmlFor="timeSlotId">時間帯 *</Label>
          <Description>授業を行う時間帯を選択してください</Description>
          <Select {...register('timeSlotId')} disabled={isSubmitting}>
            <option value="">選択してください</option>
            {timeSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.id} ({slot.startTime} - {slot.endTime})
              </option>
            ))}
          </Select>
          {errors.timeSlotId && <ErrorText>{errors.timeSlotId.message}</ErrorText>}
        </FormGroup>

        {/* 生徒選択 */}
        <FormGroup>
          <Label htmlFor="studentId">生徒 *</Label>
          <Description>授業を受ける生徒を選択してください</Description>
          <SearchableSelect>
            <SearchInput
              type="text"
              placeholder="生徒名で検索..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value)
                setShowStudentList(true)
              }}
              onFocus={() => setShowStudentList(true)}
              disabled={isSubmitting}
            />
            {showStudentList && filteredStudents.length > 0 && (
              <OptionsList>
                {filteredStudents.map((student) => (
                  <OptionItem
                    key={student.id}
                    $selected={selectedStudentId === student.id}
                    onClick={() => {
                      setValue('studentId', student.id)
                      setStudentSearch(student.name)
                      setShowStudentList(false)
                    }}
                  >
                    {student.name} ({student.grade}年生)
                  </OptionItem>
                ))}
              </OptionsList>
            )}
          </SearchableSelect>
          {errors.studentId && <ErrorText>{errors.studentId.message}</ErrorText>}
        </FormGroup>

        {/* 科目選択 */}
        <FormGroup>
          <Label htmlFor="subject">科目 *</Label>
          <Description>
            {selectedStudent?.subjects && selectedStudent.subjects.length > 0
              ? '生徒の受講科目から選択してください'
              : '授業の科目を入力してください'}
          </Description>
          {selectedStudent?.subjects && selectedStudent.subjects.length > 0 ? (
            <Select {...register('subject')} disabled={isSubmitting}>
              <option value="">選択してください</option>
              {selectedStudent.subjects.map((sub) => (
                <option key={sub.subject} value={sub.subject}>
                  {sub.subject}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              type="text"
              {...register('subject')}
              placeholder="例: 数学"
              disabled={isSubmitting}
            />
          )}
          {errors.subject && <ErrorText>{errors.subject.message}</ErrorText>}
        </FormGroup>

        {/* 開始日 */}
        <FormGroup>
          <Label htmlFor="startDate">開始日 *</Label>
          <Description>パターンの適用を開始する日付を指定してください</Description>
          <Input type="date" {...register('startDate')} disabled={isSubmitting} />
          {errors.startDate && <ErrorText>{errors.startDate.message}</ErrorText>}
        </FormGroup>

        {/* 終了日 */}
        <FormGroup>
          <Label htmlFor="endDate">終了日（任意）</Label>
          <Description>
            パターンの適用を終了する日付を指定してください。無期限の場合は空欄のままにしてください。
          </Description>
          <Input type="date" {...register('endDate')} disabled={isSubmitting} />
          {errors.endDate && <ErrorText>{errors.endDate.message}</ErrorText>}
        </FormGroup>

        <ButtonGroup>
          <Button type="button" onClick={onCancel} variant="secondary" disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? '登録中...' : initialData ? '更新' : '登録'}
          </Button>
        </ButtonGroup>
      </FormContainer>
    </form>
  )
}
