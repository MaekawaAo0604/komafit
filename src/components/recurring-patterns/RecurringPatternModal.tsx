/**
 * Recurring Pattern Modal Component
 *
 * Modal dialog for creating and editing recurring assignment patterns.
 * Wraps RecurringPatternForm with modal UI and handles form submission.
 */

import { Modal } from '@/components/ui/Modal'
import { RecurringPatternForm } from './RecurringPatternForm'
import {
  createRecurringAssignment,
  updateRecurringAssignment,
} from '@/services/recurringAssignments'
import type {
  RecurringAssignment,
  RecurringAssignmentInput,
  Teacher,
  Student,
  TimeSlot,
} from '@/types/entities'

interface RecurringPatternModalProps {
  isOpen: boolean
  pattern?: RecurringAssignment
  teacherId?: string
  teachers: Teacher[]
  students: Student[]
  timeSlots: TimeSlot[]
  onClose: () => void
  onSuccess?: (pattern: RecurringAssignment) => void
}

export function RecurringPatternModal({
  isOpen,
  pattern,
  teacherId,
  teachers,
  students,
  timeSlots,
  onClose,
  onSuccess,
}: RecurringPatternModalProps) {
  const isEditMode = !!pattern

  const handleSubmit = async (data: RecurringAssignmentInput) => {
    try {
      let result: RecurringAssignment

      if (isEditMode && pattern) {
        // 更新モード
        result = await updateRecurringAssignment(pattern.id, data)
      } else {
        // 新規作成モード
        result = await createRecurringAssignment(data)
      }

      // 成功時にコールバックを呼び出してモーダルを閉じる
      onSuccess?.(result)
      onClose()
    } catch (error) {
      // エラーは RecurringPatternForm で処理されるため、ここでは再スロー
      throw error
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? '定期授業パターン編集' : '定期授業パターン登録'}
      size="lg"
    >
      <Modal.Body>
        <RecurringPatternForm
          initialData={pattern}
          teacherId={teacherId}
          teachers={teachers}
          students={students}
          timeSlots={timeSlots}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </Modal.Body>
    </Modal>
  )
}
