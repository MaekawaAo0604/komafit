/**
 * Audit Logs Service
 *
 * This service provides operations for audit log management.
 * Audit logs track all important actions in the system.
 *
 * Requirements: REQ-14（監査ログ）
 */

import { supabase } from '@/lib/supabase'
import type { AuditLog } from '@/types/entities'

/**
 * Audit log filters
 */
export interface AuditLogFilters {
  actorId?: string
  action?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Get audit logs with optional filters
 *
 * @param filters - Filter options
 * @returns List of audit logs
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, users!audit_logs_actor_id_fkey(*)')
    .order('created_at', { ascending: false })

  // Apply filters
  if (filters.actorId) {
    query = query.eq('actor_id', filters.actorId)
  }

  if (filters.action) {
    query = query.eq('action', filters.action)
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate)
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate)
  }

  // Apply pagination
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  if (filters.offset) {
    query = query.range(
      filters.offset,
      filters.offset + (filters.limit || 50) - 1
    )
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  return data.map(mapAuditLogFromDb)
}

/**
 * Get audit logs for a specific user
 *
 * @param actorId - User ID
 * @param limit - Maximum number of logs to return
 * @returns List of audit logs
 */
export async function getUserAuditLogs(
  actorId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  return getAuditLogs({ actorId, limit })
}

/**
 * Get audit logs for a specific action type
 *
 * @param action - Action type (e.g., 'ASSIGN', 'CHANGE', 'UNASSIGN')
 * @param limit - Maximum number of logs to return
 * @returns List of audit logs
 */
export async function getActionAuditLogs(
  action: string,
  limit: number = 100
): Promise<AuditLog[]> {
  return getAuditLogs({ action, limit })
}

/**
 * Get recent audit logs
 *
 * @param limit - Maximum number of logs to return
 * @returns List of audit logs
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  return getAuditLogs({ limit })
}

/**
 * Create audit log entry
 *
 * Note: This is typically called internally by RPC functions
 * but can be used directly if needed.
 *
 * @param actorId - User ID who performed the action
 * @param action - Action type
 * @param payload - Action details
 * @returns Created audit log
 */
export async function createAuditLog(
  actorId: string,
  action: string,
  payload: Record<string, unknown>
): Promise<AuditLog> {
  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id: actorId,
      action,
      payload,
    })
    .select('*, users!audit_logs_actor_id_fkey(*)')
    .single()

  if (error) {
    throw new Error(`Failed to create audit log: ${error.message}`)
  }

  return mapAuditLogFromDb(data)
}

/**
 * Export audit logs to CSV format
 *
 * @param filters - Filter options
 * @returns CSV string
 */
export async function exportAuditLogsToCSV(
  filters: AuditLogFilters = {}
): Promise<string> {
  const logs = await getAuditLogs(filters)

  // CSV header
  const headers = ['ID', 'Actor ID', 'Actor Name', 'Action', 'Payload', 'Created At']
  const csvRows = [headers.join(',')]

  // CSV rows
  for (const log of logs) {
    const row = [
      log.id,
      log.actorId,
      log.actor?.name || '',
      log.action,
      JSON.stringify(log.payload).replace(/"/g, '""'), // Escape quotes
      log.createdAt,
    ]
    csvRows.push(row.map((field) => `"${field}"`).join(','))
  }

  return csvRows.join('\n')
}

/**
 * Get audit log statistics
 *
 * @param startDate - Start date for statistics
 * @param endDate - End date for statistics
 * @returns Statistics object
 */
export async function getAuditLogStatistics(
  startDate?: string,
  endDate?: string
): Promise<{
  totalLogs: number
  actionCounts: Record<string, number>
  topActors: { actorId: string; actorName: string; count: number }[]
}> {
  const logs = await getAuditLogs({ startDate, endDate })

  const totalLogs = logs.length

  // Count actions
  const actionCounts: Record<string, number> = {}
  const actorCounts: Record<string, { name: string; count: number }> = {}

  for (const log of logs) {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1

    if (!actorCounts[log.actorId]) {
      actorCounts[log.actorId] = {
        name: log.actor?.name || 'Unknown',
        count: 0,
      }
    }
    actorCounts[log.actorId].count++
  }

  // Top 10 actors
  const topActors = Object.entries(actorCounts)
    .map(([actorId, data]) => ({
      actorId,
      actorName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalLogs,
    actionCounts,
    topActors,
  }
}

// ============================================================================
// Mapping Functions (DB <-> Domain)
// ============================================================================

/**
 * Map database audit_logs record to domain AuditLog entity
 */
function mapAuditLogFromDb(dbLog: any): AuditLog {
  return {
    id: dbLog.id,
    actorId: dbLog.actor_id,
    action: dbLog.action,
    payload: dbLog.payload,
    createdAt: dbLog.created_at,
    actor: dbLog.users
      ? {
          id: dbLog.users.id,
          email: dbLog.users.email,
          name: dbLog.users.name,
          role: dbLog.users.role,
          active: dbLog.users.active,
          createdAt: dbLog.users.created_at,
          updatedAt: dbLog.users.updated_at,
        }
      : undefined,
  }
}
