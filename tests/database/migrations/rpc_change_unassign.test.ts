import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * RPC関数 change_teacher, unassign_teacher のテスト
 *
 * Requirements: REQ-10（講師割当の確定）、REQ-11（割当の変更・削除）
 * Migration: 20260211000008_rpc_change_unassign.sql
 */

describe('RPC Functions: change_teacher, unassign_teacher', () => {
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

  beforeEach(async () => {
    if (!supabaseServiceRole) {
      return
    }

    // テスト前の準備: WED-Aに講師Aを割当
    await supabaseServiceRole
      .from('teacher_availability')
      .upsert({
        teacher_id: '10000000-0000-0000-0000-000000000001',
        slot_id: 'WED-A',
        is_available: true,
      })

    await supabaseServiceRole.rpc('assign_teacher', {
      p_slot_id: 'WED-A',
      p_teacher_id: '10000000-0000-0000-0000-000000000001',
      p_assigned_by: '00000000-0000-0000-0000-000000000001',
    })
  })

  afterEach(async () => {
    if (!supabaseServiceRole) {
      return
    }

    // テスト後のクリーンアップ: WED-Aの割当を削除
    await supabaseServiceRole
      .from('slot_teacher')
      .delete()
      .eq('slot_id', 'WED-A')

    // 空き枠を復元
    await supabaseServiceRole
      .from('teacher_availability')
      .upsert({
        teacher_id: '10000000-0000-0000-0000-000000000001',
        slot_id: 'WED-A',
        is_available: true,
      })

    await supabaseServiceRole
      .from('teacher_availability')
      .upsert({
        teacher_id: '10000000-0000-0000-0000-000000000002',
        slot_id: 'WED-A',
        is_available: true,
      })
  })

  describe('Function existence', () => {
    it('should have change_teacher function', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const { data, error } = await supabaseServiceRole
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'change_teacher')
        .limit(1)

      if (error) {
        console.log('Cannot query pg_proc', error)
        return
      }

      expect(data!.length).toBeGreaterThan(0)
      expect(data![0].proname).toBe('change_teacher')
    })

    it('should have unassign_teacher function', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const { data, error } = await supabaseServiceRole
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'unassign_teacher')
        .limit(1)

      if (error) {
        console.log('Cannot query pg_proc', error)
        return
      }

      expect(data!.length).toBeGreaterThan(0)
      expect(data![0].proname).toBe('unassign_teacher')
    })
  })

  describe('change_teacher function', () => {
    it('should change teacher assignment', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const newTeacherId = '10000000-0000-0000-0000-000000000002' // 講師B
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // change_teacher関数を実行
      const { data, error } = await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: newTeacherId,
        p_assigned_by: assignedBy,
      })

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data![0].slot_id).toBe(slotId)
      expect(data![0].teacher_id).toBe(newTeacherId)
    })

    it('should update slot_teacher table', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const newTeacherId = '10000000-0000-0000-0000-000000000002'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 変更実行
      await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: newTeacherId,
        p_assigned_by: assignedBy,
      })

      // slot_teacherテーブルを確認
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('teacher_id')
        .eq('slot_id', slotId)
        .single()

      expect(data!.teacher_id).toBe(newTeacherId)
    })

    it('should restore old teacher availability', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const oldTeacherId = '10000000-0000-0000-0000-000000000001'
      const newTeacherId = '10000000-0000-0000-0000-000000000002'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 変更前: 講師Aの空き枠は消化されている
      const { data: beforeData } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', oldTeacherId)
        .eq('slot_id', slotId)
        .single()

      expect(beforeData!.is_available).toBe(false)

      // 変更実行
      await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: newTeacherId,
        p_assigned_by: assignedBy,
      })

      // 変更後: 講師Aの空き枠が復元される
      const { data: afterData } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', oldTeacherId)
        .eq('slot_id', slotId)
        .single()

      expect(afterData!.is_available).toBe(true)
    })

    it('should mark new teacher availability as unavailable', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const newTeacherId = '10000000-0000-0000-0000-000000000002'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 事前に講師Bの空き枠を有効にする
      await supabaseServiceRole.from('teacher_availability').upsert({
        teacher_id: newTeacherId,
        slot_id: slotId,
        is_available: true,
      })

      // 変更実行
      await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: newTeacherId,
        p_assigned_by: assignedBy,
      })

      // 講師Bの空き枠が消化される
      const { data } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', newTeacherId)
        .eq('slot_id', slotId)
        .single()

      expect(data!.is_available).toBe(false)
    })

    it('should create audit log entry with CHANGE action', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const newTeacherId = '10000000-0000-0000-0000-000000000002'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 変更実行
      await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: newTeacherId,
        p_assigned_by: assignedBy,
      })

      // 最新のCHANGEログを確認
      const { data: log } = await supabaseServiceRole
        .from('audit_logs')
        .select('actor_id, action, payload')
        .eq('action', 'CHANGE')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      expect(log!.actor_id).toBe(assignedBy)
      expect(log!.action).toBe('CHANGE')

      const payload = log!.payload as Record<string, string>
      expect(payload.slot_id).toBe(slotId)
      expect(payload.old_teacher_id).toBe('10000000-0000-0000-0000-000000000001')
      expect(payload.old_teacher_name).toBe('講師A')
      expect(payload.new_teacher_id).toBe(newTeacherId)
      expect(payload.new_teacher_name).toBe('講師B')
    })

    it('should fail if no teacher is assigned', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      // 割当がないスロット
      const slotId = 'THU-C'

      const { error } = await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: '10000000-0000-0000-0000-000000000002',
        p_assigned_by: '00000000-0000-0000-0000-000000000001',
      })

      expect(error).not.toBeNull()
      expect(error!.message).toContain('No teacher assigned')
    })
  })

  describe('unassign_teacher function', () => {
    it('should unassign teacher from slot', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // unassign_teacher関数を実行
      const { data, error } = await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: assignedBy,
      })

      expect(error).toBeNull()
      expect(data).toBe(true)
    })

    it('should delete from slot_teacher table', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 解除実行
      await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: assignedBy,
      })

      // slot_teacherテーブルから削除されたことを確認
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('*')
        .eq('slot_id', slotId)

      expect(data).toEqual([])
    })

    it('should restore teacher availability', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const teacherId = '10000000-0000-0000-0000-000000000001'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 解除前: 講師Aの空き枠は消化されている
      const { data: beforeData } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', teacherId)
        .eq('slot_id', slotId)
        .single()

      expect(beforeData!.is_available).toBe(false)

      // 解除実行
      await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: assignedBy,
      })

      // 解除後: 講師Aの空き枠が復元される
      const { data: afterData } = await supabaseServiceRole
        .from('teacher_availability')
        .select('is_available')
        .eq('teacher_id', teacherId)
        .eq('slot_id', slotId)
        .single()

      expect(afterData!.is_available).toBe(true)
    })

    it('should create audit log entry with UNASSIGN action', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const assignedBy = '00000000-0000-0000-0000-000000000001'

      // 解除実行
      await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: assignedBy,
      })

      // 最新のUNASSIGNログを確認
      const { data: log } = await supabaseServiceRole
        .from('audit_logs')
        .select('actor_id, action, payload')
        .eq('action', 'UNASSIGN')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      expect(log!.actor_id).toBe(assignedBy)
      expect(log!.action).toBe('UNASSIGN')

      const payload = log!.payload as Record<string, string>
      expect(payload.slot_id).toBe(slotId)
      expect(payload.teacher_id).toBe('10000000-0000-0000-0000-000000000001')
      expect(payload.teacher_name).toBe('講師A')
    })

    it('should fail if no teacher is assigned', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      // 割当がないスロット
      const slotId = 'THU-C'

      const { error } = await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: '00000000-0000-0000-0000-000000000001',
      })

      expect(error).not.toBeNull()
      expect(error!.message).toContain('No teacher assigned')
    })
  })

  describe('Transaction integrity', () => {
    it('should rollback change_teacher if audit log fails', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const invalidUserId = '00000000-0000-0000-0000-999999999999'

      // 無効なassigned_byでエラーを発生させる
      const { error } = await supabaseServiceRole.rpc('change_teacher', {
        p_slot_id: slotId,
        p_new_teacher_id: '10000000-0000-0000-0000-000000000002',
        p_assigned_by: invalidUserId,
      })

      expect(error).not.toBeNull()

      // 割当が変更されていないことを確認（ロールバック）
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('teacher_id')
        .eq('slot_id', slotId)
        .single()

      // 元の講師Aのまま
      expect(data!.teacher_id).toBe('10000000-0000-0000-0000-000000000001')
    })

    it('should rollback unassign_teacher if audit log fails', async () => {
      if (!supabaseServiceRole) {
        console.log('Skipping: SUPABASE_SERVICE_ROLE_KEY not set')
        return
      }

      const slotId = 'WED-A'
      const invalidUserId = '00000000-0000-0000-0000-999999999999'

      const { error } = await supabaseServiceRole.rpc('unassign_teacher', {
        p_slot_id: slotId,
        p_assigned_by: invalidUserId,
      })

      expect(error).not.toBeNull()

      // 割当が残っていることを確認（ロールバック）
      const { data } = await supabaseServiceRole
        .from('slot_teacher')
        .select('*')
        .eq('slot_id', slotId)

      expect(data!.length).toBe(1)
    })
  })
})
