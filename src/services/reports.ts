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
    komaSet: Set<string>
    totalRows: number
  }>()

  for (const row of data) {
    const tid = row.teacher_id
    if (!teacherMap.has(tid)) {
      teacherMap.set(tid, {
        name: row.teachers?.name || '不明',
        komaSet: new Set(),
        totalRows: 0,
      })
    }
    const entry = teacherMap.get(tid)!
    entry.komaSet.add(`${row.date}-${row.time_slot_id}`)
    entry.totalRows++
  }

  const results: TeacherKomaCount[] = []
  for (const [id, entry] of teacherMap) {
    results.push({
      teacherId: id,
      teacherName: entry.name,
      komaCount: entry.komaSet.size,
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
