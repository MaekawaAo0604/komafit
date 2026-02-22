/**
 * Slots Service
 *
 * This service provides operations for slots, student assignments,
 * and teacher assignments. It also provides RPC calls for assignment operations.
 *
 * Requirements: REQ-5（授業枠管理）、REQ-10（講師割当の確定）、REQ-11（割当の変更・削除）
 */

import { supabase } from '@/lib/supabase'
import type {
  Slot,
  SlotStudent,
  SlotTeacher,
  BoardSlot,
  PositionData,
  DayOfWeek,
} from '@/types/entities'

/**
 * Get all slots
 *
 * @returns List of all slots (35 slots: 7 days × 5 koma)
 */
export async function getAllSlots(): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch slots: ${error.message}`)
  }

  return data.map(mapSlotFromDb)
}

/**
 * Get slot by ID
 *
 * @param id - Slot ID (e.g., "MON-0", "TUE-A")
 * @param options - Include related data options
 * @returns Slot with optional related data
 */
export async function getSlot(
  id: string,
  options?: {
    includeStudents?: boolean
    includeTeacher?: boolean
  }
): Promise<Slot & { students?: SlotStudent[]; teacher?: SlotTeacher | null }> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch slot: ${error.message}`)
  }

  const slot = mapSlotFromDb(data)

  // Add related data if requested
  if (options?.includeStudents || options?.includeTeacher) {
    const result: any = { ...slot }

    if (options.includeStudents) {
      const students = await getSlotStudents(id)
      result.students = students
    }

    if (options.includeTeacher) {
      const { data: teacherData } = await supabase
        .from('slot_teacher')
        .select('*, teachers(*), users(*)')
        .eq('slot_id', id)
        .maybeSingle()

      result.teacher = teacherData ? mapSlotTeacherFromDb(teacherData) : null
    }

    return result
  }

  return slot
}

/**
 * Get slots by day
 *
 * @param day - Day of week
 * @returns List of slots for the day
 */
export async function getSlotsByDay(day: DayOfWeek): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('*')
    .eq('day', day)
    .order('id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch slots by day: ${error.message}`)
  }

  return data.map(mapSlotFromDb)
}

// ============================================================================
// Board Slots (Slot + Students + Teacher)
// ============================================================================

/**
 * Get all board slots with students and teachers (position-based)
 *
 * This is the main function for the assignment board UI.
 *
 * @returns List of board slots with complete data
 */
export async function getAllBoardSlots(): Promise<BoardSlot[]> {
  // Fetch all slots
  const slots = await getAllSlots()

  // Fetch all slot students
  const { data: slotStudents, error: studentsError } = await supabase
    .from('slot_students')
    .select('*, students(*)')
    .order('slot_id', { ascending: true })
    .order('position', { ascending: true })
    .order('seat', { ascending: true })

  if (studentsError) {
    throw new Error(`Failed to fetch slot students: ${studentsError.message}`)
  }

  // Fetch all slot teachers
  const { data: slotTeachers, error: teachersError } = await supabase
    .from('slot_teacher')
    .select('*, teachers(*), users(*)')
    .order('slot_id', { ascending: true })
    .order('position', { ascending: true })

  if (teachersError) {
    throw new Error(`Failed to fetch slot teachers: ${teachersError.message}`)
  }

  // Debug logging
  console.log('🔍 [slots.ts] Fetched slot teachers:', {
    count: slotTeachers?.length || 0,
    sample: slotTeachers?.[0] || null,
    teachersWithUserId: slotTeachers?.filter(st => st.teachers?.user_id).length || 0,
    teachersWithoutUserId: slotTeachers?.filter(st => st.teachers && !st.teachers.user_id).length || 0
  })

  // Build board slots with positions
  return slots.map(slot => {
    // Get max positions for this slot
    const maxPositions = slot.komaCode === '0' || slot.komaCode === '1' ? 6 : 10
    
    // Build position data
    const positions: PositionData[] = []
    for (let pos = 1; pos <= maxPositions; pos++) {
      const teacherData = slotTeachers?.find(
        st => st.slot_id === slot.id && st.position === pos
      )
      const teacher = teacherData ? mapSlotTeacherFromDb(teacherData) : null
      
      const students =
        slotStudents
          ?.filter(ss => ss.slot_id === slot.id && ss.position === pos)
          .map(mapSlotStudentFromDb) || []

      positions.push({
        position: pos,
        teacher,
        students,
      })
    }

    return {
      ...slot,
      positions,
    }
  })
}

/**
 * Get board slot by ID (position-based)
 *
 * @param slotId - Slot ID
 * @returns Board slot with complete data
 */
