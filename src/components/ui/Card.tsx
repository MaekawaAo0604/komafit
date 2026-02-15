/**
 * Card Component
 *
 * A versatile card container with smooth animations and hover effects.
 * Used as the foundation for slot cards and other content containers.
 */

import React from 'react'
import styled, { css } from 'styled-components'

interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outlined' | 'elevated'
  interactive?: boolean
  onClick?: () => void
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: css`
    padding: 0;
  `,
  sm: css`
    padding: 0.75rem;
  `,
  md: css`
    padding: 1.5rem;
  `,
  lg: css`
    padding: 2rem;
  `,
}

const variantStyles = {
  default: css`
    background: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  `,
  outlined: css`
    background: white;
    border: 2px solid #e5e7eb;
    box-shadow: none;
  `,
  elevated: css`
    background: white;
    border: none;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
  `,
}

const StyledCard = styled.div<{
  $variant: 'default' | 'outlined' | 'elevated'
  $interactive?: boolean
  $padding: 'none' | 'sm' | 'md' | 'lg'
}>`
  border-radius: 1rem;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  ${(props) => variantStyles[props.$variant]}
  ${(props) => paddingStyles[props.$padding]}

  ${(props) =>
    props.$interactive &&
    css`
      cursor: pointer;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
          0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border-color: #3b82f6;
      }

      &:active {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
          0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
    `}
`

const CardHeader = styled.div`
  padding-bottom: 1rem;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 1rem;
`

const CardTitle = styled.h3`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
`

const CardDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
`

const CardContent = styled.div``

const CardFooter = styled.div`
  padding-top: 1rem;
  margin-top: 1rem;
  border-top: 1px solid #f3f4f6;
`

export const Card: React.FC<CardProps> & {
  Header: typeof CardHeader
  Title: typeof CardTitle
  Description: typeof CardDescription
  Content: typeof CardContent
  Footer: typeof CardFooter
} = ({
  children,
  variant = 'default',
  interactive = false,
  onClick,
  className,
  padding = 'md',
}) => {
  return (
    <StyledCard
      $variant={variant}
      $interactive={interactive}
      $padding={padding}
      onClick={onClick}
      className={className}
    >
      {children}
    </StyledCard>
  )
}

Card.Header = CardHeader
Card.Title = CardTitle
Card.Description = CardDescription
Card.Content = CardContent
Card.Footer = CardFooter
