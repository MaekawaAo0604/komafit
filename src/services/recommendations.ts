/**
 * Teacher Recommendation Engine
 *
 * クライアント側で実装された講師推薦エンジン
 * ハード制約による候補絞り込みと、ソフト条件によるスコアリングを実行
 */

import { supabase } from '@/lib/supabase'
import type { Teacher, SlotStudent } from '@/types/entities'

// ============================================================================
// Types
// ============================================================================

export interface CandidateTeacher {
  teacher: Teacher
  currentLoad: number // 今週の担当コマ数
  score: number // 推薦スコア
  reasons: string[] // 推薦理由
}

export interface RejectionReasons {
  [key: string]: number
}

interface TeacherAvailabilityData {
  teacher_id: string
  is_available: boolean
}

interface TeacherAssignmentData {
  teacher_id: string
  slot_id: string
}

interface NgTeacherData {
  student_id: string
  teacher_id: string
}

interface TeacherSkillData {
  teacher_id: string
  subject: string
  grade_min: number
  grade_max: number
}

// ============================================================================
// Main Recommendation Function
// ============================================================================

/**
 * 指定されたスロット・ポジションに対する候補講師を取得
 */
export async function getTeacherCandidates(
  _slotId: string,
  slotDay: string,
  timeSlotId: string,
  slotStudents: SlotStudent[]
): Promise<CandidateTeacher[]> {
  try {
    // 1. 必要なデータを並列取得（サーバー負荷最小化）
    const [
      teachersResult,
      skillsResult,
      availabilityResult,
      assignmentsResult,
      ngTeachersResult,
    ] = await Promise.all([
      // 講師一覧
      supabase
        .from('teachers')
        .select('id, name, allow_pair, cap_week_slots, cap_students')
        .eq('active', true),

      // 講師スキル
      supabase.from('teacher_skills').select('teacher_id, subject, grade_min, grade_max'),

      // 対象日の空き枠（date列を使用）
      getAvailabilityForSlot(slotDay, timeSlotId),

      // 今週の担当状況
      getThisWeekAssignments(),

      // 生徒のNG講師
      slotStudents.length > 0
        ? supabase
            .from('student_ng')
            .select('student_id, teacher_id')
            .in(
              'student_id',
              slotStudents.map((s) => s.studentId)
            )
        : Promise.resolve({ data: [], error: null }),
    ])

    if (teachersResult.error) throw teachersResult.error
    if (skillsResult.error) throw skillsResult.error
    if (availabilityResult.error) throw availabilityResult.error
    if (assignmentsResult.error) throw assignmentsResult.error
    if (ngTeachersResult.error) throw ngTeachersResult.error

    const teachers = teachersResult.data || []
    const skills = skillsResult.data || []
    const availability = availabilityResult.data || []
    const assignments = assignmentsResult.data || []
    const ngTeachers = ngTeachersResult.data || []

    // Debug logging
    console.log('🔍 [recommendations] Debug Info:', {
      slotDay,
      timeSlotId,
      teachersCount: teachers.length,
      availabilityCount: availability.length,
      skillsCount: skills.length,
      slotStudentsCount: slotStudents.length,
      availabilitySample: availability[0],
    })

    // 2. フィルタリング＋スコアリング
    const candidates = filterAndScoreTeachers(
      teachers,
      skills,
      availability,
      assignments,
      ngTeachers,
      slotStudents
    )

    console.log('✅ [recommendations] Candidates:', candidates.length)

    return candidates
  } catch (error) {
    console.error('Failed to get teacher candidates:', error)
    throw error
  }
}

// ============================================================================
// Data Fetching Helpers
// ============================================================================

/**
 * 対象スロットの日付における空き枠を取得
 */
async function getAvailabilityForSlot(day: string, timeSlotId: string) {
  // 今週の対象曜日の日付を計算
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)

  // 曜日から日付を計算
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
  const dayIndex = days.indexOf(day as string)
  const targetDate = new Date(monday)
  targetDate.setDate(monday.getDate() + (dayIndex >= 0 ? dayIndex : 0))
  const dateStr = targetDate.toISOString().split('T')[0]

  return supabase
    .from('teacher_availability_v2')
    .select('teacher_id, is_available')
    .eq('date', dateStr as string)
    .eq('time_slot_id', timeSlotId as string)
}

/**
 * 今週の割当状況を取得
 */
async function getThisWeekAssignments() {
  // 今週の月曜日を計算
  const today = new Date()
  const currentDay = today.getDay() // 0 = Sunday
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const mondayStr = monday.toISOString()

  return supabase
    .from('slot_teacher')
    .select('teacher_id, slot_id')
    .not('teacher_id', 'is', null)
    .gte('assigned_at', mondayStr)
}

// ============================================================================
// Filtering & Scoring Logic
// ============================================================================

/**
 * ハード制約チェック + ソフト条件スコアリング
 */
