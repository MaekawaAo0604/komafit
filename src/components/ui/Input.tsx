/**
 * Input Component
 *
 * A versatile input field with validation states and icons.
 */

import React, { forwardRef } from 'react'
import styled, { css } from 'styled-components'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const InputWrapper = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: ${(props) => (props.$fullWidth ? '100%' : 'auto')};
`

const Label = styled.label`
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
`

const InputContainer = styled.div<{ $hasError?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;

  ${(props) =>
    props.$hasError &&
    css`
      .input-field {
        border-color: #ef4444;

        &:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
      }
    `}
`

const StyledInput = styled.input<{ $hasLeftIcon?: boolean; $hasRightIcon?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #111827;
  background-color: white;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);

  ${(props) =>
    props.$hasLeftIcon &&
    css`
      padding-left: 2.75rem;
    `}

  ${(props) =>
    props.$hasRightIcon &&
    css`
      padding-right: 2.75rem;
    `}

  &::placeholder {
    color: #9ca3af;
  }

  &:hover:not(:disabled) {
    border-color: #d1d5db;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }
`

const IconWrapper = styled.div<{ $position: 'left' | 'right' }>`
  position: absolute;
  ${(props) => (props.$position === 'left' ? 'left: 1rem;' : 'right: 1rem;')}
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: #6b7280;
  pointer-events: none;

  /* Allow pointer events on interactive children like buttons */
  button {
    pointer-events: auto;
  }
`

const HelperText = styled.p<{ $isError?: boolean }>`
  font-size: 0.875rem;
  margin: 0;
  color: ${(props) => (props.$isError ? '#ef4444' : '#6b7280')};
  animation: slideDown 250ms ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      id,
      ...props
    },
    ref
  ) => {
    // Generate a unique ID if not provided
    const inputId = id || `input-${React.useId()}`

    return (
      <InputWrapper $fullWidth={fullWidth} className={className}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <InputContainer $hasError={!!error}>
          {leftIcon && <IconWrapper $position="left">{leftIcon}</IconWrapper>}
          <StyledInput
            ref={ref}
            id={inputId}
            className="input-field"
            $hasLeftIcon={!!leftIcon}
            $hasRightIcon={!!rightIcon}
            {...props}
          />
          {rightIcon && <IconWrapper $position="right">{rightIcon}</IconWrapper>}
        </InputContainer>
        {(error || helperText) && (
          <HelperText $isError={!!error}>{error || helperText}</HelperText>
        )}
      </InputWrapper>
    )
  }
)

Input.displayName = 'Input'
