/**
 * Reports Service
 *
 * レポート機能のデータ取得・集計ロジック
 */

import { supabase } from '@/lib/supabase'

export interface TeacherKomaCount {
  teacherId: string
  teacherName: string
  komaCount: number
  koma1on1: number
  koma1on2: number
  studentCount: number
}

/**
 * 講師別コマ数を集計する
 *
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 * @param teacherId 特定講師のみ取得する場合に指定
 */
export async function getTeacherKomaCounts(
  startDate: string,
  endDate: string,
  teacherId?: string
): Promise<TeacherKomaCount[]> {
  let query = supabase
    .from('assignments')
    .select('teacher_id, date, time_slot_id, teachers(name)')
    .gte('date', startDate)
    .lte('date', endDate)

  if (teacherId) {
    query = query.eq('teacher_id', teacherId)
  }

  const { data: rawData, error } = await query

  if (error) {
    throw new Error(`コマ数レポートの取得に失敗しました: ${error.message}`)
  }

  const data = (rawData || []) as any[]

  const teacherMap = new Map<string, {
    name: string
    komaStudentCount: Map<string, number>
    totalRows: number
  }>()

  for (const row of data) {
    const tid = row.teacher_id
    if (!teacherMap.has(tid)) {
      teacherMap.set(tid, {
        name: row.teachers?.name || '不明',
        komaStudentCount: new Map(),
        totalRows: 0,
      })
    }
    const entry = teacherMap.get(tid)!
    const komaKey = `${row.date}-${row.time_slot_id}`
    entry.komaStudentCount.set(komaKey, (entry.komaStudentCount.get(komaKey) || 0) + 1)
    entry.totalRows++
  }

  const results: TeacherKomaCount[] = []
  for (const [id, entry] of teacherMap) {
    let koma1on1 = 0
    let koma1on2 = 0
    for (const count of entry.komaStudentCount.values()) {
      if (count >= 2) koma1on2++
      else koma1on1++
    }
    results.push({
      teacherId: id,
      teacherName: entry.name,
      komaCount: entry.komaStudentCount.size,
      koma1on1,
      koma1on2,
      studentCount: entry.totalRows,
    })
  }

  results.sort((a, b) => b.komaCount - a.komaCount)
  return results
}

/**
 * ログイン中ユーザーに紐づくteacher_idを取得
 */
export async function getMyTeacherId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return (data as any).id
}
