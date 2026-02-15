/**
 * Grade Helper Utilities
 *
 * Convert between numeric grades (1-12) and display format (小1〜高3)
 */

export type GradeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type GradeDisplay =
  | '小1' | '小2' | '小3' | '小4' | '小5' | '小6'
  | '中1' | '中2' | '中3'
  | '高1' | '高2' | '高3'

/**
 * All grade options for dropdowns
 */
export const GRADE_OPTIONS: Array<{ value: number; label: GradeDisplay }> = [
  { value: 1, label: '小1' },
  { value: 2, label: '小2' },
  { value: 3, label: '小3' },
  { value: 4, label: '小4' },
  { value: 5, label: '小5' },
  { value: 6, label: '小6' },
  { value: 7, label: '中1' },
  { value: 8, label: '中2' },
  { value: 9, label: '中3' },
  { value: 10, label: '高1' },
  { value: 11, label: '高2' },
  { value: 12, label: '高3' },
]

/**
 * Convert numeric grade (1-12) to display format (小1〜高3)
 */
export function gradeToDisplay(grade: number): GradeDisplay {
  const option = GRADE_OPTIONS.find(opt => opt.value === grade)
  return option?.label || '中1'
}

/**
 * Convert display format (小1〜高3) to numeric grade (1-12)
 */
export function displayToGrade(display: GradeDisplay): number {
  const option = GRADE_OPTIONS.find(opt => opt.label === display)
  return option?.value || 7
}

/**
 * Get grade options for a specific school level
 */
export function getGradesByLevel(level: 'elementary' | 'middle' | 'high'): Array<{ value: number; label: GradeDisplay }> {
  switch (level) {
    case 'elementary':
      return GRADE_OPTIONS.slice(0, 6) // 小1〜小6
    case 'middle':
      return GRADE_OPTIONS.slice(6, 9) // 中1〜中3
    case 'high':
      return GRADE_OPTIONS.slice(9, 12) // 高1〜高3
    default:
      return GRADE_OPTIONS
  }
}

/**
 * Get school level from grade number
 */
export function getSchoolLevel(grade: number): 'elementary' | 'middle' | 'high' {
  if (grade <= 6) return 'elementary'
  if (grade <= 9) return 'middle'
  return 'high'
}
