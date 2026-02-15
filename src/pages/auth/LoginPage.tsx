/**
 * LoginPage
 *
 * Login page with authentication form.
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()

  const handleLoginSuccess = () => {
    navigate('/dashboard')
  }

  return <LoginForm onSuccess={handleLoginSuccess} />
}
