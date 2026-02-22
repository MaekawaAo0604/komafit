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
  PositionData,
  SlotStudent,
  SlotTeacher,
} from '@/types/entities'
import { getAllSlots } from '@/services/slots'

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
 * Get weekly board data combining legacy teacher positions with V2 student assignments
 *
 * Teacher positions come from slot_teacher (template/legacy).
 * Student assignments come from assignments table (date-based/V2).
 * This enables week-based navigation where each week can have different students.
 *
 * @param weekStartDate - Monday of the target week
 * @returns BoardSlot[] for all day×koma combinations
 */
export async function getWeeklyBoardData(weekStartDate: Date): Promise<BoardSlot[]> {
  const weekEnd = new Date(weekStartDate)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const slots = await getAllSlots()

  const { data: slotTeachersRaw } = await supabase
    .from('slot_teacher')
    .select('*, teachers(*), users(*)')
  const slotTeachers = (slotTeachersRaw ?? []) as any[]

  const weekStartStr = weekStartDate.toISOString().split('T')[0]
  const weekEndStr = weekEnd.toISOString().split('T')[0]
  const { data: weekAssignmentsRaw } = await supabase
    .from('assignments')
    .select('*, students(*)')
    .gte('date', weekStartStr)
    .lte('date', weekEndStr)
    .order('position', { ascending: true })
  const weekAssignments = (weekAssignmentsRaw ?? []) as any[]

  const dayOffsets: Record<string, number> = {
    MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6,
  }

  return slots.map(slot => {
    const offset = dayOffsets[slot.day] ?? 0
    const specificDate = new Date(weekStartDate)
    specificDate.setDate(weekStartDate.getDate() + offset)
    const dateStr = specificDate.toISOString().split('T')[0]

    const maxPositions = slot.komaCode === '0' || slot.komaCode === '1' ? 6 : 10
    const positions: PositionData[] = []

    for (let pos = 1; pos <= maxPositions; pos++) {
      const td = slotTeachers?.find(st => st.slot_id === slot.id && st.position === pos)

      const slotAssignments = td?.teacher_id
        ? (weekAssignments?.filter(
            a =>
              a.date === dateStr &&
              a.time_slot_id === slot.komaCode &&
              a.teacher_id === td.teacher_id
          ) ?? [])
        : []

      const students: SlotStudent[] = slotAssignments.map(a => ({
        slotId: slot.id,
        position: pos,
        seat: a.position as 1 | 2,
        assignmentId: a.id,
        studentId: a.student_id,
        subject: a.subject ?? '',
        grade: a.students?.grade ?? 0,
        student: a.students
          ? {
              id: a.students.id,
              name: a.students.name,
              grade: a.students.grade,
              active: a.students.active,
              requiresOneOnOne: a.students.requires_one_on_one ?? false,
              lessonLabel: a.students.lesson_label ?? null,
              createdAt: a.students.created_at,
              updatedAt: a.students.updated_at,
            }
          : undefined,
      }))

      const teacher: SlotTeacher | null = td?.teacher_id
        ? {
            slotId: slot.id,
            position: pos,
            teacherId: td.teacher_id,
            assignedBy: td.assigned_by,
            assignedAt: td.assigned_at,
            teacher: td.teachers
              ? {
                  id: td.teachers.id,
                  userId: td.teachers.user_id,
                  name: td.teachers.name,
                  active: td.teachers.active,
                  capWeekSlots: td.teachers.cap_week_slots,
                  capStudents: td.teachers.cap_students,
                  allowPair: td.teachers.allow_pair,
                  createdAt: td.teachers.created_at,
                  updatedAt: td.teachers.updated_at,
                }
              : undefined,
            assignedByUser: td.users
              ? {
                  id: td.users.id,
                  email: td.users.email,
                  name: td.users.name,
                  role: td.users.role,
                  active: td.users.active,
                  createdAt: td.users.created_at,
                  updatedAt: td.users.updated_at,
                }
              : undefined,
          }
        : null

      positions.push({ position: pos, teacher, students })
    }

    return { ...slot, positions }
  })
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
