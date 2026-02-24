/**
 * KomaCountReportPage
 *
 * 講師別コマ数レポート
 * admin: 全講師の一覧 / teacher: 自分のコマ数のみ
 */

import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAppSelector } from '@/store/hooks'
import { selectIsAdmin } from '@/store/authSlice'
import {
  getTeacherKomaCounts,
  getMyTeacherId,
  type TeacherKomaCount,
} from '@/services/reports'

// ============================================================================
// Styled Components
// ============================================================================

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
`

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
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

const FilterActions = styled.div`
  display: flex;
  gap: 0.75rem;
`

const ReportTable = styled.table`
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

const TfootRow = styled.tr`
  border-top: 2px solid #e5e7eb;
  background: #f9fafb;
`

const StatusText = styled.p`
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  font-size: 0.875rem;
`

// ============================================================================
// Component
// ============================================================================

function getDefaultDates() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const lastDay = new Date(y, m, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
  }
}

export const KomaCountReportPage: React.FC = () => {
  const isAdmin = useAppSelector(selectIsAdmin)
  const [data, setData] = useState<TeacherKomaCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let teacherId: string | undefined
      if (!isAdmin) {
        const myId = await getMyTeacherId()
        if (!myId) {
          setError('講師情報が見つかりません')
          return
        }
        teacherId = myId
      }

      const results = await getTeacherKomaCounts(startDate, endDate, teacherId)
      setData(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, startDate, endDate])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalKoma = data.reduce((sum, r) => sum + r.komaCount, 0)
  const total1on1 = data.reduce((sum, r) => sum + r.koma1on1, 0)
  const total1on2 = data.reduce((sum, r) => sum + r.koma1on2, 0)
  const totalStudents = data.reduce((sum, r) => sum + r.studentCount, 0)

  return (
    <PageContainer>
      <PageHeader>
        <Title>コマ数レポート</Title>
      </PageHeader>

      <FilterSection padding="md">
        <FilterGrid>
            <FilterField>
              <FilterLabel>開始日</FilterLabel>
              <FilterInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FilterField>
            <FilterField>
              <FilterLabel>終了日</FilterLabel>
              <FilterInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FilterField>
          </FilterGrid>
          <FilterActions>
            <Button onClick={loadData} variant="primary" size="sm">
              検索
            </Button>
          </FilterActions>
      </FilterSection>

      <Card>
        <div>
          {loading ? (
            <StatusText>読み込み中...</StatusText>
          ) : error ? (
            <StatusText style={{ color: '#ef4444' }}>{error}</StatusText>
          ) : data.length === 0 ? (
            <StatusText>データがありません</StatusText>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <ReportTable>
                <Thead>
                  <tr>
                    {isAdmin && <Th>講師名</Th>}
                    <Th style={{ textAlign: 'right' }}>コマ数</Th>
                    <Th style={{ textAlign: 'right' }}>1:1</Th>
                    <Th style={{ textAlign: 'right' }}>1:2</Th>
                    <Th style={{ textAlign: 'right' }}>延べ生徒数</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {data.map((row) => (
                    <Tr key={row.teacherId}>
                      {isAdmin && <Td>{row.teacherName}</Td>}
                      <Td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {row.komaCount}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        {row.koma1on1}
                      </Td>
                      <Td style={{ textAlign: 'right' }}>
                        {row.koma1on2}
                      </Td>
                      <Td style={{ textAlign: 'right', color: '#6b7280' }}>
                        {row.studentCount}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
                {isAdmin && data.length > 1 && (
                  <tfoot>
                    <TfootRow>
                      <Td style={{ fontWeight: 700 }}>合計</Td>
                      <Td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {totalKoma}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {total1on1}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {total1on2}
                      </Td>
                      <Td style={{ textAlign: 'right', fontWeight: 700, color: '#6b7280' }}>
                        {totalStudents}
                      </Td>
                    </TfootRow>
                  </tfoot>
                )}
              </ReportTable>
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  )
}
