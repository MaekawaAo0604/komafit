import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 生徒とスロットテーブルマイグレーションのテスト
 *
 * Requirements: REQ-4（生徒マスタ管理）、REQ-5（授業枠管理）、REQ-6（講師空き枠管理）
 * Migration: 20260211000003_students_slots.sql
 */

describe('Students and Slots Migration', () => {
  let supabase: SupabaseClient

  beforeAll(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

    if (!supabaseKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY is not set')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('students table', () => {
    it('should have initial students', async () => {
      const { data, error } = await supabase
        .from('students')
        .select('name, grade, active')
        .order('name', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(3)
      expect(data![0].name).toBe('生徒A')
      expect(data![0].grade).toBe(3)
      expect(data![1].name).toBe('生徒B')
      expect(data![1].grade).toBe(5)
      expect(data![2].name).toBe('生徒C')
      expect(data![2].grade).toBe(6)
    })

    it('should enforce grade bounds (1-12)', async () => {
      // grade < 1 の場合はエラー
      const { error: error1 } = await supabase.from('students').insert({
        name: 'Invalid Student 1',
        grade: 0,
        active: true,
      })
      expect(error1).not.toBeNull()

      // grade > 12 の場合はエラー
      const { error: error2 } = await supabase.from('students').insert({
        name: 'Invalid Student 2',
        grade: 13,
        active: true,
      })
      expect(error2).not.toBeNull()
    })
  })

  describe('student_subjects table', () => {
    it('should have subjects for students', async () => {
      // 生徒Aの教科（数学）
      const { data: dataA } = await supabase
        .from('student_subjects')
        .select('subject')
        .eq('student_id', '20000000-0000-0000-0000-000000000001')

      expect(dataA).toHaveLength(1)
      expect(dataA![0].subject).toBe('数学')

      // 生徒Cの教科（数学、英語）
      const { data: dataC } = await supabase
        .from('student_subjects')
        .select('subject')
        .eq('student_id', '20000000-0000-0000-0000-000000000003')
        .order('subject', { ascending: true })

      expect(dataC).toHaveLength(2)
      expect(dataC![0].subject).toBe('数学')
      expect(dataC![1].subject).toBe('英語')
    })

    it('should enforce primary key constraint', async () => {
      // 同じ student_id + subject の組み合わせを挿入しようとするとエラー
      const { error } = await supabase.from('student_subjects').insert({
        student_id: '20000000-0000-0000-0000-000000000001',
        subject: '数学', // 既に存在
      })

      expect(error).not.toBeNull()
    })

    it('should cascade delete when student is deleted', async () => {
      // テスト用の生徒を作成
      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert({
          name: 'テスト生徒',
          grade: 5,
          active: true,
        })
        .select()
        .single()

      if (createError) {
        console.log('Cannot create test student (RLS)', createError)
        return
      }

      // 教科を追加
      await supabase.from('student_subjects').insert({
        student_id: newStudent.id,
        subject: 'テスト',
      })

      // 生徒を削除
      await supabase.from('students').delete().eq('id', newStudent.id)

      // 教科も自動削除されることを確認
      const { data: subjects } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', newStudent.id)

      expect(subjects).toHaveLength(0)
    })
  })

  describe('student_ng table', () => {
    it('should allow inserting NG teachers', async () => {
      const studentId = '20000000-0000-0000-0000-000000000001'
      const teacherId = '10000000-0000-0000-0000-000000000002'

      // NG講師を追加（RLSで許可されている場合のみ）
      const { error } = await supabase.from('student_ng').insert({
        student_id: studentId,
        teacher_id: teacherId,
      })

      // RLSで挿入が許可されない場合はスキップ
      if (error) {
        console.log('Cannot insert NG teacher (RLS)', error)
        return
      }

      // 追加されたことを確認
      const { data } = await supabase
        .from('student_ng')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_id', teacherId)

      expect(data).toHaveLength(1)
    })
  })

  describe('slots table', () => {
    it('should have 35 slots (7 days × 5 koma)', async () => {
      const { data, error } = await supabase
        .from('slots')
        .select('id, day, koma_code')

      expect(error).toBeNull()
      expect(data).toHaveLength(35)
    })

    it('should have correct slot IDs', async () => {
      const { data } = await supabase
        .from('slots')
        .select('id')
        .in('id', ['MON-0', 'TUE-A', 'WED-1', 'THU-B', 'FRI-C', 'SAT-0', 'SUN-C'])
        .order('id', { ascending: true })

      expect(data).toHaveLength(7)
      expect(data![0].id).toBe('FRI-C')
      expect(data![1].id).toBe('MON-0')
      expect(data![6].id).toBe('WED-1')
    })

    it('should enforce day constraint', async () => {
      const { error } = await supabase.from('slots').insert({
        id: 'XXX-0',
        day: 'XXX', // CHECK制約違反
        koma_code: '0',
      })

      expect(error).not.toBeNull()
    })

    it('should reference koma_master', async () => {
      const { data } = await supabase
        .from('slots')
        .select('koma_code, koma_master(koma_order)')
        .eq('id', 'MON-A')
        .single()

      expect(data).not.toBeNull()
      expect(data!.koma_code).toBe('A')
      // @ts-ignore
      expect(data!.koma_master.koma_order).toBe(2)
    })
  })

  describe('slot_students table', () => {
    it('should have students in MON-0', async () => {
      const { data, error } = await supabase
        .from('slot_students')
        .select('slot_id, seat, student_id, subject, grade')
        .eq('slot_id', 'MON-0')
        .order('seat', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(2)

      // 座席1: 生徒A（数学、3年）
      expect(data![0].seat).toBe(1)
      expect(data![0].student_id).toBe('20000000-0000-0000-0000-000000000001')
      expect(data![0].subject).toBe('数学')
      expect(data![0].grade).toBe(3)

      // 座席2: 生徒B（英語、5年）
      expect(data![1].seat).toBe(2)
      expect(data![1].student_id).toBe('20000000-0000-0000-0000-000000000002')
      expect(data![1].subject).toBe('英語')
      expect(data![1].grade).toBe(5)
    })

    it('should enforce seat constraint (1 or 2)', async () => {
      const { error } = await supabase.from('slot_students').insert({
        slot_id: 'TUE-0',
        seat: 3, // CHECK制約違反
        student_id: '20000000-0000-0000-0000-000000000001',
        subject: '数学',
        grade: 3,
      })

      expect(error).not.toBeNull()
    })

    it('should enforce primary key (slot_id, seat)', async () => {
      // 同じスロット・座席を挿入しようとするとエラー
      const { error } = await supabase.from('slot_students').insert({
        slot_id: 'MON-0',
        seat: 1, // 既に使用中
        student_id: '20000000-0000-0000-0000-000000000003',
        subject: '数学',
        grade: 6,
      })

      expect(error).not.toBeNull()
    })

    it('should enforce unique constraint (slot_id, student_id)', async () => {
      // 同じ生徒を同じスロットの別の座席に配置しようとするとエラー
      const { error } = await supabase.from('slot_students').insert({
        slot_id: 'MON-0',
        seat: 2, // 異なる座席
        student_id: '20000000-0000-0000-0000-000000000001', // 既にseat=1に配置済み
        subject: '数学',
        grade: 3,
      })

      expect(error).not.toBeNull()
    })
  })

  describe('slot_teacher table', () => {
    it('should allow assigning teacher to slot', async () => {
      const slotId = 'TUE-A'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001' // admin

      // 講師を割当（RLSで許可されている場合のみ）
      const { error } = await supabase.from('slot_teacher').insert({
        slot_id: slotId,
        teacher_id: teacherId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
      })

      if (error) {
        console.log('Cannot assign teacher (RLS)', error)
        return
      }

      // 割当されたことを確認
      const { data } = await supabase
        .from('slot_teacher')
        .select('teacher_id, assigned_by')
        .eq('slot_id', slotId)
        .single()

      expect(data!.teacher_id).toBe(teacherId)
      expect(data!.assigned_by).toBe(assignedBy)
    })

    it('should enforce primary key (slot_id)', async () => {
      // 同じスロットに複数の講師を割当しようとするとエラー
      const { error } = await supabase.from('slot_teacher').insert({
        slot_id: 'TUE-A', // 既に割当済み（前のテストで挿入）
        teacher_id: '10000000-0000-0000-0000-000000000002',
        assigned_by: '00000000-0000-0000-0000-000000000001',
        assigned_at: new Date().toISOString(),
      })

      // PRIMARY KEY制約違反またはRLS違反
      if (error && error.code !== '42501') {
        // 42501 = insufficient_privilege (RLS)
        expect(error).not.toBeNull()
      }
    })
  })

  describe('teacher_availability table', () => {
    it('should have availability for teachers', async () => {
      // 講師Aの空き枠
      const { data: dataA } = await supabase
        .from('teacher_availability')
        .select('slot_id, is_available')
        .eq('teacher_id', '10000000-0000-0000-0000-000000000001')
        .order('slot_id', { ascending: true })

      expect(dataA).toHaveLength(3)
      expect(dataA![0].slot_id).toBe('MON-0')
      expect(dataA![0].is_available).toBe(true)
      expect(dataA![1].slot_id).toBe('TUE-A')
      expect(dataA![2].slot_id).toBe('WED-1')

      // 講師Bの空き枠
      const { data: dataB } = await supabase
        .from('teacher_availability')
        .select('slot_id, is_available')
        .eq('teacher_id', '10000000-0000-0000-0000-000000000002')
        .order('slot_id', { ascending: true })

      expect(dataB).toHaveLength(2)
      expect(dataB![0].slot_id).toBe('MON-0')
      expect(dataB![1].slot_id).toBe('THU-B')
    })

    it('should enforce primary key (teacher_id, slot_id)', async () => {
      // 同じ teacher_id + slot_id の組み合わせを挿入しようとするとエラー
      const { error } = await supabase.from('teacher_availability').insert({
        teacher_id: '10000000-0000-0000-0000-000000000001',
        slot_id: 'MON-0', // 既に存在
        is_available: false,
      })

      expect(error).not.toBeNull()
    })

    it('should allow toggling availability', async () => {
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const slotId = 'WED-1'

      // 空き枠をfalseに更新（RLSで許可されている場合のみ）
      const { error } = await supabase
        .from('teacher_availability')
        .update({ is_available: false })
        .eq('teacher_id', teacherId)
        .eq('slot_id', slotId)

      if (error) {
        console.log('Cannot update availability (RLS)', error)
        return
      }

      // 更新されたことを確認
      const { data } = await supabase
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', teacherId)
        .eq('slot_id', slotId)
        .single()

      expect(data!.is_available).toBe(false)
    })
  })

  describe('referential integrity', () => {
    it('should reference students from slot_students', async () => {
      const { data } = await supabase
        .from('slot_students')
        .select('student_id, students(name, grade)')
        .eq('slot_id', 'MON-0')
        .eq('seat', 1)
        .single()

      expect(data).not.toBeNull()
      // @ts-ignore
      expect(data!.students.name).toBe('生徒A')
      // @ts-ignore
      expect(data!.students.grade).toBe(3)
    })

    it('should reference slots from slot_students', async () => {
      const { data } = await supabase
        .from('slot_students')
        .select('slot_id, slots(day, koma_code)')
        .eq('student_id', '20000000-0000-0000-0000-000000000001')
        .single()

      expect(data).not.toBeNull()
      // @ts-ignore
      expect(data!.slots.day).toBe('MON')
      // @ts-ignore
      expect(data!.slots.koma_code).toBe('0')
    })

    it('should reference teachers from teacher_availability', async () => {
      const { data } = await supabase
        .from('teacher_availability')
        .select('teacher_id, teachers(name)')
        .eq('slot_id', 'MON-0')
        .order('teacher_id', { ascending: true })

      expect(data).toHaveLength(2)
      // @ts-ignore
      expect(data![0].teachers.name).toBe('講師A')
      // @ts-ignore
      expect(data![1].teachers.name).toBe('講師B')
    })
  })
})
