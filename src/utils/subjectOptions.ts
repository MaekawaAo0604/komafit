/**
 * Subject Options
 *
 * 中学以下向け基本5教科 + 高校向け細分化科目 + 全学年共通科目
 * 生徒の学年に応じて選択可能な科目をフィルタリング
 */

export interface SubjectOption {
  value: string
  label: string
  gradeMin?: number // undefined = 制限なし (grade 1から)
  gradeMax?: number // undefined = 制限なし (grade 12まで)
}

/**
 * 科目リスト
 */
export const SUBJECT_OPTIONS: SubjectOption[] = [
  // --- 国語系 ---
  { value: '国語', label: '国語', gradeMin: 1, gradeMax: 9 },
  { value: '現代文', label: '現代文', gradeMin: 10, gradeMax: 12 },
  { value: '古典', label: '古典', gradeMin: 10, gradeMax: 12 },
  // --- 数学系 ---
  { value: '数学', label: '数学', gradeMin: 1, gradeMax: 9 },
  { value: '数I・II・A・B', label: '数I・II・A・B', gradeMin: 10, gradeMax: 12 },
  { value: '数Ⅲ', label: '数Ⅲ', gradeMin: 10, gradeMax: 12 },
  // --- 理科系 ---
  { value: '理科', label: '理科', gradeMin: 1, gradeMax: 9 },
  { value: '物理', label: '物理', gradeMin: 10, gradeMax: 12 },
  { value: '化学', label: '化学', gradeMin: 10, gradeMax: 12 },
  { value: '生物', label: '生物', gradeMin: 10, gradeMax: 12 },
  { value: '地学', label: '地学', gradeMin: 10, gradeMax: 12 },
  // --- 社会系 ---
  { value: '社会', label: '社会', gradeMin: 1, gradeMax: 9 },
  { value: '日本史', label: '日本史', gradeMin: 10, gradeMax: 12 },
  { value: '世界史', label: '世界史', gradeMin: 10, gradeMax: 12 },
  { value: '現代社会', label: '現代社会', gradeMin: 10, gradeMax: 12 },
  // --- 全学年 ---
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

/**
 * 指定学年で選択可能な科目を返す
 */
export function getSubjectsForGrade(grade: number): SubjectOption[] {
  return SUBJECT_OPTIONS.filter(s => {
    const minOk = s.gradeMin === undefined || grade >= s.gradeMin
    const maxOk = s.gradeMax === undefined || grade <= s.gradeMax
    return minOk && maxOk
  })
}

/**
 * 指定した科目が指定学年で有効かどうかを判定する
 */
export function isSubjectValidForGrade(subject: string, grade: number): boolean {
  const option = SUBJECT_OPTIONS.find(s => s.value === subject)
  if (!option) return true // カスタム科目は常に有効
  const minOk = option.gradeMin === undefined || grade >= option.gradeMin
  const maxOk = option.gradeMax === undefined || grade <= option.gradeMax
  return minOk && maxOk
}
