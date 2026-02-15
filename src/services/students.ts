/**
 * Students Service
 *
 * This service provides CRUD operations for students, including
 * subjects management and NG teachers management.
 *
 * Requirements: REQ-4（生徒マスタ管理）
 */

import { supabase } from '@/lib/supabase'
import type { Student, StudentSubject, StudentNG } from '@/types/entities'

/**
 * Create a new student
 *
 * @param data - Student data (excluding id, timestamps)
 * @returns Created student
 */
export async function createStudent(data: {
  name: string
  grade: number
  requiresOneOnOne?: boolean
  lessonLabel?: string | null
  active?: boolean
}) {
  const { data: student, error } = await supabase
    .from('students')
    .insert({
      name: data.name,
      grade: data.grade,
      requires_one_on_one: data.requiresOneOnOne ?? false,
      lesson_label: data.lessonLabel ?? null,
      active: data.active ?? true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create student: ${error.message}`)
  }

  return mapStudentFromDb(student)
}

/**
 * Get student by ID with related data
 *
 * @param id - Student ID
 * @param options - Include related data options
 * @returns Student with related data
 */
export async function getStudent(
  id: string,
  options?: {
    includeSubjects?: boolean
    includeNgTeachers?: boolean
  }
): Promise<Student> {
  let query = supabase.from('students').select('*').eq('id', id)

  // Add related data if requested
  if (options?.includeSubjects) {
    query = supabase
      .from('students')
      .select('*, student_subjects(*)')
      .eq('id', id) as any
  }

  if (options?.includeNgTeachers) {
    query = supabase
      .from('students')
      .select('*, student_subjects(*), student_ng(*)')
      .eq('id', id) as any
  }

  const { data, error } = await query.single()

  if (error) {
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return mapStudentFromDb(data)
}

/**
 * Update student information
 *
 * @param id - Student ID
 * @param data - Updated student data
 * @returns Updated student
 */
export async function updateStudent(
  id: string,
  data: Partial<{
    name: string
    grade: number
    requiresOneOnOne: boolean
    lessonLabel: string | null
    active: boolean
  }>
) {
  const updateData: any = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.grade !== undefined) updateData.grade = data.grade
  if (data.requiresOneOnOne !== undefined)
    updateData.requires_one_on_one = data.requiresOneOnOne
  if (data.lessonLabel !== undefined) updateData.lesson_label = data.lessonLabel
  if (data.active !== undefined) updateData.active = data.active

  const { data: student, error } = await supabase
    .from('students')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update student: ${error.message}`)
  }

  return mapStudentFromDb(student)
}

/**
 * List all students
 *
 * @param activeOnly - Filter by active students only
 * @returns List of students
 */
export async function listStudents(activeOnly: boolean = true): Promise<Student[]> {
  let query = supabase.from('students').select('*').order('name', { ascending: true })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list students: ${error.message}`)
  }

  return data.map(mapStudentFromDb)
}

/**
 * Delete student (soft delete by setting active = false)
 *
 * @param id - Student ID
 */
export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete student: ${error.message}`)
  }
}

// ============================================================================
// Subjects Management
// ============================================================================

/**
 * Add subject to student
 *
 * @param studentId - Student ID
 * @param subject - Subject name
 */
export async function addStudentSubject(studentId: string, subject: string) {
  const { data, error } = await supabase
    .from('student_subjects')
    .insert({
      student_id: studentId,
      subject: subject,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add student subject: ${error.message}`)
  }

  return mapStudentSubjectFromDb(data)
}

/**
 * Remove subject from student
 *
 * @param studentId - Student ID
 * @param subject - Subject name
 */
export async function removeStudentSubject(studentId: string, subject: string) {
  const { error } = await supabase
    .from('student_subjects')
    .delete()
    .eq('student_id', studentId)
    .eq('subject', subject)

  if (error) {
    throw new Error(`Failed to remove student subject: ${error.message}`)
  }
}

/**
 * Get student subjects
 *
 * @param studentId - Student ID
 * @returns List of student subjects
 */
export async function getStudentSubjects(
  studentId: string
): Promise<StudentSubject[]> {
  const { data, error } = await supabase
    .from('student_subjects')
    .select('*')
    .eq('student_id', studentId)
    .order('subject', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch student subjects: ${error.message}`)
  }

  return data.map(mapStudentSubjectFromDb)
}

// ============================================================================
// NG Teachers Management
// ============================================================================

/**
 * Add NG teacher to student
 *
 * @param studentId - Student ID
 * @param teacherId - Teacher ID
 */
export async function addStudentNgTeacher(studentId: string, teacherId: string) {
  const { data, error } = await supabase
    .from('student_ng')
    .insert({
      student_id: studentId,
      teacher_id: teacherId,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add NG teacher: ${error.message}`)
  }

  return mapStudentNgFromDb(data)
}

/**
 * Remove NG teacher from student
 *
 * @param studentId - Student ID
 * @param teacherId - Teacher ID
 */
export async function removeStudentNgTeacher(
  studentId: string,
  teacherId: string
) {
  const { error } = await supabase
    .from('student_ng')
    .delete()
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)

  if (error) {
    throw new Error(`Failed to remove NG teacher: ${error.message}`)
  }
}

/**
 * Get student NG teachers
 *
 * @param studentId - Student ID
 * @returns List of NG teacher IDs
 */
export async function getStudentNgTeachers(studentId: string): Promise<StudentNG[]> {
  const { data, error } = await supabase
    .from('student_ng')
    .select('*')
    .eq('student_id', studentId)

  if (error) {
    throw new Error(`Failed to fetch student NG teachers: ${error.message}`)
  }

  return data.map(mapStudentNgFromDb)
}

/**
 * Check if teacher is NG for student
 *
 * @param studentId - Student ID
 * @param teacherId - Teacher ID
 * @returns True if teacher is NG for student
 */
export async function isTeacherNgForStudent(
  studentId: string,
  teacherId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_ng')
    .select('*')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
    .maybeSingle()

  if (error) {
    console.error('Error checking NG teacher:', error)
    return false
  }

  return !!data
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database student record to domain Student entity
 */
function mapStudentFromDb(dbStudent: any): Student {
  return {
    id: dbStudent.id,
    name: dbStudent.name,
    grade: dbStudent.grade,
    active: dbStudent.active,
    requiresOneOnOne: dbStudent.requires_one_on_one ?? false,
    lessonLabel: dbStudent.lesson_label ?? null,
    createdAt: dbStudent.created_at,
    updatedAt: dbStudent.updated_at,
    // Include related data if present
    subjects: dbStudent.student_subjects
      ? dbStudent.student_subjects.map(mapStudentSubjectFromDb)
      : undefined,
    ngTeachers: dbStudent.student_ng
      ? dbStudent.student_ng.map(mapStudentNgFromDb)
      : undefined,
  }
}

/**
 * Map database student_subjects record to domain StudentSubject entity
 */
function mapStudentSubjectFromDb(dbSubject: any): StudentSubject {
  return {
    studentId: dbSubject.student_id,
    subject: dbSubject.subject,
  }
}

/**
 * Map database student_ng record to domain StudentNG entity
 */
function mapStudentNgFromDb(dbNg: any): StudentNG {
  return {
    studentId: dbNg.student_id,
    teacherId: dbNg.teacher_id,
  }
}
