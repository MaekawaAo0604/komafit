/**
 * Assignment Exceptions Service
 *
 * This service provides operations for managing exceptions to recurring assignment patterns.
 * Allows marking specific dates as cancelled or modified.
 */

import { supabase } from '@/lib/supabase'
import type { AssignmentException } from '@/types/entities'

/**
 * Create an exception for a recurring pattern on a specific date
 *
 * @param patternId - Recurring pattern ID
 * @param date - Date for the exception (YYYY-MM-DD)
 * @param type - Exception type ('cancelled' or 'modified')
 * @returns Created exception
 */
export async function createException(
  patternId: string,
  date: string,
  type: 'cancelled' | 'modified'
): Promise<AssignmentException> {
  const params = {
    p_pattern_id: patternId,
    p_date: date,
    p_exception_type: type,
  }

  const { data: result, error } = await supabase.rpc(
    'create_assignment_exception',
    params
  )

  if (error) {
    // エラーコードに基づいて適切なエラーメッセージを生成
    if (error.message.includes('RESOURCE_NOT_FOUND')) {
      throw new Error('指定されたパターンが見つかりません')
    } else if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    } else if (error.message.includes('VALIDATION_ERROR')) {
      throw new Error('入力値が無効です: ' + error.message)
    } else if (error.message.includes('DUPLICATE_EXCEPTION')) {
      throw new Error('この日付の例外処理は既に登録されています')
    } else if (error.message.includes('AUTHENTICATION_REQUIRED')) {
      throw new Error('ログインが必要です')
    }
    throw new Error(`例外処理の作成に失敗しました: ${error.message}`)
  }

  return mapAssignmentExceptionFromDb(result)
}

/**
 * Delete an exception (restore pattern for that date)
 *
 * @param exceptionId - Exception ID
 */
export async function deleteException(exceptionId: string): Promise<void> {
  const { error } = await supabase
    .from('assignment_exceptions')
    .delete()
    .eq('id', exceptionId)

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('指定された例外処理が見つかりません')
    } else if (error.message.includes('permission')) {
      throw new Error('権限がありません')
    }
    throw new Error(`例外処理の削除に失敗しました: ${error.message}`)
  }
}

/**
 * List exceptions for a recurring pattern
 *
 * @param patternId - Recurring pattern ID
 * @returns List of exceptions
 */
export async function listExceptions(patternId: string): Promise<AssignmentException[]> {
  const { data, error } = await supabase
    .from('assignment_exceptions')
    .select('*, pattern:recurring_assignments(*)')
    .eq('pattern_id', patternId)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`例外処理一覧の取得に失敗しました: ${error.message}`)
  }

  return data.map(mapAssignmentExceptionFromDb)
}

/**
 * List exceptions for a date range
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param patternId - Optional pattern ID filter
 * @returns List of exceptions
 */
export async function listExceptionsByDateRange(
  startDate: string,
  endDate: string,
  patternId?: string
): Promise<AssignmentException[]> {
  let query = supabase
    .from('assignment_exceptions')
    .select('*, pattern:recurring_assignments(*)')
    .gte('date', startDate)
    .lte('date', endDate)

  if (patternId) {
    query = query.eq('pattern_id', patternId)
  }

  const { data, error } = await query.order('date', { ascending: true })

  if (error) {
    throw new Error(`例外処理一覧の取得に失敗しました: ${error.message}`)
  }

  return data.map(mapAssignmentExceptionFromDb)
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database assignment exception record to domain AssignmentException entity
 */
function mapAssignmentExceptionFromDb(dbException: any): AssignmentException {
  return {
    id: dbException.id,
    patternId: dbException.pattern_id,
    date: dbException.date,
    exceptionType: dbException.exception_type,
    createdAt: dbException.created_at,
    createdBy: dbException.created_by,
    // Include related data if present
    pattern: dbException.pattern,
    createdByUser: dbException.created_by_user || dbException.createdByUser,
  }
}
