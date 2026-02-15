/**
 * Toast Component
 *
 * A notification toast component with multiple variants and auto-dismiss functionality.
 */

import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes, css } from 'styled-components'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id?: string
  message: string
  variant?: ToastVariant
  duration?: number
  onClose?: () => void
  showCloseButton?: boolean
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`

const ToastContainer = styled.div<{ $variant: ToastVariant; $isClosing?: boolean }>`
  min-width: 300px;
  max-width: 500px;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: ${(props) => (props.$isClosing ? slideOut : slideIn)} 300ms
    cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'Inter', sans-serif;

  ${(props) => {
    switch (props.$variant) {
      case 'success':
        return css`
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        `
      case 'error':
        return css`
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        `
      case 'warning':
        return css`
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        `
      case 'info':
        return css`
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
        `
      default:
        return css`
          background: white;
          color: #374151;
          border: 1px solid #e5e7eb;
        `
    }
  }}
`

const IconWrapper = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Message = styled.div`
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
`

const CloseButton = styled.button`
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  border-radius: 0.375rem;
  opacity: 0.8;
  transition: opacity 200ms;

  &:hover {
    opacity: 1;
  }
`

const getIcon = (variant: ToastVariant) => {
  switch (variant) {
    case 'success':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'error':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    case 'warning':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'info':
      return (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}

export const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  duration = 5000,
  onClose,
  showCloseButton = true,
}) => {
  const [isClosing, setIsClosing] = React.useState(false)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsClosing(true)
    // Wait for animation to finish before calling onClose
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  return (
    <ToastContainer $variant={variant} $isClosing={isClosing} role="alert">
      <IconWrapper>{getIcon(variant)}</IconWrapper>
      <Message>{message}</Message>
      {showCloseButton && (
        <CloseButton onClick={handleClose} aria-label="Close">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="15" y1="5" x2="5" y2="15" />
            <line x1="5" y1="5" x2="15" y2="15" />
          </svg>
        </CloseButton>
      )}
    </ToastContainer>
  )
}

// Toast Container that holds multiple toasts
const ToastListContainer = styled.div`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`

export interface ToastListProps {
  toasts: Array<ToastProps & { id: string }>
  onRemove: (id: string) => void
}

export const ToastList: React.FC<ToastListProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null

  const content = (
    <ToastListContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </ToastListContainer>
  )

  return createPortal(content, document.body)
}

export default Toast
