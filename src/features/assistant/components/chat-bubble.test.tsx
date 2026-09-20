import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatBubble, depositFromHash } from './chat-bubble'
import { MarkdownMessage } from './markdown-message'

function setViewport(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px') ? phone : !phone,
    media: query, addEventListener: () => {}, removeEventListener: () => {}, onchange: null,
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('depositFromHash', () => {
  it('extracts the code only on deposit detail routes', () => {
    expect(depositFromHash('#deposits/D-01')).toBe('D-01')
    expect(depositFromHash('#deposits/D%2001')).toBe('D 01')
    expect(depositFromHash('#deposits/D-01/movement')).toBeUndefined()
    expect(depositFromHash('#deposits')).toBeUndefined()
  })
})

describe('MarkdownMessage', () => {
  it('renders gfm tables', () => {
    render(<MarkdownMessage text={'| Depósito | Densidad |\n| --- | --- |\n| D-01 | 1015 |'} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Densidad' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'D-01' })).toBeInTheDocument()
  })
  it('renders bold and bullets and never injects raw html', () => {
    render(<MarkdownMessage text={'Hola **mundo**\n- uno\n- <b>dos</b>'} />)
    expect(screen.getByText('mundo').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(document.querySelector('b')).toBeNull()
  })
})

describe('ChatBubble', () => {
  beforeEach(() => {
    cleanup() // vitest runs without globals, so testing-library's auto-cleanup is not registered

    localStorage.setItem('miriv.access-token', 'token')
    window.location.hash = '#deposits/D-01'
  })

  it('opens as a bottom sheet on phones', () => {
    setViewport(true)
    render(<ChatBubble />)
    fireEvent.click(screen.getByLabelText('Abrir asistente'))
    expect(screen.getByRole('dialog', { name: 'Asistente MIRIV' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('Depósito D-01')).toBeInTheDocument()
  })

  it('opens as a floating panel on desktop', () => {
    setViewport(false)
    render(<ChatBubble />)
    fireEvent.click(screen.getByLabelText('Abrir asistente'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText('Asistente MIRIV')).toBeInTheDocument()
  })
})
