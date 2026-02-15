/**
 * Select Component Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Select, { SelectOption } from '@/components/ui/Select'

const mockOptions: SelectOption[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
]

describe('Select', () => {
  it('正しくレンダリングされる', () => {
    render(<Select options={mockOptions} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('labelが正しく表示される', () => {
    render(<Select label="Choose an option" options={mockOptions} />)
    expect(screen.getByText('Choose an option')).toBeInTheDocument()
  })

  it('optionsが正しく表示される', () => {
    render(<Select options={mockOptions} />)

    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('placeholderが正しく表示される', () => {
    render(<Select options={mockOptions} placeholder="Select an option" />)
    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('選択が正しく動作する', async () => {
    const user = userEvent.setup()
    render(<Select options={mockOptions} />)

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'option2')

    expect((select as HTMLSelectElement).value).toBe('option2')
  })

  it('changeイベントが発火する', async () => {
    const handleChange = vi.fn()
    const user = userEvent.setup()

    render(<Select options={mockOptions} onChange={handleChange} />)

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'option1')

    expect(handleChange).toHaveBeenCalled()
  })

  it('エラーメッセージが正しく表示される', () => {
    render(<Select options={mockOptions} error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
  })

  it('helperTextが正しく表示される', () => {
    render(<Select options={mockOptions} helperText="Please select an option" />)
    expect(screen.getByText('Please select an option')).toBeInTheDocument()
  })

  it('errorがある時helperTextは表示されない', () => {
    render(
      <Select
        options={mockOptions}
        error="Error message"
        helperText="Helper text"
      />
    )

    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
  })

  it('disabled状態が正しく適用される', () => {
    render(<Select options={mockOptions} disabled />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })

  it('fullWidth propsが正しく適用される', () => {
    render(<Select options={mockOptions} fullWidth />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('デフォルト値が正しく設定される', () => {
    render(<Select options={mockOptions} defaultValue="option2" />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('option2')
  })
})