export async function getBoardSlot(slotId: string): Promise<BoardSlot> {
  const slot = await getSlot(slotId)

  // Fetch slot students
  const { data: slotStudents, error: studentsError } = await supabase
    .from('slot_students')
    .select('*, students(*)')
    .eq('slot_id', slotId)
    .order('position', { ascending: true })
    .order('seat', { ascending: true })

  if (studentsError) {
    throw new Error(`Failed to fetch slot students: ${studentsError.message}`)
  }

  // Fetch slot teachers
  const { data: slotTeachers, error: teachersError } = await supabase
    .from('slot_teacher')
    .select('*, teachers(*), users(*)')
    .eq('slot_id', slotId)
    .order('position', { ascending: true })

  if (teachersError) {
    throw new Error(`Failed to fetch slot teachers: ${teachersError.message}`)
  }

  // Build position data
  const maxPositions = slot.komaCode === '0' || slot.komaCode === '1' ? 6 : 10
  const positions: PositionData[] = []
  
  for (let pos = 1; pos <= maxPositions; pos++) {
    const teacherData = slotTeachers?.find(st => st.position === pos)
    const teacher = teacherData ? mapSlotTeacherFromDb(teacherData) : null
    
    const students =
      slotStudents
        ?.filter(ss => ss.position === pos)
        .map(mapSlotStudentFromDb) || []

    positions.push({
      position: pos,
      teacher,
      students,
    })
  }

  return {
    ...slot,
    positions,
  }
}

// ============================================================================
// Student Assignment (RPC Calls)
// ============================================================================

/**
 * Assign student to slot position (RPC)
 *
 * @param slotId - Slot ID
 * @param position - Position number (1-10)
 * @param seat - Seat number (1 or 2)
 * @param studentId - Student ID
 * @param subject - Subject
 * @param grade - Grade (snapshot)
 */
export async function assignStudentToSlotPosition(
  slotId: string,
  position: number,
  seat: 1 | 2,
  studentId: string,
  subject: string,
  grade: number
) {
  const { data, error } = await supabase.rpc('assign_student', {
    p_slot_id: slotId,
    p_position: position,
    p_seat: seat,
    p_student_id: studentId,
    p_subject: subject,
    p_grade: grade,
  })

  if (error) {
    throw new Error(`Failed to assign student to slot: ${error.message}`)
  }

  return data?.[0] || null
}

/**
 * Unassign student from slot position (RPC)
 *
 * @param slotId - Slot ID
 * @param position - Position number (1-10)
 * @param seat - Seat number (1 or 2)
 */
export async function unassignStudentFromSlotPosition(
  slotId: string,
  position: number,
  seat: 1 | 2
) {
  const { data, error } = await supabase.rpc('unassign_student', {
    p_slot_id: slotId,
    p_position: position,
    p_seat: seat,
  })

  if (error) {
    throw new Error(`Failed to unassign student from slot: ${error.message}`)
  }

  return data
}

/**
 * Get students in slot
 *
 * @param slotId - Slot ID
 * @returns List of students in slot
 */
export async function getSlotStudents(slotId: string): Promise<SlotStudent[]> {
  const { data, error } = await supabase
    .from('slot_students')
    .select('*, students(*)')
    .eq('slot_id', slotId)
    .order('seat', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch slot students: ${error.message}`)
  }

  return data.map(mapSlotStudentFromDb)
}

// ============================================================================
// Teacher Assignment (RPC Calls)
// ============================================================================

/**
 * Assign teacher to slot position (RPC)
 *
 * @param slotId - Slot ID
 * @param position - Position number (1-10)
 * @param teacherId - Teacher ID
 * @param assignedBy - User ID who assigned
 */
export async function assignTeacherToSlot(
  slotId: string,
  position: number,
  teacherId: string,
  assignedBy: string
) {
  const { data, error } = await supabase.rpc('assign_teacher', {
    p_slot_id: slotId,
    p_position: position,
    p_teacher_id: teacherId,
    p_assigned_by: assignedBy,
  })

  if (error) {
    throw new Error(`Failed to assign teacher to slot: ${error.message}`)
  }

  return data?.[0] || null
}

/**
 * Change teacher for slot position (RPC)
 *
 * @param slotId - Slot ID
 * @param position - Position number (1-10)
 * @param newTeacherId - New teacher ID
 * @param assignedBy - User ID who assigned
 */
export async function changeTeacherForSlot(
  slotId: string,
  position: number,
  newTeacherId: string,
  assignedBy: string
) {
  const { data, error } = await supabase.rpc('change_teacher', {
    p_slot_id: slotId,
    p_position: position,
    p_new_teacher_id: newTeacherId,
    p_assigned_by: assignedBy,
  })

  if (error) {
    throw new Error(`Failed to change teacher for slot: ${error.message}`)
  }

  return data?.[0] || null
}

/**
 * Unassign teacher from slot position (RPC)
 *
 * @param slotId - Slot ID
 * @param position - Position number (1-10)
 * @param assignedBy - User ID who unassigned
 */
export async function unassignTeacherFromSlot(
  slotId: string,
  position: number,
  assignedBy: string
) {
  const { data, error } = await supabase.rpc('unassign_teacher', {
    p_slot_id: slotId,
    p_position: position,
    p_assigned_by: assignedBy,
  })

  if (error) {
    throw new Error(`Failed to unassign teacher from slot: ${error.message}`)
  }

  return data
}

/**
 * Add a new empty position to a slot
 *
 * Used when all current positions in a slot are filled and the user
 * wants to add another teacher slot. Maximum 10 positions per slot.
 *
 * @param slotId - Slot ID (e.g. 'MON-A')
 * @returns The new position number
 * @throws Error if the slot already has 10 positions
 */
export async function addPositionToSlot(slotId: string): Promise<number> {
  const { data, error } = await supabase.rpc('add_slot_position', {
    p_slot_id: slotId,
  })

  if (error) {
    throw new Error(`枠の追加に失敗しました: ${error.message}`)
  }

  return data as number
}

/**
 * Get teacher assigned to slot
 *
 * @param slotId - Slot ID
 * @returns Slot teacher or null
 */
export async function getSlotTeacher(slotId: string): Promise<SlotTeacher | null> {
  const { data, error } = await supabase
    .from('slot_teacher')
    .select('*, teachers(*), users(*)')
    .eq('slot_id', slotId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch slot teacher: ${error.message}`)
  }

  return data ? mapSlotTeacherFromDb(data) : null
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database slot record to domain Slot entity
 */
