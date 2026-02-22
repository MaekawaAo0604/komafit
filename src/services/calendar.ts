/**
 * Calendar Service (Date-Based Scheduling)
 *
 * This service provides operations for fetching monthly calendar data
 * that combines teacher availability and student assignments.
 */

import { supabase } from '@/lib/supabase'
import type {
  BoardSlot,
  MonthlyCalendarData,
  TimeSlot,
  ExtendedMonthlyCalendarData,
} from '@/types/entities'
import { getAllBoardSlots } from '@/services/slots'

/**
 * Get monthly calendar data
 *
 * This function fetches all calendar data for a specific month,
 * including teacher availability and student assignments.
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns Array of calendar data rows
 */
export async function getMonthlyCalendar(
  year: number,
  month: number
): Promise<MonthlyCalendarData[]> {
  const { data, error } = await supabase.rpc('get_monthly_calendar', {
    p_year: year,
    p_month: month,
  })

  if (error) {
    throw new Error(`Failed to fetch monthly calendar: ${error.message}`)
  }

  return data.map(mapCalendarDataFromDb)
}

/**
 * Get monthly calendar data with recurring patterns integrated
 *
 * This function fetches calendar data with recurring assignment patterns
 * automatically expanded and merged with individual assignments and exceptions.
 * Priority: exceptions > individual assignments > patterns
 *
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @param teacherId - Optional teacher ID filter
 * @returns Array of extended calendar data rows with data source information
 */
export async function getMonthlyCalendarWithPatterns(
  year: number,
  month: number,
  teacherId?: string
): Promise<ExtendedMonthlyCalendarData[]> {
  const { data, error } = await supabase.rpc('get_monthly_calendar_with_patterns', {
    p_year: year,
    p_month: month,
    p_teacher_id: teacherId ?? null,
  })

  if (error) {
    if (error.message.includes('PERMISSION_DENIED')) {
      throw new Error('権限がありません')
    } else if (error.message.includes('AUTHENTICATION_REQUIRED')) {
      throw new Error('ログインが必要です')
    }
    throw new Error(`パターン統合カレンダーの取得に失敗しました: ${error.message}`)
  }

  return data.map(mapExtendedCalendarDataFromDb)
}

/**
 * Get all time slots
 *
 * @returns List of active time slots
 */
export async function getTimeSlots(): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('time_slots')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch time slots: ${error.message}`)
  }

  return data.map(mapTimeSlotFromDb)
}

/**
 * Create a new time slot
 *
 * @param data - Time slot data
 * @returns Created time slot
 */
export async function createTimeSlot(data: {
  id: string
  startTime: string
  endTime: string
  displayOrder: number
}): Promise<TimeSlot> {
  const { data: result, error } = await supabase
    .from('time_slots')
    .insert({
      id: data.id,
      start_time: data.startTime,
      end_time: data.endTime,
      display_order: data.displayOrder,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create time slot: ${error.message}`)
  }

  return mapTimeSlotFromDb(result)
}

/**
 * Update a time slot
 *
 * @param id - Time slot ID
 * @param data - Updated time slot data
 * @returns Updated time slot
 */
export async function updateTimeSlot(
  id: string,
  data: Partial<{
    startTime: string
    endTime: string
    displayOrder: number
    isActive: boolean
  }>
): Promise<TimeSlot> {
  const updateData: any = {}

  if (data.startTime !== undefined) updateData.start_time = data.startTime
  if (data.endTime !== undefined) updateData.end_time = data.endTime
  if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder
  if (data.isActive !== undefined) updateData.is_active = data.isActive

  const { data: result, error } = await supabase
    .from('time_slots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update time slot: ${error.message}`)
  }

  return mapTimeSlotFromDb(result)
}

/**
 * Delete (deactivate) a time slot
 *
 * @param id - Time slot ID
 */
export async function deleteTimeSlot(id: string): Promise<void> {
  const { error } = await supabase
    .from('time_slots')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete time slot: ${error.message}`)
  }
}

/**
 * Get weekly board data from V2 calendar system
 *
 * Fetches monthly calendar data and transforms it into BoardSlot[] format
 * for a specific week, enabling week-based navigation in the assignment board.
 *
 * @param weekStartDate - Monday of the target week
 * @returns BoardSlot[] for all day×koma combinations
 */
export async function getWeeklyBoardData(_weekStartDate: Date): Promise<BoardSlot[]> {
  // Use legacy tables (slot_teacher + slot_students) which are the source of truth
  // for the assignment board. V2 calendar data does not include legacy assignments.
  return getAllBoardSlots()
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database calendar data to domain MonthlyCalendarData entity
 */
function mapCalendarDataFromDb(dbData: any): MonthlyCalendarData {
  return {
    date: dbData.date,
    timeSlotId: dbData.time_slot_id,
    timeSlotOrder: dbData.time_slot_order,
    teacherId: dbData.teacher_id,
    teacherName: dbData.teacher_name,
    isAvailable: dbData.is_available,
    studentId: dbData.student_id,
    studentName: dbData.student_name,
    studentGrade: dbData.student_grade,
    studentRequiresOneOnOne: dbData.student_requires_one_on_one,
    studentLessonLabel: dbData.student_lesson_label,
    subject: dbData.subject,
    position: dbData.position,
  }
}

/**
 * Map database time slot record to domain TimeSlot entity
 */
function mapTimeSlotFromDb(dbTimeSlot: any): TimeSlot {
  return {
    id: dbTimeSlot.id,
    startTime: dbTimeSlot.start_time,
    endTime: dbTimeSlot.end_time,
    displayOrder: dbTimeSlot.display_order,
    isActive: dbTimeSlot.is_active,
    createdAt: dbTimeSlot.created_at,
    updatedAt: dbTimeSlot.updated_at,
  }
}

/**
 * Map database extended calendar data to domain ExtendedMonthlyCalendarData entity
 */
function mapExtendedCalendarDataFromDb(dbData: any): ExtendedMonthlyCalendarData {
  return {
    // Base MonthlyCalendarData fields
    date: dbData.date,
    timeSlotId: dbData.time_slot_id,
    timeSlotOrder: dbData.time_slot_order || 0, // RPC doesn't return this, default to 0
    teacherId: dbData.teacher_id,
    teacherName: dbData.teacher_name,
    isAvailable: dbData.is_available,
    studentId: dbData.student_id,
    studentName: dbData.student_name,
    studentGrade: dbData.student_grade,
    studentRequiresOneOnOne: null, // RPC doesn't return this
    studentLessonLabel: null, // RPC doesn't return this
    subject: dbData.subject,
    position: dbData.position,
    // Extended fields
    dataSource: dbData.data_source,
    patternId: dbData.pattern_id,
    exceptionType: dbData.exception_type,
  }
}
