/**
 * Domain Entity Types
 *
 * These types represent the business domain entities used throughout the application.
 * They are based on the database schema but may include additional computed properties
 * or transformed data for UI purposes.
 */

// ============================================================================
// User & Authentication
// ============================================================================

export type UserRole = 'admin' | 'teacher' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================================
// Teacher
// ============================================================================

export interface Teacher {
  id: string
  userId: string | null
  name: string
  active: boolean
  capWeekSlots: number
  capStudents: number
  allowPair: boolean
  createdAt: string
  updatedAt: string
  // Relations
  skills?: TeacherSkill[]
  availability?: TeacherAvailability[]
  user?: User
}

export interface TeacherSkill {
  teacherId: string
  subject: string
  gradeMin: number
  gradeMax: number
}

export interface TeacherAvailability {
  teacherId: string
  slotId: string
  isAvailable: boolean
  updatedAt: string
}

// ============================================================================
// Student
// ============================================================================

export interface Student {
  id: string
  name: string
  grade: number
  active: boolean
  requiresOneOnOne: boolean
  lessonLabel: string | null
  createdAt: string
  updatedAt: string
  // Relations
  subjects?: StudentSubject[]
  ngTeachers?: StudentNG[]
}

export interface StudentSubject {
  studentId: string
  subject: string
}

export interface StudentNG {
  studentId: string
  teacherId: string
}

// ============================================================================
// Slot & Schedule
// ============================================================================

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'
export type KomaCode = '0' | '1' | 'A' | 'B' | 'C'

export interface Slot {
  id: string
  day: DayOfWeek
  komaCode: KomaCode
}

export interface SlotStudent {
  slotId: string
  position: number
  seat: 1 | 2
  studentId: string
  subject: string
  grade: number
  assignmentId?: string // V2 assignments.id（削除用）
  // Relations
  student?: Student
}

export interface SlotTeacher {
  slotId: string
  position: number
  teacherId: string | null
  assignedBy: string | null
  assignedAt: string | null
  // Relations
  teacher?: Teacher
  assignedByUser?: User
}

// ============================================================================
// Board (Slot + Students + Teacher)
// ============================================================================

/**
 * PositionData: Represents a single teacher position in a slot
 * Each position can have 1 teacher and up to 2 students (seat 1, seat 2)
 */
export interface PositionData {
  position: number
  teacher: SlotTeacher | null
  students: SlotStudent[]
}

/**
 * BoardSlot: Represents a complete slot with all related data
 * This is the main data structure used in the assignment board UI
 * 
 * Position limits:
 * - Koma 0/1: 6 positions
 * - Koma A/B/C: 10 positions
 */
export interface BoardSlot {
  id: string
  day: DayOfWeek
  komaCode: KomaCode
  positions: PositionData[]
}

// ============================================================================
// Recommendation Engine
// ============================================================================

/**
 * TeacherCandidate: Represents a teacher candidate for a slot
 * Includes score and reasoning for the recommendation
 */
export interface TeacherCandidate {
  teacher: Teacher
  score: number
  reasons: string[]
  hardConstraints: {
    hasAvailability: boolean
    canTeachAllSubjects: boolean
    notInNGList: boolean
    allowsPair: boolean
    underCapacity: boolean
  }
}

/**
 * RecommendationResult: Result from the recommendation engine
 */
export interface RecommendationResult {
  slotId: string
  candidates: TeacherCandidate[]
  rejectionReasons?: Record<string, number>
}

// ============================================================================
// Audit Log
// ============================================================================

export interface AuditLog {
  id: string
  actorId: string
  action: string
  payload: Record<string, unknown>
  createdAt: string
  // Relations
  actor?: User
}

// ============================================================================
// Settings
// ============================================================================

export interface Settings {
  id: number
  loadWeight: number
  continuityWeight: number
  gradeDiffWeight: number
  pairSameSubjectRequired: boolean
  pairMaxGradeDiff: number
  updatedAt: string
}

// ============================================================================
// Koma Master
// ============================================================================

export interface KomaMaster {
  code: KomaCode
  komaOrder: number
}

// ============================================================================
// Date-Based Scheduling (V2)
// ============================================================================

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TeacherAvailabilityV2 {
  id: string
  teacherId: string
  date: string
  timeSlotId: string
  isAvailable: boolean
  createdAt: string
  updatedAt: string
  // Relations
  teacher?: Teacher
  timeSlot?: TimeSlot
}

export interface Assignment {
  id: string
  date: string
  timeSlotId: string
  teacherId: string
  studentId: string
  subject: string
  position: number
  assignedBy: string
  assignedAt: string
  createdAt: string
  updatedAt: string
  // Relations
  teacher?: Teacher
  student?: Student
  timeSlot?: TimeSlot
  assignedByUser?: User
}

export interface MonthlyCalendarData {
  date: string
  timeSlotId: string
  timeSlotOrder: number
  teacherId: string | null
  teacherName: string | null
  isAvailable: boolean | null
  studentId: string | null
  studentName: string | null
  studentGrade: number | null
  studentRequiresOneOnOne: boolean | null
  studentLessonLabel: string | null
  subject: string | null
  position: number | null
  dataSource?: 'pattern' | 'assignment' | 'exception' | null
  patternId?: string | null
  exceptionType?: 'cancelled' | 'modified' | null
}

// ============================================================================
// Recurring Assignments (定期授業パターン)
// ============================================================================

/**
 * RecurringAssignment: 定期授業パターン
 * 毎週特定の曜日・時間帯に行われる授業のパターン定義
 */
export interface RecurringAssignment {
  id: string
  teacherId: string
  dayOfWeek: number // 0=日曜日, 1=月曜日, ..., 6=土曜日
  timeSlotId: string
  studentId: string
  subject: string
  startDate: string // YYYY-MM-DD形式
  endDate: string | null // YYYY-MM-DD形式、NULLの場合は無期限
  active: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  // Relations
  teacher?: Teacher
  student?: Student
  timeSlot?: TimeSlot
  createdByUser?: User
}

/**
 * RecurringAssignmentInput: 定期授業パターン作成・更新用の入力型
 */
export interface RecurringAssignmentInput {
  teacherId: string
  dayOfWeek: number
  timeSlotId: string
  studentId: string
  subject: string
  startDate: string
  endDate?: string | null
  active?: boolean
}

/**
 * AssignmentException: 定期パターンの例外処理
 * 特定日付のパターンを休みにしたり変更したりする
 */
export interface AssignmentException {
  id: string
  patternId: string
  date: string // YYYY-MM-DD形式
  exceptionType: 'cancelled' | 'modified'
  createdAt: string
  createdBy: string
  // Relations
  pattern?: RecurringAssignment
  createdByUser?: User
}

/**
 * ExtendedMonthlyCalendarData: 月次カレンダーデータ（パターン統合版）
 * MonthlyCalendarDataを拡張して、データソース情報を含める
 */
export interface ExtendedMonthlyCalendarData extends MonthlyCalendarData {
  dataSource: 'pattern' | 'assignment' | 'exception'
  patternId?: string | null
  exceptionType?: string | null
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface ApiResponse<T> {
  data?: T
  error?: ApiError
}
