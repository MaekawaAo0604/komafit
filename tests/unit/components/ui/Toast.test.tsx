/**
 * Toast Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast, ToastList } from '@/components/ui/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('正しくレンダリングされる', () => {
    render(<Toast message="Test notification" />)
    expect(screen.getByText('Test notification')).toBeInTheDocument()
  })

  it('variant propsが正しく適用される', () => {
    const { rerender } = render(<Toast message="Success" variant="success" />)
    expect(screen.getByText('Success')).toBeInTheDocument()

    rerender(<Toast message="Error" variant="error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()

    rerender(<Toast message="Warning" variant="warning" />)
    expect(screen.getByText('Warning')).toBeInTheDocument()

    rerender(<Toast message="Info" variant="info" />)
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
    vi.useRealTimers() // Use real timers for this test
    const handleClose = vi.fn()
    const user = userEvent.setup()

    render(<Toast message="Test" onClose={handleClose} />)

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    // Wait for animation (300ms)
    await waitFor(
      () => {
        expect(handleClose).toHaveBeenCalled()
      },
      { timeout: 500 }
    )
  })

  it('showCloseButton=falseの時に閉じるボタンが非表示', () => {
    render(<Toast message="Test" showCloseButton={false} />)
    expect(screen.queryByLabelText('Close')).not.toBeInTheDocument()
  })

  it('指定したduration後に自動的にonCloseが呼ばれる', () => {
    const handleClose = vi.fn()

    render(<Toast message="Test" duration={3000} onClose={handleClose} />)

    // Fast-forward time (3000ms duration + 300ms animation)
    vi.advanceTimersByTime(3350)

    expect(handleClose).toHaveBeenCalled()
  })

  it('duration=0の時に自動で閉じない', async () => {
    const handleClose = vi.fn()

    render(<Toast message="Test" duration={0} onClose={handleClose} />)

    vi.advanceTimersByTime(10000)

    expect(handleClose).not.toHaveBeenCalled()
  })
})

describe('ToastList', () => {
  it('トーストが正しく表示される', () => {
    const toasts = [
      { id: '1', message: 'Toast 1', variant: 'success' as const },
      { id: '2', message: 'Toast 2', variant: 'error' as const },
    ]

    render(<ToastList toasts={toasts} onRemove={vi.fn()} />)

    expect(screen.getByText('Toast 1')).toBeInTheDocument()
    expect(screen.getByText('Toast 2')).toBeInTheDocument()
  })

  it('トーストがない時は何も表示しない', () => {
    const { container } = render(<ToastList toasts={[]} onRemove={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('トーストを閉じるとonRemoveが呼ばれる', async () => {
    const handleRemove = vi.fn()
    const user = userEvent.setup()

    const toasts = [{ id: '1', message: 'Toast 1', variant: 'info' as const }]

    render(<ToastList toasts={toasts} onRemove={handleRemove} />)

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    // Wait for animation (300ms)
    await waitFor(
      () => {
        expect(handleRemove).toHaveBeenCalledWith('1')
      },
      { timeout: 500 }
    )
  })
})
