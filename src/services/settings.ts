/**
 * Settings Service
 *
 * This service provides operations for system settings management.
 * Settings table is a singleton (id = 1).
 *
 * Requirements: REQ-17（システム設定管理）
 */

import { supabase } from '@/lib/supabase'
import type { Settings } from '@/types/entities'

/**
 * Get system settings
 *
 * @returns Settings object
 */
export async function getSettings(): Promise<Settings> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`)
  }

  return mapSettingsFromDb(data)
}

/**
 * Update system settings
 *
 * @param data - Updated settings data
 * @returns Updated settings
 */
export async function updateSettings(
  data: Partial<{
    loadWeight: number
    continuityWeight: number
    gradeDiffWeight: number
    pairSameSubjectRequired: boolean
    pairMaxGradeDiff: number
  }>
): Promise<Settings> {
  const updateData: any = {}

  if (data.loadWeight !== undefined) updateData.load_weight = data.loadWeight
  if (data.continuityWeight !== undefined)
    updateData.continuity_weight = data.continuityWeight
  if (data.gradeDiffWeight !== undefined)
    updateData.grade_diff_weight = data.gradeDiffWeight
  if (data.pairSameSubjectRequired !== undefined)
    updateData.pair_same_subject_required = data.pairSameSubjectRequired
  if (data.pairMaxGradeDiff !== undefined)
    updateData.pair_max_grade_diff = data.pairMaxGradeDiff

  const { data: settings, error } = await supabase
    .from('settings')
    .update(updateData)
    .eq('id', 1)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update settings: ${error.message}`)
  }

  return mapSettingsFromDb(settings)
}

/**
 * Reset settings to default values
 *
 * @returns Reset settings
 */
export async function resetSettings(): Promise<Settings> {
  return updateSettings({
    loadWeight: 1.0,
    continuityWeight: 0.5,
    gradeDiffWeight: 0.3,
    pairSameSubjectRequired: true,
    pairMaxGradeDiff: 2,
  })
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database settings record to domain Settings entity
 */
function mapSettingsFromDb(dbSettings: any): Settings {
  return {
    id: dbSettings.id,
    loadWeight: dbSettings.load_weight,
    continuityWeight: dbSettings.continuity_weight,
    gradeDiffWeight: dbSettings.grade_diff_weight,
    pairSameSubjectRequired: dbSettings.pair_same_subject_required,
    pairMaxGradeDiff: dbSettings.pair_max_grade_diff,
    updatedAt: dbSettings.updated_at,
  }
}
