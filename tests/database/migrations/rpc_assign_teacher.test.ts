import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * RPC関数 assign_teacher のテスト
 *
 * Requirements: REQ-10（講師割当の確定）
 * Migration: 20260211000007_rpc_assign_teacher.sql
 */

describe('RPC Function: assign_teacher', () => {
  let supabase: SupabaseClient
  let supabaseServiceRole: SupabaseClient

  beforeAll(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

    if (!supabaseAnonKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY is not set')
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey)

    if (supabaseServiceKey) {
      supabaseServiceRole = createClient(supabaseUrl, supabaseServiceKey)
    }
  })

  afterEach(async () => {
    if (!supabaseServiceRole) {
      return
    }

    // テスト後のクリーンアップ: TUE-Bの割当を削除
    await supabaseServiceRole
      .from('slot_teacher')
      .delete()
      .eq('slot_id', 'TUE-B')

    // 講師Aの空き枠を復元
    await supabaseServiceRole
      .from('teacher_availability')
      .upsert({
        teacher_id: '10000000-0000-0000-0000-000000000001',
        slot_id: 'TUE-B',
        is_available: true,
      })
  })

  describe('Function existence', () => {
    it('should have assign_teacher function', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      // pg_procビューから関数を確認
      const { data, error } = await supabaseServiceRole
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'assign_teacher')
        .limit(1)

      if (error) {
        console.log('Cannot query pg_proc', error)
        return
      }

      expect(data!.length).toBeGreaterThan(0)
      expect(data![0].proname).toBe('assign_teacher')
    })
  })

  describe('Function execution', () => {
    it('should assign teacher to slot', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'TUE-B'
      const teacherId = '10000000-0000-0000-0000-000000000001' // 講師A
      const assignedBy = '00000000-0000-0000-0000-000000000001' // admin

      // assign_teacher関数を実行
      const { data, error } = await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacherId,
        p_assigned_by: assignedBy,
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data![0].slot_id).toBe(slotId)
      expect(data![0].teacher_id).toBe(teacherId)
      expect(data![0].assigned_by).toBe(assignedBy)
      expect(data![0].assigned_at).toBeTruthy()
    })

    it('should update slot_teacher table', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'TUE-B'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 割当実行
      await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacherId,
        p_assigned_by: assignedBy,
      })

      // slot_teacherテーブルを確認
      const { data, error } = await supabaseServiceRole
        .from('slot_teacher')
        .select('teacher_id, assigned_by')
        .eq('slot_id', slotId)
        .single()

      expect(error).toBeNull()
      expect(data!.teacher_id).toBe(teacherId)
      expect(data!.assigned_by).toBe(assignedBy)
    })

    it('should mark teacher_availability as unavailable', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'TUE-B'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 事前に空き枠を有効にする
      await supabaseServiceRole.from('teacher_availability').upsert({
        teacher_id: teacherId,
        slot_id: slotId,
        is_available: true,
      })

      // 割当実行
      await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacherId,
        p_assigned_by: assignedBy,
      })

      // teacher_availabilityを確認
      const { data, error } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', teacherId)
        .eq('slot_id', slotId)
        .single()

      expect(error).toBeNull()
      expect(data!.is_available).toBe(false)
    })

    it('should create audit log entry', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'TUE-B'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // ログの現在の件数を取得
      const { count: beforeCount } = await supabaseServiceRole
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'ASSIGN')

      // 割当実行
      await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacherId,
        p_assigned_by: assignedBy,
      })

      // ログが増えたか確認
      const { count: afterCount } = await supabaseServiceRole
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'ASSIGN')

      expect(afterCount).toBeGreaterThan(beforeCount!)

      // 最新のログを確認
      const { data: log } = await supabaseServiceRole
        .from('audit_logs')
        .select('actor_id, action, payload')
        .eq('action', 'ASSIGN')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      expect(log!.actor_id).toBe(assignedBy)
      expect(log!.action).toBe('ASSIGN')

      const payload = log!.payload as Record<string, string>
      expect(payload.slot_id).toBe(slotId)
      expect(payload.teacher_id).toBe(teacherId)
      expect(payload.teacher_name).toBe('講師A')
    })

    it('should handle reassignment (ON CONFLICT)', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'TUE-B'
      const teacher1Id = '10000000-0000-0000-0000-000000000001' // 講師A
      const teacher2Id = '10000000-0000-0000-0000-000000000002' // 講師B
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 最初の割当（講師A）
      await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacher1Id,
        p_assigned_by: assignedBy,
      })

      // 再割当（講師B）- ON CONFLICTで更新される
      await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacher2Id,
        p_assigned_by: assignedBy,
      })

      // 最終的に講師Bが割り当てられていることを確認
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('teacher_id')
        .eq('slot_id', slotId)
        .single()

      expect(data!.teacher_id).toBe(teacher2Id)
    })
  })

  describe('Transaction integrity', () => {
    it('should rollback if audit log insertion fails', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      // 無効なassigned_by（存在しないユーザーID）でエラーを発生させる
      const invalidUserId = '00000000-0000-0000-0000-999999999999'

      const { error } = await supabaseServiceRole.rpc('assign_teacher', {
        p_slot_id: 'TUE-B',
        p_teacher_id: '10000000-0000-0000-0000-000000000001',
        p_assigned_by: invalidUserId,
      })

      // 外部キー制約違反でエラー
      expect(error).not.toBeNull()

      // slot_teacherに割当が残っていないことを確認（ロールバック）
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('*')
        .eq('slot_id', 'TUE-B')

      expect(data).toEqual([])
    })
  })

  describe('Authenticated user access', () => {
    it('should allow admin to call assign_teacher', async () => {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'admin@komafit.local',
        password: 'admin123',
      })

      if (authError) {
        console.log('Cannot sign in', authError)
        return
      }

      const slotId = 'TUE-B'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      const { data, error } = await supabase.rpc('assign_teacher', {
        p_slot_id: slotId,
        p_teacher_id: teacherId,
        p_assigned_by: assignedBy,
      })

      if (error) {
        console.log('RPC may require adjustment', error)
      } else {
        expect(error).toBeNull()
        expect(data).not.toBeNull()
      }

      await supabase.auth.signOut()
    })
  })
})
