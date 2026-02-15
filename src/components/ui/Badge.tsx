/**
 * Badge Component
 *
 * A small label component for status indicators, tags, and counts.
 */

import React from 'react'
import styled, { css } from 'styled-components'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
  className?: string
}

const variantStyles = {
  default: css`
    background-color: #f3f4f6;
    color: #374151;
  `,
  primary: css`
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
  `,
  secondary: css`
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
  `,
  success: css`
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    color: #065f46;
  `,
  warning: css`
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
  `,
  error: css`
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    color: #991b1b;
  `,
  info: css`
    background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    color: #1e40af;
  `,
}

const sizeStyles = {
  sm: css`
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 0.375rem;
  `,
  md: css`
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    border-radius: 0.5rem;
  `,
  lg: css`
    padding: 0.375rem 1rem;
    font-size: 1rem;
    border-radius: 0.75rem;
  `,
}

const StyledBadge = styled.span<{
  $variant: BadgeVariant
  $size: BadgeSize
  $dot?: boolean
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  white-space: nowrap;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);

  ${(props) => variantStyles[props.$variant]}
  ${(props) => sizeStyles[props.$size]}

  ${(props) =>
    props.$dot &&
    css`
      &::before {
        content: '';
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background-color: currentColor;
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `}
`

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}) => {
  return (
    <StyledBadge $variant={variant} $size={size} $dot={dot} className={className}>
      {children}
    </StyledBadge>
  )
}
