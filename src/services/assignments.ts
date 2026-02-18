/**
 * Assignments Service (Date-Based Scheduling)
 *
 * This service provides operations for date-based student assignments.
 * It handles assigning students to specific dates and time slots with teachers.
 */

import { supabase } from '@/lib/supabase'
import type { Assignment } from '@/types/entities'

/**
 * Assign a student to a date/time slot with a teacher
 *
 * @param data - Assignment data
 * @returns Created assignment
 */
export async function assignStudent(data: {
  date: string
  timeSlotId: string
  teacherId: string
  studentId: string
  subject: string
}): Promise<Assignment> {
  console.log('🔍 assignStudent called with:', data)

  const params = {
    p_date: data.date,
    p_time_slot_id: data.timeSlotId,
    p_teacher_id: data.teacherId,
    p_student_id: data.studentId,
    p_subject: data.subject,
  }

  console.log('📤 Calling assign_student_v2 with params:', params)

  const { data: result, error } = await supabase.rpc('assign_student_v2', params)

  if (error) {
    console.error('❌ RPC Error:', error)
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`Failed to assign student: ${error.message}`)
  }

  console.log('✅ Assignment created:', result)
  return mapAssignmentFromDb(result)
}

/**
 * Unassign a student (remove assignment)
 *
 * @param assignmentId - Assignment ID
 */
export async function unassignStudent(assignmentId: string): Promise<void> {
  const { error } = await supabase.rpc('unassign_student_v2', {
    p_assignment_id: assignmentId,
  })

  if (error) {
    throw new Error(`Failed to unassign student: ${error.message}`)
  }
}

/**
 * Get assignments for a specific date range
 *
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns List of assignments
 */
export async function getAssignments(
  startDate: string,
  endDate: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, teacher:teachers(*), student:students(*), time_slot:time_slots(*)')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slot_id', { ascending: true })
    .order('position', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch assignments: ${error.message}`)
  }

  return data.map(mapAssignmentFromDb)
}

/**
 * Get assignments for a specific teacher
 *
 * @param teacherId - Teacher ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns List of assignments
 */
export async function getTeacherAssignments(
  teacherId: string,
  startDate: string,
  endDate: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, student:students(*), time_slot:time_slots(*)')
    .eq('teacher_id', teacherId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slot_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch teacher assignments: ${error.message}`)
  }

  return data.map(mapAssignmentFromDb)
}

/**
 * Get assignments for a specific student
 *
 * @param studentId - Student ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns List of assignments
 */
export async function getStudentAssignments(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, teacher:teachers(*), time_slot:time_slots(*)')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .order('time_slot_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch student assignments: ${error.message}`)
  }

  return data.map(mapAssignmentFromDb)
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database assignment record to domain Assignment entity
 */
function mapAssignmentFromDb(dbAssignment: any): Assignment {
  return {
    id: dbAssignment.id,
    date: dbAssignment.date,
    timeSlotId: dbAssignment.time_slot_id,
    teacherId: dbAssignment.teacher_id,
    studentId: dbAssignment.student_id,
    subject: dbAssignment.subject,
    position: dbAssignment.position,
    assignedBy: dbAssignment.assigned_by,
    assignedAt: dbAssignment.assigned_at,
    createdAt: dbAssignment.created_at,
    updatedAt: dbAssignment.updated_at,
    // Include related data if present
    teacher: dbAssignment.teacher,
    student: dbAssignment.student,
    timeSlot: dbAssignment.time_slot,
  }
}
