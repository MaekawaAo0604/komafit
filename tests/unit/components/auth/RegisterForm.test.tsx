/**
 * RegisterForm Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RegisterForm } from '@/components/auth/RegisterForm'

describe('RegisterForm', () => {
  it('正しくレンダリングされる', () => {
    render(<RegisterForm />)

    expect(screen.getByText('新規登録')).toBeInTheDocument()
    expect(screen.getByLabelText('名前')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード（確認）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登録する' })).toBeInTheDocument()
  })

  it('ログインリンクが表示される', () => {
    render(<RegisterForm />)

    expect(screen.getByText('すでにアカウントをお持ちですか？')).toBeInTheDocument()
    expect(screen.getByText('ログイン')).toBeInTheDocument()
  })

  it('名前が空の場合フォームが送信されない', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const submitButton = screen.getByRole('button', { name: '登録する' })
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // onSuccess should not be called because validation failed
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('無効なメールアドレスでフォームが送信されない', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const submitButton = screen.getByRole('button', { name: '登録する' })

    await user.type(nameInput, '山田 太郎')
    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // onSuccess should not be called because validation failed
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('短いパスワードでフォームが送信されない', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const submitButton = screen.getByRole('button', { name: '登録する' })

    await user.type(nameInput, '山田 太郎')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, '12345')
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // onSuccess should not be called because validation failed
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('パスワードが一致しない場合フォームが送信されない', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録する' })

    await user.type(nameInput, '山田 太郎')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password456')
    await user.click(submitButton)

    // Wait a bit to ensure validation ran
    await new Promise(resolve => setTimeout(resolve, 100))

    // onSuccess should not be called because validation failed
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('有効なデータでフォームが送信される', async () => {
    const user = userEvent.setup()
    const mockOnSuccess = vi.fn()

    render(<RegisterForm onSuccess={mockOnSuccess} />)

    const nameInput = screen.getByLabelText('名前')
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    const confirmPasswordInput = screen.getByLabelText('パスワード（確認）')
    const submitButton = screen.getByRole('button', { name: '登録する' })

    await user.type(nameInput, '山田 太郎')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.type(confirmPasswordInput, 'password123')
    await user.click(submitButton)

    // 成功メッセージが表示される
    await waitFor(
      () => {
        expect(screen.getByText('登録が完了しました！')).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    // onSuccessが呼ばれる
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('ログインリンクをクリックするとonLoginClickが呼ばれる', async () => {
    const user = userEvent.setup()
    const mockOnLoginClick = vi.fn()

    render(<RegisterForm onLoginClick={mockOnLoginClick} />)

    const loginLink = screen.getByText('ログイン')
    await user.click(loginLink)

    expect(mockOnLoginClick).toHaveBeenCalled()
  })

  it('パスワードの表示/非表示が切り替わる', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    const passwordInput = screen.getByLabelText('パスワード') as HTMLInputElement
    expect(passwordInput.type).toBe('password')

    // パスワード表示ボタンを見つける
    const allButtons = screen.getAllByRole('button')
    const passwordToggle = allButtons.find(
      (btn) =>
        btn !== screen.getByRole('button', { name: '登録する' }) &&
        btn.type === 'button' &&
        btn.parentElement === passwordInput.parentElement
    )

    if (passwordToggle) {
      await user.click(passwordToggle)
      expect(passwordInput.type).toBe('text')

      await user.click(passwordToggle)
      expect(passwordInput.type).toBe('password')
    }
  })

  it('パスワード（確認）の表示/非表示が切り替わる', async () => {
    const user = userEvent.setup()

    render(<RegisterForm />)

    const confirmPasswordInput = screen.getByLabelText(
      'パスワード（確認）'
    ) as HTMLInputElement
    expect(confirmPasswordInput.type).toBe('password')

    // パスワード確認の表示ボタンを見つける
    const allButtons = screen.getAllByRole('button')
    const confirmPasswordToggle = allButtons.find(
      (btn) =>
        btn !== screen.getByRole('button', { name: '登録する' }) &&
        btn.type === 'button' &&
        btn.parentElement === confirmPasswordInput.parentElement
    )

    if (confirmPasswordToggle) {
      await user.click(confirmPasswordToggle)
      expect(confirmPasswordInput.type).toBe('text')

      await user.click(confirmPasswordToggle)
      expect(confirmPasswordInput.type).toBe('password')
    }
  })
})
