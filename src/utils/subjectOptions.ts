/**
 * Subject Options
 *
 * シンプルな基本5教科 + 情報
 * 学年による絞り込みは講師のスキル設定（grade_min, grade_max）で対応
 */

export interface SubjectOption {
  value: string
  label: string
}

/**
 * 基本科目リスト
 */
export const SUBJECT_OPTIONS: SubjectOption[] = [
  { value: '国語', label: '国語' },
  { value: '数学', label: '数学' },
  { value: '理科', label: '理科' },
  { value: '社会', label: '社会' },
  { value: '英語', label: '英語' },
  { value: '情報', label: '情報' },
]

/**
 * Get all unique subject values
 */
export function getAllSubjectValues(): string[] {
  return SUBJECT_OPTIONS.map(s => s.value)
}

/**
 * Get subject label from value
 */
export function getSubjectLabel(value: string): string {
  const subject = SUBJECT_OPTIONS.find(s => s.value === value)
  return subject?.label || value
}
