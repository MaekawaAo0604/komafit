/**
 * RootLayout Component
 *
 * Top-level layout component that wraps the entire application.
 */

import React, { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { checkAuthAsync } from '@/store/authSlice'

export const RootLayout: React.FC = () => {
  const dispatch = useAppDispatch()

  // Check authentication status on mount
  useEffect(() => {
    dispatch(checkAuthAsync())
  }, [dispatch])

  return (
    <div>
      <Outlet />
    </div>
  )
}
