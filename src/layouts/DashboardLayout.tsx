/**
 * DashboardLayout Component
 *
 * Main application layout with sidebar navigation.
 */

import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  selectUser,
  selectRole,
  selectIsAdmin,
  selectIsTeacher,
  logoutAsync,
} from '@/store/authSlice'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f9fafb;
`

const Sidebar = styled.aside`
  width: 16rem;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  overflow-y: auto;

  @media (max-width: 768px) {
    display: none;
  }
`

const SidebarHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
`

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
`

const LogoIcon = styled.div`
  font-size: 2rem;
`

const SidebarNav = styled.nav`
  flex: 1;
  padding: 1rem;
`

const NavSection = styled.div`
  margin-bottom: 1.5rem;
`

const NavSectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
`

const NavItem = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: ${(props) => (props.$isActive ? '#3b82f6' : '#6b7280')};
  background: ${(props) => (props.$isActive ? '#eff6ff' : 'transparent')};
  border-radius: 0.75rem;
  text-decoration: none;
  font-weight: ${(props) => (props.$isActive ? 600 : 500)};
  transition: all 250ms ease;

  &:hover {
    background: ${(props) => (props.$isActive ? '#dbeafe' : '#f3f4f6')};
    color: ${(props) => (props.$isActive ? '#2563eb' : '#374151')};
  }

  svg {
    flex-shrink: 0;
  }
`

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
`

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  margin-bottom: 0.75rem;
`

const UserAvatar = styled.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
`

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const UserName = styled.div`
  font-weight: 600;
  color: #111827;
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const UserRole = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
`

const MainContent = styled.main`
  flex: 1;
  margin-left: 16rem;
  padding: 0;
  overflow: hidden;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`

const roleLabels: Record<string, string> = {
  admin: '管理者',
  teacher: '講師',
  viewer: '閲覧者',
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectUser)
  const role = useAppSelector(selectRole)
  const isAdmin = useAppSelector(selectIsAdmin)
  const isTeacher = useAppSelector(selectIsTeacher)

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <LayoutContainer>
      <Sidebar>
        <SidebarHeader>
          <Logo>
            <LogoIcon>🎓</LogoIcon>
            KomaFit
          </Logo>
        </SidebarHeader>

        <SidebarNav>
          <NavSection>
            <NavSectionTitle>メイン</NavSectionTitle>
            <NavItem to="/dashboard" $isActive={isActive('/dashboard')}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              ダッシュボード
            </NavItem>

            {(isAdmin || isTeacher) && (
              <NavItem to="/board" $isActive={isActive('/board')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                割当ボード
              </NavItem>
            )}

            {(isAdmin || isTeacher) && (
              <NavItem to="/calendar" $isActive={isActive('/calendar')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </svg>
                月次カレンダー
              </NavItem>
            )}
          </NavSection>

          {isAdmin && (
            <NavSection>
              <NavSectionTitle>マスタ管理</NavSectionTitle>
              <NavItem to="/masters/teachers" $isActive={isActive('/masters/teachers')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                講師マスタ
              </NavItem>

              <NavItem to="/masters/students" $isActive={isActive('/masters/students')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                生徒マスタ
              </NavItem>
            </NavSection>
          )}

          {isAdmin && (
            <NavSection>
              <NavSectionTitle>システム</NavSectionTitle>
              <NavItem to="/settings" $isActive={isActive('/settings')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m0 2.8l4.2 4.2M23 12h-6m-6 0H1m17.8-5.2l-4.2 4.2m0 2.8l4.2 4.2" />
                </svg>
                システム設定
              </NavItem>

              <NavItem to="/audit-logs" $isActive={isActive('/audit-logs')}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                監査ログ
              </NavItem>
            </NavSection>
          )}
        </SidebarNav>

        <SidebarFooter>
          <UserProfile>
            <UserAvatar>{user?.email?.[0].toUpperCase() || 'U'}</UserAvatar>
            <UserInfo>
              <UserName>{user?.email || 'User'}</UserName>
              <UserRole>{roleLabels[role || ''] || 'ユーザー'}</UserRole>
            </UserInfo>
          </UserProfile>

          <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            ログアウト
          </Button>
        </SidebarFooter>
      </Sidebar>

      <MainContent>{children}</MainContent>
    </LayoutContainer>
  )
}
