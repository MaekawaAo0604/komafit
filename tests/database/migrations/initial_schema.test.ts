import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 初期スキーママイグレーションのテスト
 *
 * Requirements: REQ-2（コマ・スロット定義マスタ）、REQ-17（システム設定管理）
 * Migration: 20260211000001_initial_schema.sql
 */

describe('Initial Schema Migration', () => {
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

  describe('koma_master table', () => {
    it('should have all 5 koma codes', async () => {
      const { data, error } = await supabase
        .from('koma_master')
        .select('code, koma_order')
        .order('koma_order', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(5)

      // 順序通りに取得されることを確認
      expect(data![0].code).toBe('0')
      expect(data![1].code).toBe('1')
      expect(data![2].code).toBe('A')
      expect(data![3].code).toBe('B')
      expect(data![4].code).toBe('C')
    })

    it('should have correct display order', async () => {
      const { data, error } = await supabase
        .from('koma_master')
        .select('koma_order')
        .order('koma_order', { ascending: true })

      expect(error).toBeNull()
      expect(data!.map(row => row.koma_order)).toEqual([0, 1, 2, 3, 4])
    })

    it('should reject invalid koma codes', async () => {
      // RLSが有効な場合、この操作は失敗する可能性があります
      const { error } = await supabase
        .from('koma_master')
        .insert({ code: 'X', koma_order: 5 })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should reject duplicate koma_order', async () => {
      const { error } = await supabase
        .from('koma_master')
        .insert({ code: 'D', koma_order: 0 })

      // UNIQUE制約違反またはRLS違反
      expect(error).not.toBeNull()
    })
  })

  describe('settings table', () => {
    it('should have singleton record with id=1', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .single()

      expect(error).toBeNull()
      expect(data).not.toBeNull()
      expect(data!.id).toBe(1)
    })

    it('should have correct default weight values', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('load_weight, continuity_weight, grade_diff_weight')
        .eq('id', 1)
        .single()

      expect(error).toBeNull()
      expect(data!.load_weight).toBe(1.0)
      expect(data!.continuity_weight).toBe(0.5)
      expect(data!.grade_diff_weight).toBe(0.3)
    })

    it('should have correct 1:2 rule defaults', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('pair_same_subject_required, pair_max_grade_diff')
        .eq('id', 1)
        .single()

      expect(error).toBeNull()
      expect(data!.pair_same_subject_required).toBe(true)
      expect(data!.pair_max_grade_diff).toBe(2)
    })

    it('should have updated_at timestamp', async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('updated_at')
        .eq('id', 1)
        .single()

      expect(error).toBeNull()
      expect(data!.updated_at).toBeTruthy()
      expect(new Date(data!.updated_at)).toBeInstanceOf(Date)
    })

    it('should reject inserting record with id != 1', async () => {
      const { error } = await supabase
        .from('settings')
        .insert({
          id: 2,
          load_weight: 1.0,
          continuity_weight: 0.5,
          grade_diff_weight: 0.3,
          pair_same_subject_required: true,
          pair_max_grade_diff: 2,
        })

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })

    it('should reject negative weight values', async () => {
      const { error } = await supabase
        .from('settings')
        .update({ load_weight: -1.0 })
        .eq('id', 1)

      // CHECK制約違反またはRLS違反
      expect(error).not.toBeNull()
    })
  })
})
