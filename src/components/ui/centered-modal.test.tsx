import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CenteredModal } from './centered-modal'

describe('CenteredModal', () => {
  beforeEach(() => { cleanup() })
  afterEach(() => { cleanup() })

  it('renders nothing when closed', () => {
    const { container } = render(
      <CenteredModal open={false} title="Hola" onClose={() => {}}>x</CenteredModal>,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a modal with aria attributes when open', () => {
    render(
      <CenteredModal open title="Confirmar" size="md" onClose={() => {}}>contenido</CenteredModal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Confirmar' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'centered-modal-title')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<CenteredModal open title="t" onClose={onClose}>x</CenteredModal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on backdrop click but not on inner click', () => {
    const onClose = vi.fn()
    render(
      <CenteredModal open title="t" onClose={onClose}>
        <button type="button">dentro</button>
      </CenteredModal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'dentro' }))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(screen.getByTestId('centered-modal-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders a footer with primary action when configured', () => {
    const onPrimary = vi.fn()
    render(
      <CenteredModal open title="t" primaryLabel="Guardar" onPrimary={onPrimary} onClose={() => {}}>x</CenteredModal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onPrimary).toHaveBeenCalledOnce()
  })
})
