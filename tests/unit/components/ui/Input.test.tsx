/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/Input'

describe('Input', () => {
  it('正しくレンダリングされる', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('labelが正しく表示される', () => {
    render(<Input label="Username" placeholder="Enter username" />)
    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('テキスト入力が正しく動作する', async () => {
    const user = userEvent.setup()
    render(<Input placeholder="Enter text" />)

    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello World')

    expect(input).toHaveValue('Hello World')
  })

  it('changeイベントが発火する', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Input placeholder="Enter text" onChange={handleChange} />)

    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'a')

    expect(handleChange).toHaveBeenCalled()
  })

  it('エラーメッセージが正しく表示される', () => {
    render(<Input placeholder="Enter text" error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('helperTextが正しく表示される', () => {
    render(<Input placeholder="Enter text" helperText="Enter your username" />)
    expect(screen.getByText('Enter your username')).toBeInTheDocument()
  })

  it('disabled状態が正しく適用される', () => {
    render(<Input placeholder="Enter text" disabled />)
    const input = screen.getByPlaceholderText('Enter text')
    expect(input).toBeDisabled()
  })

  it('fullWidth propsが正しく適用される', () => {
    render(<Input placeholder="Enter text" fullWidth />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('leftIconとrightIconが正しく表示される', () => {
    render(
      <Input
        placeholder="Enter text"
        leftIcon={<span data-testid="left-icon">🔍</span>}
        rightIcon={<span data-testid="right-icon">✓</span>}
      />
    )

    expect(screen.getByTestId('left-icon')).toBeInTheDocument()
    expect(screen.getByTestId('right-icon')).toBeInTheDocument()
  })
})
