/**
 * Select Component
 *
 * A versatile select dropdown with validation states and custom styling.
 */

import React, { forwardRef } from 'react'
import styled, { css } from 'styled-components'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
  fullWidth?: boolean
}

const SelectWrapper = styled.div<{ $fullWidth?: boolean }>`
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

const SelectContainer = styled.div<{ $hasError?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;

  ${(props) =>
    props.$hasError &&
    css`
      .select-field {
        border-color: #ef4444;

        &:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
      }
    `}
`

const StyledSelect = styled.select`
  font-family: 'Inter', sans-serif;
  width: 100%;
  padding: 0.75rem 2.5rem 0.75rem 1rem;
  font-size: 0.9375rem;
  color: #374151;
  background-color: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  outline: none;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  appearance: none;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: #d1d5db;
  }

  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    color: #9ca3af;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #9ca3af;
  }
`

const ChevronIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ErrorText = styled.span`
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`

const HelperText = styled.span`
  font-family: 'Inter', sans-serif;
  font-size: 0.8125rem;
  color: #6b7280;
`

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, helperText, options, placeholder, fullWidth, className, ...props },
    ref
  ) => {
    return (
      <SelectWrapper $fullWidth={fullWidth} className={className}>
        {label && <Label>{label}</Label>}
        <SelectContainer $hasError={!!error}>
          <StyledSelect ref={ref} className="select-field" {...props}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StyledSelect>
          <ChevronIcon>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ChevronIcon>
        </SelectContainer>
        {error && (
          <ErrorText>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M8 4.5V8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M8 11C8.27614 11 8.5 10.7761 8.5 10.5C8.5 10.2239 8.27614 10 8 10C7.72386 10 7.5 10.2239 7.5 10.5C7.5 10.7761 7.72386 11 8 11Z"
                fill="currentColor"
              />
            </svg>
            {error}
          </ErrorText>
        )}
        {helperText && !error && <HelperText>{helperText}</HelperText>}
      </SelectWrapper>
    )
  }
)

Select.displayName = 'Select'

export default Select
