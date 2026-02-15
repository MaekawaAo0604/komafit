/**
 * AuthLayout Component
 *
 * Layout for authentication pages (login, register, etc.).
 * Features a centered form with decorative background.
 */

import React from 'react'
import styled from 'styled-components'

interface AuthLayoutProps {
  children: React.ReactNode
}

const LayoutContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;

  /* Animated background shapes */
  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    opacity: 0.1;
  }

  &::before {
    width: 500px;
    height: 500px;
    top: -250px;
    right: -250px;
    background: white;
    animation: float 20s ease-in-out infinite;
  }

  &::after {
    width: 400px;
    height: 400px;
    bottom: -200px;
    left: -200px;
    background: white;
    animation: float 25s ease-in-out infinite reverse;
  }

  @keyframes float {
    0%,
    100% {
      transform: translate(0, 0);
    }
    50% {
      transform: translate(30px, -30px);
    }
  }
`

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  animation: fadeIn 500ms ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <LayoutContainer>
      <ContentWrapper>{children}</ContentWrapper>
    </LayoutContainer>
  )
}
