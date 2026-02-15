/**
 * Recommendation Engine Service
 *
 * This service provides teacher recommendation functionality for slot assignments.
 * It applies hard constraints (must be satisfied) and soft constraints (scoring).
 *
 * Requirements: REQ-7（推薦エンジン）, REQ-8（制約適用）
 */

import { supabase } from '@/lib/supabase'
import type {
  TeacherCandidate,
  RecommendationResult,
  SlotStudent,
  Teacher,
} from '@/types/entities'
import { getSlot } from './slots'
import { listTeachers } from './teachers'
import { getSettings } from './settings'

/**
 * Get recommended teachers for a slot
 *
 * @param slotId - Slot ID to get recommendations for
 * @returns Recommendation result with scored teacher candidates
 */
export async function getRecommendedTeachers(
  slotId: string
): Promise<RecommendationResult> {
  // Fetch slot with students
  const slot = await getSlot(slotId, { includeStudents: true })

  if (!slot.students || slot.students.length === 0) {
    return {
      slotId,
      candidates: [],
      rejectionReasons: { no_students: 0 },
    }
  }

  // Fetch all active teachers with skills and availability
  const teachers = await listTeachers(true, {
    includeSkills: true,
    includeAvailability: true,
  })

  // Fetch settings for scoring weights
  const settings = await getSettings()

  const rejectionReasons: Record<string, number> = {}
  const candidates: TeacherCandidate[] = []

  for (const teacher of teachers) {
    // Check hard constraints
    const hardConstraints = await checkHardConstraints(teacher, slot, slotId)

    // Track rejection reasons
    if (!hardConstraints.hasAvailability) {
      rejectionReasons['no_availability'] = (rejectionReasons['no_availability'] || 0) + 1
    }
    if (!hardConstraints.canTeachAllSubjects) {
      rejectionReasons['cannot_teach_subjects'] =
        (rejectionReasons['cannot_teach_subjects'] || 0) + 1
    }
    if (!hardConstraints.notInNGList) {
      rejectionReasons['in_ng_list'] = (rejectionReasons['in_ng_list'] || 0) + 1
    }
    if (!hardConstraints.allowsPair) {
      rejectionReasons['does_not_allow_pair'] =
        (rejectionReasons['does_not_allow_pair'] || 0) + 1
    }
    if (!hardConstraints.underCapacity) {
      rejectionReasons['over_capacity'] = (rejectionReasons['over_capacity'] || 0) + 1
    }

    // If any hard constraint is not satisfied, skip this teacher
    const allConstraintsSatisfied = Object.values(hardConstraints).every(
      (satisfied) => satisfied
    )
    if (!allConstraintsSatisfied) {
      continue
    }

    // Calculate score based on soft constraints
    const { score, reasons } = await calculateScore(
      teacher,
      slot.students,
      settings,
      slotId
    )

    candidates.push({
      teacher,
      score,
      reasons,
      hardConstraints,
    })
  }

  // Sort candidates by score (descending)
  candidates.sort((a, b) => b.score - a.score)

  return {
    slotId,
    candidates,
    rejectionReasons,
  }
}

/**
 * Check hard constraints for a teacher
 *
 * @param teacher - Teacher to check
 * @param slot - Slot with students
 * @param slotId - Slot ID
 * @returns Hard constraints evaluation result
 */
async function checkHardConstraints(
  teacher: Teacher,
  slot: { students: SlotStudent[] },
  slotId: string
): Promise<TeacherCandidate['hardConstraints']> {
  // 1. Check availability
  const hasAvailability = teacher.availability
    ? teacher.availability.some(
        (avail) => avail.slotId === slotId && avail.isAvailable
      )
    : false

  // 2. Check if teacher can teach all subjects
  const canTeachAllSubjects = slot.students.every((student) =>
    canTeacherTeachSubject(teacher, student.subject, student.grade)
  )

  // 3. Check NG list
  const notInNGList = await checkNotInNGList(
    teacher.id,
    slot.students.map((s) => s.studentId)
  )

  // 4. Check pair teaching (if 2 students)
  const allowsPair = slot.students.length <= 1 || teacher.allowPair

  // 5. Check capacity
  const underCapacity = await checkTeacherCapacity(
    teacher,
    slot.students.length
  )

  return {
    hasAvailability,
    canTeachAllSubjects,
    notInNGList,
    allowsPair,
    underCapacity,
  }
}

/**
 * Check if teacher can teach a subject for a specific grade
 *
 * @param teacher - Teacher with skills
 * @param subject - Subject name
 * @param grade - Student grade
 * @returns True if teacher can teach
 */
function canTeacherTeachSubject(
  teacher: Teacher,
  subject: string,
  grade: number
): boolean {
  if (!teacher.skills) return false

  return teacher.skills.some(
    (skill) =>
      skill.subject === subject &&
      skill.gradeMin <= grade &&
      grade <= skill.gradeMax
  )
}

/**
 * Check if teacher is not in any student's NG list
 *
 * @param teacherId - Teacher ID
 * @param studentIds - Array of student IDs
 * @returns True if teacher is not in any NG list
 */
async function checkNotInNGList(
  teacherId: string,
  studentIds: string[]
): Promise<boolean> {
  const { data, error } = await supabase
    .from('student_ng')
    .select('*')
    .eq('teacher_id', teacherId)
    .in('student_id', studentIds)

  if (error) {
    console.error('Error checking NG list:', error)
    return false
  }

  // If any match found, teacher is in NG list
  return !data || data.length === 0
}

/**
 * Check if teacher is under capacity limits
 *
 * @param teacher - Teacher with capacity limits
 * @param additionalStudents - Number of students in the slot
 * @returns True if under capacity
 */