function filterAndScoreTeachers(
  teachers: any[],
  skills: TeacherSkillData[],
  availability: TeacherAvailabilityData[],
  assignments: TeacherAssignmentData[],
  ngTeachers: NgTeacherData[],
  slotStudents: SlotStudent[]
): CandidateTeacher[] {
  const rejectionLog: Record<string, string[]> = {
    'no_availability': [],
    'cannot_teach_subject': [],
    'cannot_teach_grade': [],
    'ng_teacher': [],
    'no_pair': [],
  }

  const candidates = teachers
    .filter((teacher) => {
      // ハード制約1: 空き枠チェック
      const availabilityRecord = availability.find((a) => a.teacher_id === teacher.id)
      if (!availabilityRecord || !availabilityRecord.is_available) {
        rejectionLog['no_availability'].push(teacher.name)
        return false
      }

      // スロットに生徒がいない場合は、空き枠チェックのみで候補とする
      if (slotStudents.length === 0) {
        return true
      }

      // ハード制約2: 教科チェック
      const teacherSkills = skills.filter((s) => s.teacher_id === teacher.id)
      const canTeachAll = slotStudents.every((student) =>
        teacherSkills.some((skill) => skill.subject === student.subject)
      )
      if (!canTeachAll) {
        rejectionLog['cannot_teach_subject'].push(teacher.name)
        return false
      }

      // ハード制約3: 学年チェック
      const canTeachGrades = slotStudents.every((student) =>
        teacherSkills.some(
          (skill) =>
            skill.subject === student.subject &&
            student.grade >= skill.grade_min &&
            student.grade <= skill.grade_max
        )
      )
      if (!canTeachGrades) {
        rejectionLog['cannot_teach_grade'].push(teacher.name)
        return false
      }

      // ハード制約4: NG講師チェック
      const isNg = slotStudents.some((student) =>
        ngTeachers.some((ng) => ng.student_id === student.studentId && ng.teacher_id === teacher.id)
      )
      if (isNg) {
        rejectionLog['ng_teacher'].push(teacher.name)
        return false
      }

      // ハード制約5: 1:2可否チェック
      if (slotStudents.length === 2 && !teacher.allow_pair) {
        rejectionLog['no_pair'].push(teacher.name)
        return false
      }

      return true
    })
    .map((teacher) => {
      // ソフト条件: 現在の担当コマ数（少ない方が高スコア）
      const currentLoad = assignments.filter((a) => a.teacher_id === teacher.id).length

      const reasons: string[] = []

      // 推薦理由の生成
      if (currentLoad === 0) {
        reasons.push('負荷なし')
      } else if (currentLoad <= 3) {
        reasons.push('負荷低')
      } else if (currentLoad <= 6) {
        reasons.push('負荷中')
      } else {
        reasons.push('負荷高')
      }

      const mappedTeacher: Teacher = {
        id: teacher.id,
        userId: teacher.user_id,
        name: teacher.name,
        active: teacher.active,
        capWeekSlots: teacher.cap_week_slots,
        capStudents: teacher.cap_students,
        allowPair: teacher.allow_pair,
        createdAt: teacher.created_at,
        updatedAt: teacher.updated_at,
      }

      return {
        teacher: mappedTeacher,
        currentLoad,
        score: 100 - currentLoad, // 担当数が少ないほど高スコア
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score) // スコア降順

  console.log('🔍 [filterAndScoreTeachers] Rejection log:', rejectionLog)

  return candidates
}

// ============================================================================
// Rejection Reasons Analysis
// ============================================================================

/**
 * 候補講師がゼロの場合に、各講師がハード制約を満たさない理由を集計
 *
 * @param slotStudents スロット内の生徒情報
 * @param teachers 全講師リスト
 * @param skills 講師スキル情報
 * @param availability 空き枠情報
 * @param assignments 今週の割当情報
 * @param ngTeachers NG講師情報
 * @returns 理由ごとの件数（Record<string, number>）
 */
export function getRejectionReasons(
  slotStudents: SlotStudent[],
  teachers: any[],
  skills: TeacherSkillData[],
  availability: TeacherAvailabilityData[],
  assignments: TeacherAssignmentData[],
  ngTeachers: NgTeacherData[]
): RejectionReasons {
  const reasons: RejectionReasons = {}

  teachers.forEach((teacher) => {
    // ハード制約1: 空き枠チェック
    const availabilityRecord = availability.find((a) => a.teacher_id === teacher.id)
    if (!availabilityRecord || !availabilityRecord.is_available) {
      reasons['空き枠なし'] = (reasons['空き枠なし'] || 0) + 1
      return // 空き枠がない場合は、他の制約をチェックしない
    }

    // スロットに生徒がいない場合は、空き枠チェックのみで終了
    if (slotStudents.length === 0) {
      return
    }

    // ハード制約2: 教科チェック
    const teacherSkills = skills.filter((s) => s.teacher_id === teacher.id)
    const canTeachAll = slotStudents.every((student) =>
      teacherSkills.some((skill) => skill.subject === student.subject)
    )

    // ハード制約3: 学年チェック
    const canTeachGrades = slotStudents.every((student) =>
      teacherSkills.some(
        (skill) =>
          skill.subject === student.subject &&
          student.grade >= skill.grade_min &&
          student.grade <= skill.grade_max
      )
    )

    if (!canTeachAll || !canTeachGrades) {
      reasons['教科・学年NG'] = (reasons['教科・学年NG'] || 0) + 1
      return
    }

    // ハード制約4: NG講師チェック
    const isNg = slotStudents.some((student) =>
      ngTeachers.some((ng) => ng.student_id === student.studentId && ng.teacher_id === teacher.id)
    )
    if (isNg) {
      reasons['NG講師'] = (reasons['NG講師'] || 0) + 1
      return
    }

    // ハード制約5: 1:2可否チェック
    if (slotStudents.length === 2 && !teacher.allow_pair) {
      reasons['1:2不可'] = (reasons['1:2不可'] || 0) + 1
      return
    }
  })

  return reasons
}
