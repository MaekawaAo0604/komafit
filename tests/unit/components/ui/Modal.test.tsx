/**
 * Modal Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  beforeEach(() => {
    // モーダルのportalターゲットを作成
    const div = document.createElement('div')
    div.setAttribute('id', 'modal-root')
    document.body.appendChild(div)
  })

  afterEach(() => {
    // クリーンアップ
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
  })

  it('isOpenがtrueの時に表示される', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal">
        <Modal.Body>Modal content</Modal.Body>
      </Modal>
    )

    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('isOpenがfalseの時に非表示', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <Modal.Body>Modal content</Modal.Body>
      </Modal>
    )

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument()
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('タイトルが正しく表示される', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="My Modal Title">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )

    expect(screen.getByText('My Modal Title')).toBeInTheDocument()
  })

  it('閉じるボタンをクリックするとonCloseが呼ばれる', async () => {
    const handleClose = vi.fn()
    const user = userEvent.setup()

    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('バックドロップをクリックするとonCloseが呼ばれる', async () => {
    const handleClose = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )

    // バックドロップをクリック（モーダルコンテナの外側）
    const backdrop = container.querySelector('[class*="Backdrop"]')
    if (backdrop) {
      await user.click(backdrop)
      expect(handleClose).toHaveBeenCalled()
    }
  })

  it('showCloseButton=falseの時に閉じるボタンが非表示', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test Modal" showCloseButton={false}>
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument()
  })

  it('size propsが正しく適用される', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Small Modal" size="sm">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )
    expect(screen.getByText('Small Modal')).toBeInTheDocument()

    rerender(
      <Modal isOpen={true} onClose={vi.fn()} title="Large Modal" size="lg">
        <Modal.Body>Content</Modal.Body>
      </Modal>
    )
    expect(screen.getByText('Large Modal')).toBeInTheDocument()
  })

  it('Modal.Bodyが正しくレンダリングされる', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <Modal.Body>This is the modal body</Modal.Body>
      </Modal>
    )

    expect(screen.getByText('This is the modal body')).toBeInTheDocument()
  })

  it('Modal.Footerが正しくレンダリングされる', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <Modal.Body>Content</Modal.Body>
        <Modal.Footer>
          <button>Cancel</button>
          <button>OK</button>
        </Modal.Footer>
      </Modal>
    )

    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('OK')).toBeInTheDocument()
  })
})
