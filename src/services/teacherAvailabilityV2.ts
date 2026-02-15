/**
 * Teacher Availability V2 Service (Date-Based Scheduling)
 *
 * This service provides operations for date-based teacher availability.
 * Teachers can set their availability for specific dates and time slots.
 */

import { supabase } from '@/lib/supabase'
import type { TeacherAvailabilityV2 } from '@/types/entities'

/**
 * Set teacher availability for a specific date and time slot
 *
 * @param data - Availability data
 * @returns Updated availability record
 */
export async function setTeacherAvailability(data: {
  teacherId: string
  date: string
  timeSlotId: string
  isAvailable: boolean
}): Promise<TeacherAvailabilityV2> {
  const { data: result, error } = await supabase.rpc('set_teacher_availability_v2', {
    p_teacher_id: data.teacherId,
    p_date: data.date,
    p_time_slot_id: data.timeSlotId,
    p_is_available: data.isAvailable,
  })

  if (error) {
    throw new Error(`Failed to set teacher availability: ${error.message}`)
  }

  return mapAvailabilityFromDb(result)
}

/**
 * Batch set teacher availability for multiple dates/time slots
 *
 * @param teacherId - Teacher ID
 * @param availability - Array of availability settings
 */
export async function batchSetTeacherAvailability(
  teacherId: string,
  availability: Array<{
    date: string
    timeSlotId: string
    isAvailable: boolean
  }>
): Promise<TeacherAvailabilityV2[]> {
  const results: TeacherAvailabilityV2[] = []

  // Execute in parallel for better performance
  const promises = availability.map((item) =>
    setTeacherAvailability({
      teacherId,
      date: item.date,
      timeSlotId: item.timeSlotId,
      isAvailable: item.isAvailable,
    })
  )

  const settled = await Promise.allSettled(promises)

  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value)
    } else {
      console.error(
        `Failed to set availability for ${availability[index].date} ${availability[index].timeSlotId}:`,
        result.reason
      )
    }
  })

  return results
}

/**
 * Get teacher availability for a date range
 *
 * @param teacherId - Teacher ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns List of availability records
 */
export async function getTeacherAvailability(
  teacherId: string,
  startDate: string,
  endDate: string
): Promise<TeacherAvailabilityV2[]> {
  const { data, error } = await supabase
    .from('teacher_availability_v2')
    .select('*, teacher:teachers(*), time_slot:time_slots(*)')
    .eq('teacher_id', teacherId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slot_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch teacher availability: ${error.message}`)
  }

  return data.map(mapAvailabilityFromDb)
}

/**
 * Get all teachers' availability for a date range
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns List of availability records
 */
export async function getAllTeachersAvailability(
  startDate: string,
  endDate: string
): Promise<TeacherAvailabilityV2[]> {
  const { data, error } = await supabase
    .from('teacher_availability_v2')
    .select('*, teacher:teachers(*), time_slot:time_slots(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('teacher_id', { ascending: true })
    .order('date', { ascending: true })
    .order('time_slot_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch all teachers availability: ${error.message}`)
  }

  return data.map(mapAvailabilityFromDb)
}

/**
 * Delete teacher availability for a specific date and time slot
 *
 * @param teacherId - Teacher ID
 * @param date - Date (YYYY-MM-DD)
 * @param timeSlotId - Time slot ID
 */
export async function deleteTeacherAvailability(
  teacherId: string,
  date: string,
  timeSlotId: string
): Promise<void> {
  const { error } = await supabase
    .from('teacher_availability_v2')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('date', date)
    .eq('time_slot_id', timeSlotId)

  if (error) {
    throw new Error(`Failed to delete teacher availability: ${error.message}`)
  }
}

/**
 * Batch set availability for all time slots in a date range
 *
 * @param teacherId - Teacher ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param isAvailable - Availability status
 * @returns Result with success and error counts
 */
export async function batchSetWeekAvailability(
  teacherId: string,
  startDate: string,
  endDate: string,
  isAvailable: boolean
): Promise<{ successCount: number; errorCount: number }> {
  const { data, error } = await supabase.rpc('batch_set_week_availability', {
    p_teacher_id: teacherId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_is_available: isAvailable,
  })

  if (error) {
    throw new Error(`Failed to batch set availability: ${error.message}`)
  }

  return {
    successCount: data[0].success_count,
    errorCount: data[0].error_count,
  }
}

/**
 * Copy availability pattern from one week to another
 *
 * @param teacherId - Teacher ID
 * @param sourceStartDate - Source week start date (YYYY-MM-DD)
 * @param sourceEndDate - Source week end date (YYYY-MM-DD)
 * @param targetStartDate - Target week start date (YYYY-MM-DD)
 * @returns Result with success and error counts
 */
export async function copyWeekAvailability(
  teacherId: string,
  sourceStartDate: string,
  sourceEndDate: string,
  targetStartDate: string
): Promise<{ successCount: number; errorCount: number }> {
  const { data, error } = await supabase.rpc('copy_week_availability', {
    p_teacher_id: teacherId,
    p_source_start_date: sourceStartDate,
    p_source_end_date: sourceEndDate,
    p_target_start_date: targetStartDate,
  })

  if (error) {
    throw new Error(`Failed to copy week availability: ${error.message}`)
  }

  return {
    successCount: data[0].success_count,
    errorCount: data[0].error_count,
  }
}

/**
 * Clear all availability for a date range (excluding slots with assignments)
 *
 * @param teacherId - Teacher ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Number of deleted records
 */
export async function clearWeekAvailability(
  teacherId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const { data, error } = await supabase.rpc('clear_week_availability', {
    p_teacher_id: teacherId,
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) {
    throw new Error(`Failed to clear week availability: ${error.message}`)
  }

  return data[0].deleted_count
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database availability record to domain TeacherAvailabilityV2 entity
 */
function mapAvailabilityFromDb(dbAvailability: any): TeacherAvailabilityV2 {
  return {
    id: dbAvailability.id,
    teacherId: dbAvailability.teacher_id,
    date: dbAvailability.date,
    timeSlotId: dbAvailability.time_slot_id,
    isAvailable: dbAvailability.is_available,
    createdAt: dbAvailability.created_at,
    updatedAt: dbAvailability.updated_at,
    // Include related data if present
    teacher: dbAvailability.teacher,
    timeSlot: dbAvailability.time_slot,
  }
}
