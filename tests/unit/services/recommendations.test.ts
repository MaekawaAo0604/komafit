/**
 * Teacher Recommendation Engine Tests
 */

import { describe, it, expect } from 'vitest'
import { getRejectionReasons } from '@/services/recommendations'
import type { SlotStudent } from '@/types/entities'

// テスト対象の関数の型定義
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

// モック用の講師データ型
interface MockTeacher {
  id: string
  name: string
  allow_pair: boolean
  cap_week_slots: number
  cap_students: number
  active: boolean
}

describe('getRejectionReasons', () => {
  // テスト用のモックデータ
  const mockTeachers: MockTeacher[] = [
    {
      id: 'teacher-1',
      name: '田中先生',
      allow_pair: true,
      cap_week_slots: 10,
      cap_students: 5,
      active: true,
    },
    {
      id: 'teacher-2',
      name: '佐藤先生',
      allow_pair: false,
      cap_week_slots: 8,
      cap_students: 4,
      active: true,
    },
    {
      id: 'teacher-3',
      name: '鈴木先生',
      allow_pair: true,
      cap_week_slots: 12,
      cap_students: 6,
      active: true,
    },
  ]

  const mockSkills: TeacherSkillData[] = [
    // 田中先生: 数学（中1-中3）
    { teacher_id: 'teacher-1', subject: '数学', grade_min: 7, grade_max: 9 },
    // 佐藤先生: 英語（中1-高3）
    { teacher_id: 'teacher-2', subject: '英語', grade_min: 7, grade_max: 12 },
    // 鈴木先生: 数学（中1-高3）、英語（中1-高3）
    { teacher_id: 'teacher-3', subject: '数学', grade_min: 7, grade_max: 12 },
    { teacher_id: 'teacher-3', subject: '英語', grade_min: 7, grade_max: 12 },
  ]

  it('空き枠なしの理由を正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '数学',
        grade: 8,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: false }, // 空き枠なし
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 期待される結果:
    // - 田中先生: 空き枠なし
    // - 佐藤先生: 教科NG（英語しか教えられない）
    // - 鈴木先生: 候補として適格
    expect(reasons['空き枠なし']).toBe(1)
    expect(reasons['教科・学年NG']).toBe(1)
  })

  it('教科NGの理由を正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '国語', // 誰も教えられない
        grade: 8,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: true },
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 全員が教科NGとなる
    expect(reasons['教科・学年NG']).toBe(3)
  })

  it('学年NGの理由を正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '数学',
        grade: 12, // 高3（田中先生は中学生のみ）
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: true },
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 田中先生: 学年NG（中学生のみ対応）
    // 佐藤先生: 教科NG（英語のみ）
    // 鈴木先生: 候補として適格
    expect(reasons['教科・学年NG']).toBe(2)
  })

  it('NG講師の理由を正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '数学',
        grade: 8,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: true },
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = [
      { student_id: 'student-1', teacher_id: 'teacher-1' }, // 田中先生がNG
    ]

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 田中先生: NG講師
    // 佐藤先生: 教科NG
    // 鈴木先生: 候補として適格
    expect(reasons['NG講師']).toBe(1)
    expect(reasons['教科・学年NG']).toBe(1)
  })

  it('1:2不可の理由を正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '英語',
        grade: 8,
      },
      {
        seat: 2,
        studentId: 'student-2',
        subject: '英語',
        grade: 9,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: true },
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 田中先生: 教科NG（数学のみ）
    // 佐藤先生: 1:2不可
    // 鈴木先生: 候補として適格
    expect(reasons['教科・学年NG']).toBe(1)
    expect(reasons['1:2不可']).toBe(1)
  })

  it('複数の理由が混在する場合に正しく集計する', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '数学',
        grade: 8,
      },
      {
        seat: 2,
        studentId: 'student-2',
        subject: '数学',
        grade: 9,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: false }, // 空き枠なし
      { teacher_id: 'teacher-2', is_available: true },  // 教科NG
      { teacher_id: 'teacher-3', is_available: true },  // 候補
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 田中先生: 空き枠なし
    // 佐藤先生: 教科NG
    // 鈴木先生: 候補として適格
    expect(reasons['空き枠なし']).toBe(1)
    expect(reasons['教科・学年NG']).toBe(1)
  })

  it('生徒がいないスロットの場合、空き枠チェックのみ実施する', () => {
    const slotStudents: SlotStudent[] = []

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: false },
      { teacher_id: 'teacher-2', is_available: false },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 生徒がいない場合は、空き枠チェックのみ
    expect(reasons['空き枠なし']).toBe(2)
  })

  it('全講師が候補の場合、空のオブジェクトを返す', () => {
    const slotStudents: SlotStudent[] = [
      {
        seat: 1,
        studentId: 'student-1',
        subject: '数学',
        grade: 8,
      },
    ]

    const availability: TeacherAvailabilityData[] = [
      { teacher_id: 'teacher-1', is_available: true },
      { teacher_id: 'teacher-2', is_available: true },
      { teacher_id: 'teacher-3', is_available: true },
    ]

    const assignments: TeacherAssignmentData[] = []
    const ngTeachers: NgTeacherData[] = []

    const reasons = getRejectionReasons(
      slotStudents,
      mockTeachers,
      mockSkills,
      availability,
      assignments,
      ngTeachers
    )

    // 田中先生、鈴木先生は候補として適格
    // 佐藤先生のみ教科NG
    expect(reasons['教科・学年NG']).toBe(1)
  })
})
