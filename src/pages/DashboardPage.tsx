/**
 * DashboardPage
 *
 * Main dashboard page showing overview and statistics.
 */

import React from 'react'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAppSelector } from '@/store/hooks'
import { selectUser, selectRole } from '@/store/authSlice'

const PageHeader = styled.div`
  margin-bottom: 2rem;
`

const PageTitle = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
`

const PageDescription = styled.p`
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`

const StatCard = styled(Card)`
  padding: 1.5rem;
`

const StatValue = styled.div`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
`

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
`

const DebugInfo = styled.div`
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-family: monospace;
  font-size: 0.875rem;
`

const DebugLabel = styled.div`
  font-weight: 600;
  color: #92400e;
  margin-bottom: 0.5rem;
`

const DebugValue = styled.div`
  color: #78350f;
`

const roleLabels: Record<string, string> = {
  admin: '管理者',
  teacher: '講師',
  viewer: '閲覧者',
}

export const DashboardPage: React.FC = () => {
  const user = useAppSelector(selectUser)
  const role = useAppSelector(selectRole)

  return (
    <div>
      <PageHeader>
        <PageTitle>ダッシュボード</PageTitle>
        <PageDescription>システムの概要と統計情報</PageDescription>
      </PageHeader>

      <DebugInfo>
        <DebugLabel>🔍 デバッグ情報（開発用）</DebugLabel>
        <DebugValue>メールアドレス: {user?.email || '取得できません'}</DebugValue>
        <DebugValue>
          ロール: {role ? `${role} (${roleLabels[role] || 'unknown'})` : '取得できません'}
        </DebugValue>
        <DebugValue>
          user_metadata.role: {(user as any)?.user_metadata?.role || '設定されていません'}
        </DebugValue>
      </DebugInfo>

      <StatsGrid>
        <StatCard>
          <StatValue>35</StatValue>
          <StatLabel>総スロット数</StatLabel>
        </StatCard>

        <StatCard>
          <StatValue>28</StatValue>
          <StatLabel>割当済みスロット</StatLabel>
        </StatCard>

        <StatCard>
          <StatValue>7</StatValue>
          <StatLabel>未割当スロット</StatLabel>
        </StatCard>

        <StatCard>
          <StatValue>80%</StatValue>
          <StatLabel>割当完了率</StatLabel>
        </StatCard>
      </StatsGrid>

      <Card padding="lg">
        <Card.Header>
          <Card.Title>最近の活動</Card.Title>
          <Card.Description>システムの最新アクティビティ</Card.Description>
        </Card.Header>
        <Card.Content>
          <p style={{ color: '#6b7280' }}>
            ここに最近の割当操作や変更履歴が表示されます。
          </p>
        </Card.Content>
      </Card>
    </div>
  )
}
