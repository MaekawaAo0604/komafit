/**
 * Recurring Assignments Service
 *
 * This service provides operations for managing recurring assignment patterns.
 * Teachers can register weekly lesson patterns that automatically expand to monthly calendars.
 */

import { supabase } from '@/lib/supabase'
import type { RecurringAssignment, RecurringAssignmentInput } from '@/types/entities'

/**
 * Create a new recurring assignment pattern
 *
 * @param data - Pattern data
 * @returns Created pattern
 */
export async function createRecurringAssignment(
  data: RecurringAssignmentInput
): Promise<RecurringAssignment> {
  const params = {
    p_teacher_id: data.teacherId,
    p_day_of_week: data.dayOfWeek,
    p_time_slot_id: data.timeSlotId,
    p_student_id: data.studentId,
    p_subject: data.subject,
    p_start_date: data.startDate,
    p_end_date: data.endDate ?? null,
    p_active: data.active ?? true,
  }

  const { data: result, error } = await supabase.rpc(
    'create_recurring_assignment',
    params
  )

  if (error) {
    // エラーコードに基づいて適切なエラーメッセージを生成
    if (error.message.includes('DUPLICATE_PATTERN')) {
      throw new Error('この組み合わせは既に登録されています')
    } else if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    } else if (error.message.includes('VALIDATION_ERROR')) {
      throw new Error('入力値が無効です: ' + error.message)
    } else if (error.message.includes('AUTHENTICATION_REQUIRED')) {
      throw new Error('ログインが必要です')
    }
    throw new Error(`パターンの作成に失敗しました: ${error.message}`)
  }

  return mapRecurringAssignmentFromDb(result)
}

/**
 * Update an existing recurring assignment pattern
 *
 * @param patternId - Pattern ID
 * @param data - Partial pattern data to update
 * @returns Updated pattern
 */
export async function updateRecurringAssignment(
  patternId: string,
  data: Partial<RecurringAssignmentInput>
): Promise<RecurringAssignment> {
  const params = {
    p_pattern_id: patternId,
    p_student_id: data.studentId ?? null,
    p_subject: data.subject ?? null,
    p_end_date: data.endDate !== undefined ? data.endDate : null,
    p_active: data.active ?? null,
  }

  const { data: result, error } = await supabase.rpc(
    'update_recurring_assignment',
    params
  )

  if (error) {
    if (error.message.includes('RESOURCE_NOT_FOUND')) {
      throw new Error('指定されたパターンが見つかりません')
    } else if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    } else if (error.message.includes('VALIDATION_ERROR')) {
      throw new Error('入力値が無効です: ' + error.message)
    }
    throw new Error(`パターンの更新に失敗しました: ${error.message}`)
  }

  return mapRecurringAssignmentFromDb(result)
}

/**
 * Delete a recurring assignment pattern
 *
 * @param patternId - Pattern ID
 */
export async function deleteRecurringAssignment(patternId: string): Promise<void> {
  const { data: result, error } = await supabase.rpc('delete_recurring_assignment', {
    p_pattern_id: patternId,
  })

  if (error) {
    if (error.message.includes('RESOURCE_NOT_FOUND')) {
      throw new Error('指定されたパターンが見つかりません')
    } else if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    }
    throw new Error(`パターンの削除に失敗しました: ${error.message}`)
  }

  // result should be true on success
  if (!result) {
    throw new Error('パターンの削除に失敗しました')
  }
}

/**
 * List recurring assignment patterns
 *
 * @param teacherId - Optional teacher ID filter
 * @param activeOnly - Only return active patterns (default: true)
 * @returns List of patterns
 */
export async function listRecurringAssignments(
  teacherId?: string,
  activeOnly: boolean = true
): Promise<RecurringAssignment[]> {
  const { data, error } = await supabase.rpc('list_recurring_assignments', {
    p_teacher_id: teacherId ?? null,
    p_active_only: activeOnly,
  })

  if (error) {
    if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    }
    throw new Error(`パターン一覧の取得に失敗しました: ${error.message}`)
  }

  return data.map(mapRecurringAssignmentFromDb)
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database recurring assignment record to domain RecurringAssignment entity
 */
function mapRecurringAssignmentFromDb(dbPattern: any): RecurringAssignment {
  return {
    id: dbPattern.id,
    teacherId: dbPattern.teacher_id,
    dayOfWeek: dbPattern.day_of_week,
    timeSlotId: dbPattern.time_slot_id,
    studentId: dbPattern.student_id,
    subject: dbPattern.subject,
    startDate: dbPattern.start_date,
    endDate: dbPattern.end_date,
    active: dbPattern.active,
    createdAt: dbPattern.created_at,
    updatedAt: dbPattern.updated_at,
    createdBy: dbPattern.created_by,
    // Include related data if present
    teacher: dbPattern.teacher,
    student: dbPattern.student,
    timeSlot: dbPattern.time_slot || dbPattern.timeSlot,
    createdByUser: dbPattern.created_by_user || dbPattern.createdByUser,
  }
}
