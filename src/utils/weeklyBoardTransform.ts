/**
 * weeklyBoardTransform
 *
 * Converts V2 calendar data (ExtendedMonthlyCalendarData[]) into
 * BoardSlot[] format for display in the AssignmentBoard component.
 */

import type {
  BoardSlot,
  DayOfWeek,
  KomaCode,
  PositionData,
  SlotTeacher,
  SlotStudent,
  ExtendedMonthlyCalendarData,
} from '@/types/entities'

const DOW_TO_DAY: Record<number, DayOfWeek> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
}

const KOMA_POSITIONS: Record<string, number> = {
  '0': 6,
  '1': 6,
  'A': 10,
  'B': 10,
  'C': 10,
}

const ALL_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const ALL_KOMAS: KomaCode[] = ['0', '1', 'A', 'B', 'C']

export function getWeekDates(weekStartDate: Date): Date[] {
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    dates.push(d)
  }
  return dates
}

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function transformCalendarToBoardSlots(
  calendarData: ExtendedMonthlyCalendarData[],
  weekDates: Date[]
): BoardSlot[] {
  // Build set of dates in this week for quick lookup
  const weekDateStrs = new Set(weekDates.map(formatDateStr))

  // Filter to only this week's data
  const weekData = calendarData.filter(d => weekDateStrs.has(d.date))

  // Group by day + komaCode
  // key = "MON-A", value = array of calendar entries
  const grouped = new Map<string, ExtendedMonthlyCalendarData[]>()

  for (const entry of weekData) {
    const entryDate = new Date(entry.date + 'T00:00:00')
    const dow = entryDate.getDay()
    const day = DOW_TO_DAY[dow]
    if (!day) continue

    const komaCode = entry.timeSlotId
    const key = `${day}-${komaCode}`

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(entry)
  }

  // Build BoardSlot for each day × koma combination
  const slots: BoardSlot[] = []

  for (const day of ALL_DAYS) {
    for (const komaCode of ALL_KOMAS) {
      const key = `${day}-${komaCode}`
      const entries = grouped.get(key) || []
      const maxPositions = KOMA_POSITIONS[komaCode] || 6

      // Group entries by position
      const positionMap = new Map<number, ExtendedMonthlyCalendarData[]>()
      for (const entry of entries) {
        const pos = entry.position ?? 1
        if (!positionMap.has(pos)) {
          positionMap.set(pos, [])
        }
        positionMap.get(pos)!.push(entry)
      }

      // Build position data
      const positions: PositionData[] = []
      for (let pos = 1; pos <= maxPositions; pos++) {
        const posEntries = positionMap.get(pos) || []

        // Extract teacher from first entry that has one
        let teacher: SlotTeacher | null = null
        const teacherEntry = posEntries.find(e => e.teacherId)
        if (teacherEntry) {
          teacher = {
            slotId: key,
            position: pos,
            teacherId: teacherEntry.teacherId,
            assignedBy: null,
            assignedAt: null,
            teacher: {
              id: teacherEntry.teacherId!,
              name: teacherEntry.teacherName || '',
              userId: null,
              active: true,
              capWeekSlots: 0,
              capStudents: 0,
              allowPair: true,
              createdAt: '',
              updatedAt: '',
            },
          }
        }

        // Extract students (max 2 seats)
        const students: SlotStudent[] = []
        let seat = 1
        for (const entry of posEntries) {
          if (entry.studentId && seat <= 2) {
            students.push({
              slotId: key,
              position: pos,
              seat: seat as 1 | 2,
              studentId: entry.studentId,
              subject: entry.subject || '',
              grade: entry.studentGrade ?? 0,
              student: {
                id: entry.studentId,
                name: entry.studentName || '',
                grade: entry.studentGrade ?? 0,
                active: true,
                requiresOneOnOne: entry.studentRequiresOneOnOne ?? false,
                lessonLabel: entry.studentLessonLabel ?? null,
                createdAt: '',
                updatedAt: '',
              },
            })
            seat++
          }
        }

        positions.push({
          position: pos,
          teacher,
          students,
        })
      }

      slots.push({
        id: key,
        day,
        komaCode,
        positions,
      })
    }
  }

  return slots
}
