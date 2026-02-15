/**
 * Teachers Service
 *
 * This service provides CRUD operations for teachers, including
 * skills management and availability management.
 *
 * Requirements: REQ-3（講師マスタ管理）、REQ-6（講師空き枠管理）
 */

import { supabase } from '@/lib/supabase'
import type { Teacher, TeacherSkill, TeacherAvailability } from '@/types/entities'

/**
 * Create a new teacher
 *
 * @param data - Teacher data (excluding id, timestamps)
 * @returns Created teacher
 */
export async function createTeacher(data: {
  userId?: string | null
  name: string
  capWeekSlots: number
  capStudents: number
  allowPair?: boolean
  active?: boolean
}) {
  const { data: teacher, error } = await supabase
    .from('teachers')
    .insert({
      user_id: data.userId,
      name: data.name,
      cap_week_slots: data.capWeekSlots,
      cap_students: data.capStudents,
      allow_pair: data.allowPair ?? false,
      active: data.active ?? true,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create teacher: ${error.message}`)
  }

  return mapTeacherFromDb(teacher)
}

/**
 * Get teacher by ID with related data
 *
 * @param id - Teacher ID
 * @param includeSkills - Include teacher skills
 * @param includeAvailability - Include teacher availability
 * @returns Teacher with related data
 */
export async function getTeacher(
  id: string,
  options?: {
    includeSkills?: boolean
    includeAvailability?: boolean
    includeUser?: boolean
  }
): Promise<Teacher> {
  let query = supabase.from('teachers').select('*').eq('id', id)

  // Add related data if requested
  if (options?.includeSkills) {
    query = supabase
      .from('teachers')
      .select('*, teacher_skills(*)')
      .eq('id', id) as any
  }

  if (options?.includeAvailability) {
    query = supabase
      .from('teachers')
      .select('*, teacher_skills(*), teacher_availability(*)')
      .eq('id', id) as any
  }

  if (options?.includeUser) {
    query = supabase
      .from('teachers')
      .select('*, teacher_skills(*), teacher_availability(*), users(*)')
      .eq('id', id) as any
  }

  const { data, error } = await query.single()

  if (error) {
    throw new Error(`Failed to fetch teacher: ${error.message}`)
  }

  return mapTeacherFromDb(data)
}

/**
 * Update teacher information
 *
 * @param id - Teacher ID
 * @param data - Updated teacher data
 * @returns Updated teacher
 */
export async function updateTeacher(
  id: string,
  data: Partial<{
    userId: string | null
    name: string
    capWeekSlots: number
    capStudents: number
    allowPair: boolean
    active: boolean
  }>
) {
  const updateData: any = {}

  if (data.userId !== undefined) updateData.user_id = data.userId
  if (data.name !== undefined) updateData.name = data.name
  if (data.capWeekSlots !== undefined)
    updateData.cap_week_slots = data.capWeekSlots
  if (data.capStudents !== undefined) updateData.cap_students = data.capStudents
  if (data.allowPair !== undefined) updateData.allow_pair = data.allowPair
  if (data.active !== undefined) updateData.active = data.active

  const { data: teacher, error } = await supabase
    .from('teachers')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update teacher: ${error.message}`)
  }

  return mapTeacherFromDb(teacher)
}

/**
 * List all teachers
 *
 * @param activeOnly - Filter by active teachers only
 * @param options - Include related data options
 * @returns List of teachers
 */
export async function listTeachers(
  activeOnly: boolean = true,
  options?: {
    includeSkills?: boolean
    includeAvailability?: boolean
    includeUser?: boolean
  }
): Promise<Teacher[]> {
  let selectQuery = '*'

  // Build select query with relations
  if (options?.includeSkills || options?.includeAvailability || options?.includeUser) {
    const relations: string[] = []
    if (options.includeSkills) relations.push('teacher_skills(*)')
    if (options.includeAvailability) relations.push('teacher_availability(*)')
    if (options.includeUser) relations.push('users(*)')
    selectQuery = `*, ${relations.join(', ')}`
  }

  let query = supabase
    .from('teachers')
    .select(selectQuery)
    .order('name', { ascending: true })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to list teachers: ${error.message}`)
  }

  return data.map(mapTeacherFromDb)
}

/**
 * Delete teacher (soft delete by setting active = false)
 *
 * @param id - Teacher ID
 */
export async function deleteTeacher(id: string) {
  const { error } = await supabase
    .from('teachers')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete teacher: ${error.message}`)
  }
}

