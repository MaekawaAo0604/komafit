/**
 * Router Configuration
 *
 * Application routing using React Router v6.
 */

import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import { selectIsAuthenticated, selectRole } from '@/store/authSlice'

// Layouts
import { RootLayout } from '@/layouts/RootLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { DashboardLayout } from '@/layouts/DashboardLayout'

// Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { AssignmentBoardPage } from '@/pages/AssignmentBoardPage'
import { MonthlyCalendarPage } from '@/pages/MonthlyCalendarPage'
import { TeachersPage } from '@/pages/masters/TeachersPage'
import { StudentsPage } from '@/pages/masters/StudentsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/**
 * Protected Route Component
 * Redirects to login if not authenticated
 */
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'teacher' | 'viewer'
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)
  const userRole = useAppSelector(selectRole)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Check role permission
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = {
      viewer: 1,
      teacher: 2,
      admin: 3,
    }

    const userLevel = roleHierarchy[userRole || ''] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0

    if (userLevel < requiredLevel) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

/**
 * Public Route Component
 * Redirects to dashboard if already authenticated
 */
interface PublicRouteProps {
  children: React.ReactNode
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

/**
 * Router Configuration
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // Auth routes
      {
        path: 'login',
        element: (
          <AuthLayout>
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          </AuthLayout>
        ),
      },
      // Protected routes
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardLayout>
              <DashboardPage />
            </DashboardLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'board',
        element: (
          <ProtectedRoute requiredRole="teacher">
            <DashboardLayout>
              <AssignmentBoardPage />
            </DashboardLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'calendar',
        element: (
          <ProtectedRoute requiredRole="teacher">
            <DashboardLayout>
              <MonthlyCalendarPage />
            </DashboardLayout>
          </ProtectedRoute>
        ),
      },
      // Master data routes (admin only)
      {
        path: 'masters',
        children: [
          {
            path: 'teachers',
            element: (
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <TeachersPage />
                </DashboardLayout>
              </ProtectedRoute>
            ),
          },
          {
            path: 'students',
            element: (
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <StudentsPage />
                </DashboardLayout>
              </ProtectedRoute>
            ),
          },
        ],
      },
      // Settings routes (admin only)
      {
        path: 'settings',
        element: (
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout>
              <AuditLogsPage />
            </DashboardLayout>
          </ProtectedRoute>
        ),
      },
    ],
  },
])
