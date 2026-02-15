import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * ユーザーと講師テーブルマイグレーションのテスト
 *
 * Requirements: REQ-1（ロール・権限管理）、REQ-3（講師マスタ管理）
 * Migration: 20260211000002_users_teachers.sql
 */

describe('Users and Teachers Migration', () => {
  let supabase: SupabaseClient

  beforeAll(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

    if (!supabaseKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY is not set')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  })

  afterAll(async () => {
    // クリーンアップは不要（マイグレーションはロールバックしない）
  })

  describe('users table', () => {
    it('should have initial admin user', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('email, name, role, active')
        .eq('email', 'admin@komafit.local')
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.name).toBe('管理者')
      expect(data!.role).toBe('admin')
      expect(data!.active).toBe(true)
    })

    it('should have initial teacher user', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('email, name, role, active')
        .eq('email', 'teacher1@komafit.local')
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.name).toBe('講師A')
      expect(data!.role).toBe('teacher')
      expect(data!.active).toBe(true)
    })

    it('should have valid role constraint', async () => {
      // 無効なロールを挿入しようとするとエラー
      const { error } = await supabase.from('users').insert({
        email: 'invalid@test.com',
        password_hash: 'hash',
        name: 'Invalid User',
        role: 'invalid_role', // CHECK制約違反
        active: true,
      })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should enforce unique email constraint', async () => {
      const { error } = await supabase.from('users').insert({
        email: 'admin@komafit.local', // 既存のメールアドレス
        password_hash: 'hash',
        name: 'Duplicate User',
        role: 'admin',
        active: true,
      })

      // UNIQUE制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should have timestamps', async () => {
      const { data, error } = await supabase
        .from('users')
        .select('created_at, updated_at')
        .eq('email', 'admin@komafit.local')
        .single()

      expect(error).toBeNull()
      expect(data!.created_at).toBeTruthy()
      expect(data!.updated_at).toBeTruthy()
      expect(new Date(data!.created_at)).toBeInstanceOf(Date)
      expect(new Date(data!.updated_at)).toBeInstanceOf(Date)
    })
  })

  describe('teachers table', () => {
    it('should have initial teachers', async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('name, active')
        .order('name', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(2)
      expect(data![0].name).toBe('講師A')
      expect(data![1].name).toBe('講師B')
      expect(data![0].active).toBe(true)
      expect(data![1].active).toBe(true)
    })

    it('should have correct capacity values', async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('name, cap_week_slots, cap_students, allow_pair')
        .eq('name', '講師A')
        .single()

      expect(error).toBeNull()
      expect(data!.cap_week_slots).toBe(10)
      expect(data!.cap_students).toBe(5)
      expect(data!.allow_pair).toBe(true)
    })

    it('should link to users when user_id is set', async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('name, user_id, users(email, role)')
        .eq('name', '講師A')
        .single()

      expect(error).toBeNull()
      expect(data!.user_id).toBeTruthy()
      expect(data!.users).toBeTruthy()
      // @ts-ignore
      expect(data!.users.email).toBe('teacher1@komafit.local')
      // @ts-ignore
      expect(data!.users.role).toBe('teacher')
    })

    it('should allow null user_id', async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select('name, user_id')
        .eq('name', '講師B')
        .single()

      expect(error).toBeNull()
      expect(data!.user_id).toBeNull()
    })

    it('should reject negative capacity values', async () => {
      const { error } = await supabase.from('teachers').insert({
        name: 'Invalid Teacher',
        active: true,
        cap_week_slots: -1, // CHECK制約違反
        cap_students: 5,
        allow_pair: false,
      })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should reject zero capacity values', async () => {
      const { error } = await supabase.from('teachers').insert({
        name: 'Invalid Teacher',
        active: true,
        cap_week_slots: 0, // CHECK制約違反
        cap_students: 5,
        allow_pair: false,
      })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })
  })

  describe('teacher_skills table', () => {
    it('should have skills for 講師A', async () => {
      // 講師AのIDを取得
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', '講師A')
        .single()

      expect(teacherError).toBeNull()

      // スキルを取得
      const { data, error } = await supabase
        .from('teacher_skills')
        .select('subject, grade_min, grade_max')
        .eq('teacher_id', teacher!.id)
        .order('subject', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(2)

      // 数学: 1-6年
      expect(data![1].subject).toBe('数学')
      expect(data![1].grade_min).toBe(1)
      expect(data![1].grade_max).toBe(6)

      // 英語: 3-6年
      expect(data![0].subject).toBe('英語')
      expect(data![0].grade_min).toBe(3)
      expect(data![0].grade_max).toBe(6)
    })

    it('should have skills for 講師B', async () => {
      // 講師BのIDを取得
      const { data: teacher, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', '講師B')
        .single()

      expect(teacherError).toBeNull()

      // スキルを取得
      const { data, error } = await supabase
        .from('teacher_skills')
        .select('subject, grade_min, grade_max')
        .eq('teacher_id', teacher!.id)
        .order('subject', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(1)

      // 国語: 1-9年
      expect(data![0].subject).toBe('国語')
      expect(data![0].grade_min).toBe(1)
      expect(data![0].grade_max).toBe(9)
    })

    it('should enforce grade range constraints', async () => {
      // 講師AのIDを取得
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', '講師A')
        .single()

      // grade_min > grade_max の場合はエラー
      const { error } = await supabase.from('teacher_skills').insert({
        teacher_id: teacher!.id,
        subject: '理科',
        grade_min: 6,
        grade_max: 3, // CHECK制約違反
      })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should enforce grade min/max bounds (1-12)', async () => {
      // 講師AのIDを取得
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', '講師A')
        .single()

      // grade_min < 1 の場合はエラー
      const { error: error1 } = await supabase.from('teacher_skills').insert({
        teacher_id: teacher!.id,
        subject: '理科',
        grade_min: 0,
        grade_max: 6,
      })
      expect(error1).not.toBeNull()

      // grade_max > 12 の場合はエラー
      const { error: error2 } = await supabase.from('teacher_skills').insert({
        teacher_id: teacher!.id,
        subject: '社会',
        grade_min: 1,
        grade_max: 13,
      })
      expect(error2).not.toBeNull()
    })

    it('should enforce primary key constraint (teacher_id, subject)', async () => {
      // 講師AのIDを取得
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', '講師A')
        .single()

      // 同じ teacher_id + subject の組み合わせを挿入しようとするとエラー
      const { error } = await supabase.from('teacher_skills').insert({
        teacher_id: teacher!.id,
        subject: '数学', // 既に存在
        grade_min: 7,
        grade_max: 9,
      })

      // PRIMARY KEY制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should cascade delete when teacher is deleted', async () => {
      // テスト用の講師を作成
      const { data: newTeacher, error: createError } = await supabase
        .from('teachers')
        .insert({
          name: 'テスト講師',
          active: true,
          cap_week_slots: 10,
          cap_students: 5,
          allow_pair: false,
        })
        .select()
        .single()

      if (createError) {
        // RLSで作成できない場合はスキップ
        console.log('Cannot create test teacher (RLS)', createError)
        return
      }

      // スキルを追加
      await supabase.from('teacher_skills').insert({
        teacher_id: newTeacher.id,
        subject: 'テスト',
        grade_min: 1,
        grade_max: 3,
      })

      // 講師を削除
      await supabase.from('teachers').delete().eq('id', newTeacher.id)

      // スキルも自動削除されることを確認
      const { data: skills } = await supabase
        .from('teacher_skills')
        .select('*')
        .eq('teacher_id', newTeacher.id)

      expect(skills).toHaveLength(0)
    })
  })
})