function mapSlotFromDb(dbSlot: any): Slot {
  return {
    id: dbSlot.id,
    day: dbSlot.day,
    komaCode: dbSlot.koma_code,
  }
}

/**
 * Map database slot_students record to domain SlotStudent entity
 */
function mapSlotStudentFromDb(dbSlotStudent: any): SlotStudent {
  return {
    slotId: dbSlotStudent.slot_id,
    position: dbSlotStudent.position,
    seat: dbSlotStudent.seat,
    studentId: dbSlotStudent.student_id,
    subject: dbSlotStudent.subject,
    grade: dbSlotStudent.grade,
    student: dbSlotStudent.students
      ? {
          id: dbSlotStudent.students.id,
          name: dbSlotStudent.students.name,
          grade: dbSlotStudent.students.grade,
          active: dbSlotStudent.students.active,
          createdAt: dbSlotStudent.students.created_at,
          updatedAt: dbSlotStudent.students.updated_at,
        }
      : undefined,
  }
}

/**
 * Map database slot_teacher record to domain SlotTeacher entity
 */
function mapSlotTeacherFromDb(dbSlotTeacher: any): SlotTeacher {
  // Debug logging (only for assigned teachers)
  if (dbSlotTeacher.teacher_id && !dbSlotTeacher.teachers) {
    console.warn('⚠️ [mapSlotTeacherFromDb] Missing teachers data:', {
      slotId: dbSlotTeacher.slot_id,
      position: dbSlotTeacher.position,
      teacherId: dbSlotTeacher.teacher_id
    })
  } else if (dbSlotTeacher.teacher_id && dbSlotTeacher.teachers && !dbSlotTeacher.teachers.user_id) {
    console.warn('⚠️ [mapSlotTeacherFromDb] Teacher has no userId:', {
      slotId: dbSlotTeacher.slot_id,
      position: dbSlotTeacher.position,
      teacherId: dbSlotTeacher.teacher_id,
      teacherName: dbSlotTeacher.teachers.name
    })
  }

  return {
    slotId: dbSlotTeacher.slot_id,
    position: dbSlotTeacher.position,
    teacherId: dbSlotTeacher.teacher_id,
    assignedBy: dbSlotTeacher.assigned_by,
    assignedAt: dbSlotTeacher.assigned_at,
    teacher: dbSlotTeacher.teachers
      ? {
          id: dbSlotTeacher.teachers.id,
          userId: dbSlotTeacher.teachers.user_id,
          name: dbSlotTeacher.teachers.name,
          active: dbSlotTeacher.teachers.active,
          capWeekSlots: dbSlotTeacher.teachers.cap_week_slots,
          capStudents: dbSlotTeacher.teachers.cap_students,
          allowPair: dbSlotTeacher.teachers.allow_pair,
          createdAt: dbSlotTeacher.teachers.created_at,
          updatedAt: dbSlotTeacher.teachers.updated_at,
        }
      : undefined,
    assignedByUser: dbSlotTeacher.users
      ? {
          id: dbSlotTeacher.users.id,
          email: dbSlotTeacher.users.email,
          name: dbSlotTeacher.users.name,
          role: dbSlotTeacher.users.role,
          active: dbSlotTeacher.users.active,
          createdAt: dbSlotTeacher.users.created_at,
          updatedAt: dbSlotTeacher.users.updated_at,
        }
      : undefined,
  }
}