// ============================================================================
// Skills Management
// ============================================================================

/**
 * Add skill to teacher
 *
 * @param teacherId - Teacher ID
 * @param skill - Skill data
 */
export async function addTeacherSkill(
  teacherId: string,
  skill: {
    subject: string
    gradeMin: number
    gradeMax: number
  }
) {
  const { data, error } = await supabase
    .from('teacher_skills')
    .insert({
      teacher_id: teacherId,
      subject: skill.subject,
      grade_min: skill.gradeMin,
      grade_max: skill.gradeMax,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add teacher skill: ${error.message}`)
  }

  return mapTeacherSkillFromDb(data)
}

/**
 * Remove skill from teacher
 *
 * @param teacherId - Teacher ID
 * @param subject - Subject to remove
 */
export async function removeTeacherSkill(teacherId: string, subject: string) {
  const { error } = await supabase
    .from('teacher_skills')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('subject', subject)

  if (error) {
    throw new Error(`Failed to remove teacher skill: ${error.message}`)
  }
}

/**
 * Get teacher skills
 *
 * @param teacherId - Teacher ID
 * @returns List of teacher skills
 */
export async function getTeacherSkills(
  teacherId: string
): Promise<TeacherSkill[]> {
  const { data, error } = await supabase
    .from('teacher_skills')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('subject', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch teacher skills: ${error.message}`)
  }

  return data.map(mapTeacherSkillFromDb)
}

// ============================================================================
// Availability Management
// ============================================================================

/**
 * Set teacher availability for a slot
 *
 * @param teacherId - Teacher ID
 * @param slotId - Slot ID
 * @param isAvailable - Availability status
 */
export async function setTeacherAvailability(
  teacherId: string,
  slotId: string,
  isAvailable: boolean
) {
  const { data, error } = await supabase
    .from('teacher_availability')
    .upsert({
      teacher_id: teacherId,
      slot_id: slotId,
      is_available: isAvailable,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to set teacher availability: ${error.message}`)
  }

  return mapTeacherAvailabilityFromDb(data)
}

/**
 * Get teacher availability
 *
 * @param teacherId - Teacher ID
 * @returns List of teacher availability records
 */
export async function getTeacherAvailability(
  teacherId: string
): Promise<TeacherAvailability[]> {
  const { data, error } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('slot_id', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch teacher availability: ${error.message}`)
  }

  return data.map(mapTeacherAvailabilityFromDb)
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database teacher record to domain Teacher entity
 */
function mapTeacherFromDb(dbTeacher: any): Teacher {
  return {
    id: dbTeacher.id,
    userId: dbTeacher.user_id,
    name: dbTeacher.name,
    active: dbTeacher.active,
    capWeekSlots: dbTeacher.cap_week_slots,
    capStudents: dbTeacher.cap_students,
    allowPair: dbTeacher.allow_pair,
    createdAt: dbTeacher.created_at,
    updatedAt: dbTeacher.updated_at,
    // Include related data if present
    skills: dbTeacher.teacher_skills
      ? dbTeacher.teacher_skills.map(mapTeacherSkillFromDb)
      : undefined,
    availability: dbTeacher.teacher_availability
      ? dbTeacher.teacher_availability.map(mapTeacherAvailabilityFromDb)
      : undefined,
    user: dbTeacher.users
      ? {
          id: dbTeacher.users.id,
          email: dbTeacher.users.email,
          name: dbTeacher.users.name,
          role: dbTeacher.users.role,
          active: dbTeacher.users.active,
          createdAt: dbTeacher.users.created_at,
          updatedAt: dbTeacher.users.updated_at,
        }
      : undefined,
  }
}

/**
 * Map database teacher_skill record to domain TeacherSkill entity
 */
function mapTeacherSkillFromDb(dbSkill: any): TeacherSkill {
  return {
    teacherId: dbSkill.teacher_id,
    subject: dbSkill.subject,
    gradeMin: dbSkill.grade_min,
    gradeMax: dbSkill.grade_max,
  }
}

/**
 * Map database teacher_availability record to domain TeacherAvailability entity
 */
function mapTeacherAvailabilityFromDb(dbAvail: any): TeacherAvailability {
  return {
    teacherId: dbAvail.teacher_id,
    slotId: dbAvail.slot_id,
    isAvailable: dbAvail.is_available,
    updatedAt: dbAvail.updated_at,
  }
}
