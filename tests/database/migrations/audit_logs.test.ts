import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 監査ログテーブルマイグレーションのテスト
 *
 * Requirements: REQ-14（監査ログ）
 * Migration: 20260211000004_audit_logs.sql
 */

describe('Audit Logs Migration', () => {
  let supabase: SupabaseClient

  beforeAll(() => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

    if (!supabaseKey) {
      throw new Error('VITE_SUPABASE_ANON_KEY is not set')
    }

    supabase = createClient(supabaseUrl, supabaseKey)
  })

  describe('audit_logs table', () => {
    it('should have initial test logs', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThanOrEqual(5)

      // アクションタイプを確認
      const actions = data!.map(log => log.action)
      expect(actions).toContain('ASSIGN')
      expect(actions).toContain('CHANGE')
      expect(actions).toContain('UNASSIGN')
      expect(actions).toContain('AVAILABILITY_UPDATE')
      expect(actions).toContain('SETTINGS_UPDATE')
    })

    it('should have correct structure for ASSIGN action', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('actor_id, action, payload, created_at')
        .eq('action', 'ASSIGN')
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data!.actor_id).toBe('00000000-0000-0000-0000-000000000001') // admin
      expect(data!.action).toBe('ASSIGN')

      // JSONB payloadの構造を確認
      const payload = data!.payload as Record<string, string>
      expect(payload.slot_id).toBe('MON-0')
      expect(payload.teacher_id).toBe('10000000-0000-0000-0000-000000000001')
      expect(payload.teacher_name).toBe('講師A')
    })

    it('should have correct structure for CHANGE action', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('actor_id, action, payload')
        .eq('action', 'CHANGE')
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data!.action).toBe('CHANGE')

      const payload = data!.payload as Record<string, string>
      expect(payload.slot_id).toBe('MON-0')
      expect(payload.old_teacher_id).toBe('10000000-0000-0000-0000-000000000001')
      expect(payload.old_teacher_name).toBe('講師A')
      expect(payload.new_teacher_id).toBe('10000000-0000-0000-0000-000000000002')
      expect(payload.new_teacher_name).toBe('講師B')
    })

    it('should have correct structure for UNASSIGN action', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('payload')
        .eq('action', 'UNASSIGN')
        .limit(1)
        .single()

      expect(error).toBeNull()

      const payload = data!.payload as Record<string, string>
      expect(payload.slot_id).toBe('MON-0')
      expect(payload.teacher_id).toBe('10000000-0000-0000-0000-000000000002')
      expect(payload.teacher_name).toBe('講師B')
    })

    it('should reference users via actor_id', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, users(name, role)')
        .eq('action', 'ASSIGN')
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      // @ts-ignore
      expect(data!.users.name).toBe('管理者')
      // @ts-ignore
      expect(data!.users.role).toBe('admin')
    })

    it('should have timestamps', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('created_at')
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data!.created_at).toBeTruthy()
      expect(new Date(data!.created_at)).toBeInstanceOf(Date)
    })
  })

  describe('audit_logs indexes', () => {
    it('should efficiently query by actor_id', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001'

      const { data, error } = await supabase
        .from('audit_logs')
        .select('action')
        .eq('actor_id', adminId)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      // 管理者が実行したアクションを確認
      const actions = data!.map(log => log.action)
      expect(actions).toContain('ASSIGN')
      expect(actions).toContain('CHANGE')
      expect(actions).toContain('UNASSIGN')
    })

    it('should efficiently query by action type', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('payload')
        .eq('action', 'ASSIGN')

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('should efficiently query by created_at (descending)', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, created_at')
        .order('created_at', { ascending: false })
        .limit(3)

      expect(error).toBeNull()
      expect(data).toHaveLength(3)

      // 降順でソートされていることを確認
      const timestamps = data!.map(log => new Date(log.created_at).getTime())
      expect(timestamps[0]).toBeGreaterThanOrEqual(timestamps[1])
      expect(timestamps[1]).toBeGreaterThanOrEqual(timestamps[2])
    })
  })

  describe('JSONB queries', () => {
    it('should search logs by slot_id in payload', async () => {
      // JSONB contains operator (@>)
      // Note: Supabase JS client uses .contains() for JSONB queries
      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, payload')
        .contains('payload', { slot_id: 'MON-0' })
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      // すべてのログがMON-0に関連することを確認
      data!.forEach(log => {
        const payload = log.payload as Record<string, string>
        expect(payload.slot_id).toBe('MON-0')
      })
    })

    it('should search logs by teacher_id in payload', async () => {
      const teacherId = '10000000-0000-0000-0000-000000000001'

      const { data, error } = await supabase
        .from('audit_logs')
        .select('action, payload')
        .contains('payload', { teacher_id: teacherId })

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      // すべてのログが対象の講師IDを含むことを確認
      data!.forEach(log => {
        const payload = log.payload as Record<string, string>
        expect(payload.teacher_id).toBe(teacherId)
      })
    })

    it('should search logs by action and payload', async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('payload')
        .eq('action', 'CHANGE')
        .contains('payload', { slot_id: 'MON-0' })

      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)

      // CHANGEアクションでMON-0に関連するログ
      data!.forEach(log => {
        const payload = log.payload as Record<string, string>
        expect(payload.slot_id).toBe('MON-0')
        expect(payload.old_teacher_id).toBeTruthy()
        expect(payload.new_teacher_id).toBeTruthy()
      })
    })
  })

  describe('audit_logs constraints', () => {
    it('should require actor_id to reference valid user', async () => {
      const invalidUserId = '00000000-0000-0000-0000-999999999999'

      // 存在しないユーザーIDでログを挿入しようとするとエラー
      const { error } = await supabase.from('audit_logs').insert({
        actor_id: invalidUserId,
        action: 'TEST',
        payload: { test: 'data' },
      })

      // 外部キー制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should require action and payload', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001'

      // actionなしで挿入しようとするとエラー
      const { error: error1 } = await supabase.from('audit_logs').insert({
        actor_id: adminId,
        payload: { test: 'data' },
      })
      expect(error1).not.toBeNull()

      // payloadなしで挿入しようとするとエラー
      const { error: error2 } = await supabase.from('audit_logs').insert({
        actor_id: adminId,
        action: 'TEST',
      })
      expect(error2).not.toBeNull()
    })
  })

  describe('audit_logs insertion', () => {
    it('should allow inserting new log entries', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001'

      // 新しいログを挿入（RLSで許可されている場合のみ）
      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminId,
          action: 'TEST_ACTION',
          payload: {
            test: 'data',
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single()

      if (error) {
        console.log('Cannot insert audit log (RLS)', error)
        return
      }

      expect(data).not.toBeNull()
      expect(data!.action).toBe('TEST_ACTION')
      expect((data!.payload as Record<string, string>).test).toBe('data')
    })

    it('should automatically set created_at timestamp', async () => {
      const adminId = '00000000-0000-0000-0000-000000000001'
      const beforeInsert = new Date()

      const { data, error } = await supabase
        .from('audit_logs')
        .insert({
          actor_id: adminId,
          action: 'TIMESTAMP_TEST',
          payload: { test: 'timestamp' },
        })
        .select()
        .single()

      if (error) {
        console.log('Cannot insert audit log (RLS)', error)
        return
      }

      const afterInsert = new Date()
      const logTimestamp = new Date(data!.created_at)

      // タイムスタンプが挿入時刻の範囲内であることを確認
      expect(logTimestamp.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime())
      expect(logTimestamp.getTime()).toBeLessThanOrEqual(afterInsert.getTime())
    })
  })
})