async function checkTeacherCapacity(
  teacher: Teacher,
  additionalStudents: number
): Promise<boolean> {
  // Get current assignments
  const { data: currentSlots, error: slotsError } = await supabase
    .from('slot_teacher')
    .select('slot_id')
    .eq('teacher_id', teacher.id)
    .not('teacher_id', 'is', null)

  if (slotsError) {
    console.error('Error fetching current slots:', slotsError)
    return false
  }

  const currentWeekSlots = currentSlots?.length || 0

  // Check week slots capacity
  if (currentWeekSlots >= teacher.capWeekSlots) {
    return false
  }

  // Get current students count
  const { data: currentStudents, error: studentsError } = await supabase
    .from('slot_students')
    .select('student_id')
    .in(
      'slot_id',
      currentSlots?.map((s) => s.slot_id) || []
    )

  if (studentsError) {
    console.error('Error fetching current students:', studentsError)
    return false
  }

  const currentStudentsCount = currentStudents?.length || 0

  // Check students capacity
  if (currentStudentsCount + additionalStudents > teacher.capStudents) {
    return false
  }

  return true
}

/**
 * Calculate score based on soft constraints
 *
 * @param teacher - Teacher to score
 * @param students - Students in the slot
 * @param settings - Settings with weights
 * @param slotId - Slot ID
 * @returns Score and reasons
 */
async function calculateScore(
  teacher: Teacher,
  students: SlotStudent[],
  settings: Settings,
  slotId: string
): Promise<{ score: number; reasons: string[] }> {
  const reasons: string[] = []

  // 1. Load score (fewer current slots = higher score)
  const loadScore = await calculateLoadScore(teacher, settings.loadWeight)
  reasons.push(`負荷分散スコア: ${loadScore.toFixed(2)}`)

  // 2. Continuity score (more past students = higher score)
  const continuityScore = await calculateContinuityScore(
    teacher,
    students,
    settings.continuityWeight
  )
  reasons.push(`継続性スコア: ${continuityScore.toFixed(2)}`)

  // 3. Grade difference score (smaller grade gap = higher score)
  const gradeDiffScore = calculateGradeDiffScore(
    students,
    settings.gradeDiffWeight
  )
  reasons.push(`学年差スコア: ${gradeDiffScore.toFixed(2)}`)

  const totalScore = loadScore + continuityScore + gradeDiffScore
  reasons.push(`合計スコア: ${totalScore.toFixed(2)}`)

  return { score: totalScore, reasons }
}

/**
 * Calculate load score (負荷分散)
 *
 * @param teacher - Teacher
 * @param weight - Load weight from settings
 * @returns Load score
 */
async function calculateLoadScore(
  teacher: Teacher,
  weight: number
): Promise<number> {
  // Get current assignments count
  const { data, error } = await supabase
    .from('slot_teacher')
    .select('slot_id')
    .eq('teacher_id', teacher.id)
    .not('teacher_id', 'is', null)

  if (error) {
    console.error('Error calculating load score:', error)
    return 0
  }

  const currentSlots = data?.length || 0
  const utilization = currentSlots / teacher.capWeekSlots

  // Lower utilization = higher score
  // Score ranges from 0 to weight
  return weight * (1 - utilization)
}

/**
 * Calculate continuity score (継続性)
 *
 * @param teacher - Teacher
 * @param students - Students in the slot
 * @param weight - Continuity weight from settings
 * @returns Continuity score
 */
async function calculateContinuityScore(
  teacher: Teacher,
  students: SlotStudent[],
  weight: number
): Promise<number> {
  if (students.length === 0) return 0

  // Get all slots where this teacher is assigned
  const { data: teacherSlots, error: slotsError } = await supabase
    .from('slot_teacher')
    .select('slot_id')
    .eq('teacher_id', teacher.id)
    .not('teacher_id', 'is', null)

  if (slotsError || !teacherSlots || teacherSlots.length === 0) {
    return 0
  }

  // Get students in those slots
  const { data: pastStudents, error: studentsError } = await supabase
    .from('slot_students')
    .select('student_id')
    .in(
      'slot_id',
      teacherSlots.map((s) => s.slot_id)
    )

  if (studentsError || !pastStudents) {
    return 0
  }

  // Count how many students in current slot were taught by this teacher
  const pastStudentIds = new Set(pastStudents.map((s) => s.student_id))
  const matchingStudents = students.filter((s) =>
    pastStudentIds.has(s.studentId)
  ).length

  // Score based on percentage of matching students
  const matchRatio = matchingStudents / students.length

  return weight * matchRatio
}

/**
 * Calculate grade difference score (学年差)
 *
 * @param students - Students in the slot
 * @param weight - Grade diff weight from settings
 * @returns Grade diff score
 */
function calculateGradeDiffScore(
  students: SlotStudent[],
  weight: number
): number {
  if (students.length <= 1) {
    // No grade difference for single student
    return weight
  }

  const grades = students.map((s) => s.grade)
  const maxGrade = Math.max(...grades)
  const minGrade = Math.min(...grades)
  const gradeDiff = maxGrade - minGrade

  // Smaller difference = higher score
  // Assuming max grade diff of 6 (e.g., grade 1-7)
  const maxPossibleDiff = 6
  const normalizedDiff = Math.min(gradeDiff / maxPossibleDiff, 1)

  return weight * (1 - normalizedDiff)
}

/**
 * Get teacher recommendation for specific slot (convenience wrapper)
 *
 * @param slotId - Slot ID
 * @returns Array of teacher candidates sorted by score
 */
export async function getTopRecommendations(
  slotId: string,
  limit: number = 5
): Promise<TeacherCandidate[]> {
  const result = await getRecommendedTeachers(slotId)
  return result.candidates.slice(0, limit)
}
