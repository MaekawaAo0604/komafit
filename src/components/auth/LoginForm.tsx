/**
 * LoginForm Component
 *
 * User authentication form with validation.
 * Uses React Hook Form + Zod for validation.
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import styled from 'styled-components'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loginAsync, selectAuthLoading, selectAuthError } from '@/store/authSlice'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
})

type LoginFormData = z.infer<typeof loginSchema>

const FormContainer = styled(Card)`
  max-width: 28rem;
  margin: 0 auto;
`

const FormHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

const Logo = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`

const Title = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.875rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
`

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`

const ErrorAlert = styled.div`
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #991b1b;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: slideDown 250ms ease-out;

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

const ForgotPassword = styled.a`
  font-size: 0.875rem;
  color: #3b82f6;
  text-decoration: none;
  transition: color 250ms ease;

  &:hover {
    color: #2563eb;
    text-decoration: underline;
  }
`


interface LoginFormProps {
  onSuccess?: () => void
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectAuthLoading)
  const authError = useAppSelector(selectAuthError)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      await dispatch(loginAsync(data)).unwrap()
      onSuccess?.()
    } catch (error) {
      // Error is handled by Redux slice
      console.error('Login failed:', error)
    }
  }


  return (
    <FormContainer padding="lg">
      <FormHeader>
        <Logo>🎓</Logo>
        <Title>KomaFit</Title>
        <Subtitle>講師割当アシスタント</Subtitle>
      </FormHeader>

      {authError && (
        <ErrorAlert>
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {authError}
        </ErrorAlert>
      )}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="メールアドレス"
          type="email"
          placeholder="メールアドレスを入力"
          error={errors.email?.message}
          fullWidth
          leftIcon={
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          }
          {...register('email')}
        />

        <div>
          <Input
            label="パスワード"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            error={errors.password?.message}
            fullWidth
            leftIcon={
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280',
                }}
              >
                {showPassword ? (
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
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            }
            {...register('password')}
          />
          <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
            <ForgotPassword href="#">パスワードを忘れた場合</ForgotPassword>
          </div>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          ログイン
        </Button>
      </Form>
    </FormContainer>
  )
}
