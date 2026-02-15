/**
 * LoginForm Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock authSlice
const mockLoginAsync = vi.fn()

vi.mock('@/store/authSlice', () => ({
  loginAsync: vi.fn((credentials: any) => {
    mockLoginAsync(credentials)
    return {
      type: 'auth/login/fulfilled',
      payload: { user: { email: credentials.email } },
      unwrap: vi.fn().mockResolvedValue({ user: { email: credentials.email } }),
    }
  }),
  selectAuthLoading: (state: any) => state.auth.loading,
  selectAuthError: (state: any) => state.auth.error,
}))

// Create a mock store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { loading: false, error: null, ...initialState }, action) => state,
    },
  })
}

describe('LoginForm', () => {
  it('正しくレンダリングされる', () => {
    const store = createMockStore()
    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    expect(screen.getByText('KomaFit')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument()
  })

  it('デモアカウント情報が表示される', () => {
    const store = createMockStore()
    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    expect(screen.getByText(/デモ用アカウント/)).toBeInTheDocument()
    expect(screen.getByText(/admin@komafit.local/)).toBeInTheDocument()
    expect(screen.getByText(/teacher1@komafit.local/)).toBeInTheDocument()
  })

  it('無効なメールアドレスでフォームが送信されない', async () => {
    const store = createMockStore()
    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'invalid-email')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // mockLoginAsync should not be called because validation failed
    expect(mockLoginAsync).not.toHaveBeenCalled()
  })

  it('短いパスワードでフォームが送信されない', async () => {
    const store = createMockStore()
    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, '12345')

    // Reset mock before clicking submit
    mockLoginAsync.mockClear()
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // mockLoginAsync should not be called because validation failed
    expect(mockLoginAsync).not.toHaveBeenCalled()
  })

  it('有効なデータでフォームが送信される', async () => {
    const store = createMockStore()
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    mockLoginAsync.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    })

    render(
      <Provider store={store}>
        <LoginForm onSuccess={mockOnSuccess} />
      </Provider>
    )

    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: 'ログイン' })

    await user.type(emailInput, 'admin@komafit.local')
    await user.type(passwordInput, 'admin123')
    await user.click(submitButton)

    // loginAsyncが呼ばれることを確認
    expect(mockLoginAsync).toHaveBeenCalled()
  })

  it('認証エラーが表示される', () => {
    const store = createMockStore({
      error: 'メールアドレスまたはパスワードが正しくありません',
    })

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    expect(
      screen.getByText('メールアドレスまたはパスワードが正しくありません')
    ).toBeInTheDocument()
  })

  it('ローディング状態でボタンが無効化される', () => {
    const store = createMockStore({
      loading: true,
    })

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    const submitButton = screen.getByRole('button', { name: 'ログイン' })
    expect(submitButton).toBeDisabled()
  })

  it('パスワードの表示/非表示が切り替わる', async () => {
    const store = createMockStore()
    const user = userEvent.setup()

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // パスワード表示ボタンをクリック（rightIcon内のボタン）
    const toggleButtons = screen.getAllByRole('button')
    const passwordToggle = toggleButtons.find(
      (btn) => btn !== screen.getByRole('button', { name: 'ログイン' }) && btn.type === 'button'
    )

    if (passwordToggle) {
      await user.click(passwordToggle)
      expect(passwordInput.type).toBe('text')

      await user.click(passwordToggle)
      expect(passwordInput.type).toBe('password')
    }
  })
})
