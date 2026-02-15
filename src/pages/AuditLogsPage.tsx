/**
 * Audit Logs Page
 *
 * 監査ログの閲覧・フィルタリング・エクスポート機能
 * 要件: REQ-14（監査ログ）
 */

import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  getAuditLogs,
  exportAuditLogsToCSV,
  type AuditLogFilters,
} from '@/services/auditLogs'
import type { AuditLog } from '@/types/entities'

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const FilterSection = styled(Card)`
  margin-bottom: 1.5rem;
`

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const FilterInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`

const FilterSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.15s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`

const FilterActions = styled.div`
  display: flex;
  gap: 0.75rem;
`

const LogsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
`

const Thead = styled.thead`
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
`

const Th = styled.th`
  text-align: left;
  padding: 0.75rem 1rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
`

const Tbody = styled.tbody``

const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.15s;

  &:hover {
    background: #f9fafb;
  }
`

const Td = styled.td`
  padding: 0.75rem 1rem;
  color: #1f2937;
`

const ActionBadge = styled.span<{ $action: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${(props) => {
    switch (props.$action) {
      case 'ASSIGN':
        return '#dbeafe'
      case 'CHANGE':
        return '#fef3c7'
      case 'UNASSIGN':
        return '#fee2e2'
      case 'AVAILABILITY_UPDATE':
        return '#e0e7ff'
      case 'SETTINGS_UPDATE':
        return '#f3e8ff'
      default:
        return '#f3f4f6'
    }
  }};
  color: ${(props) => {
    switch (props.$action) {
      case 'ASSIGN':
        return '#1e40af'
      case 'CHANGE':
        return '#92400e'
      case 'UNASSIGN':
        return '#991b1b'
      case 'AVAILABILITY_UPDATE':
        return '#3730a3'
      case 'SETTINGS_UPDATE':
        return '#6b21a8'
      default:
        return '#374151'
    }
  }};
`

const PayloadCode = styled.code`
  display: block;
  padding: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  color: #374151;
  max-width: 400px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
`

const LoadingText = styled.p`
  text-align: center;
  color: #6b7280;
  padding: 2rem;
`

const ErrorText = styled.p`
  color: #ef4444;
  text-align: center;
  padding: 2rem;
`

const ACTION_LABELS: Record<string, string> = {
  ASSIGN: '割当',
  CHANGE: '変更',
  UNASSIGN: '解除',
  AVAILABILITY_UPDATE: '空き枠更新',
  SETTINGS_UPDATE: '設定変更',
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async (filters?: AuditLogFilters) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAuditLogs(filters || { limit: 100 })
      setLogs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '監査ログの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilters = () => {
    const filters: AuditLogFilters = {
      limit: 100,
    }

    if (actionFilter) {
      filters.action = actionFilter
    }

    if (startDateFilter) {
      filters.startDate = new Date(startDateFilter).toISOString()
    }

    if (endDateFilter) {
      // 終了日は23:59:59まで含める
      const endDate = new Date(endDateFilter)
      endDate.setHours(23, 59, 59, 999)
      filters.endDate = endDate.toISOString()
    }

    loadLogs(filters)
  }

  const handleClearFilters = () => {
    setActionFilter('')
    setStartDateFilter('')
    setEndDateFilter('')
    loadLogs()
  }

  const handleExportCSV = async () => {
    try {
      const filters: AuditLogFilters = {
        limit: 1000, // Export limit
      }

      if (actionFilter) {
        filters.action = actionFilter
      }

      if (startDateFilter) {
        filters.startDate = new Date(startDateFilter).toISOString()
      }

      if (endDateFilter) {
        const endDate = new Date(endDateFilter)
        endDate.setHours(23, 59, 59, 999)
        filters.endDate = endDate.toISOString()
      }

      const csv = await exportAuditLogsToCSV(filters)

      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'CSVエクスポートに失敗しました')
    }
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingText>読み込み中...</LoadingText>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <ErrorText>{error}</ErrorText>
        <div style={{ textAlign: 'center' }}>
          <Button onClick={() => loadLogs()}>再読み込み</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader>
        <Title>監査ログ</Title>
        <Button onClick={handleExportCSV} variant="outline">
          CSVエクスポート
        </Button>
      </PageHeader>

      <FilterSection>
        <FilterGrid>
          <FilterField>
            <FilterLabel>操作種別</FilterLabel>
            <FilterSelect
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">すべて</option>
              <option value="ASSIGN">割当</option>
              <option value="CHANGE">変更</option>
              <option value="UNASSIGN">解除</option>
              <option value="AVAILABILITY_UPDATE">空き枠更新</option>
              <option value="SETTINGS_UPDATE">設定変更</option>
            </FilterSelect>
          </FilterField>

          <FilterField>
            <FilterLabel>開始日時</FilterLabel>
            <FilterInput
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </FilterField>

          <FilterField>
            <FilterLabel>終了日時</FilterLabel>
            <FilterInput
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </FilterField>
        </FilterGrid>

        <FilterActions>
          <Button onClick={handleApplyFilters} variant="primary" size="sm">
            フィルタ適用
          </Button>
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            クリア
          </Button>
        </FilterActions>
      </FilterSection>

      <Card>
        {logs.length === 0 ? (
          <EmptyState>監査ログがありません</EmptyState>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <LogsTable>
              <Thead>
                <tr>
                  <Th>日時</Th>
                  <Th>操作者</Th>
                  <Th>操作種別</Th>
                  <Th>詳細</Th>
                </tr>
              </Thead>
              <Tbody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td style={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.createdAt)}
                    </Td>
                    <Td>
                      {log.actor?.name || '不明'}
                      <br />
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {log.actor?.email || log.actorId}
                      </span>
                    </Td>
                    <Td>
                      <ActionBadge $action={log.action}>
                        {ACTION_LABELS[log.action] || log.action}
                      </ActionBadge>
                    </Td>
                    <Td>
                      <PayloadCode>{JSON.stringify(log.payload, null, 2)}</PayloadCode>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </LogsTable>
          </div>
        )}
      </Card>

      {logs.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '0.875rem',
            color: '#6b7280',
          }}
        >
          {logs.length}件の監査ログを表示中（最大100件）
        </div>
      )}
    </PageContainer>
  )
}
