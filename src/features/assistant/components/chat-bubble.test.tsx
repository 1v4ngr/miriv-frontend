import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChatBubble } from './chat-bubble'
import { viewFromRoute } from '../view-context'
import { MarkdownMessage } from './markdown-message'

function setViewport(phone: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px') ? phone : !phone,
    media: query, addEventListener: () => {}, removeEventListener: () => {}, onchange: null,
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('viewFromRoute', () => {
  it('names the screen from the route when the screen publishes nothing', () => {
    expect(viewFromRoute('#deposits/D%2001')).toMatchObject({ screen: 'deposits-detail', title: 'Depósitos D 01' })
    expect(viewFromRoute('#laboratory')).toMatchObject({ screen: 'laboratory', title: 'Laboratorio' })
    expect(viewFromRoute('')).toMatchObject({ screen: 'home', title: 'Inicio' })
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
  it('opens internal links in place and external ones in a new tab', () => {
    const onNavigate = vi.fn()
    render(<MarkdownMessage text={'[Depósito 239](#deposits/239) · [Web](https://example.com)'} onNavigate={onNavigate} />)
    const internal = screen.getByRole('link', { name: 'Depósito 239' })
    expect(internal).not.toHaveAttribute('target')
    fireEvent.click(internal)
    expect(onNavigate).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Web' })).toHaveAttribute('target', '_blank')
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
    expect(screen.getByText('Viendo: Depósitos D-01')).toBeInTheDocument()
  })

  it('opens as a floating panel on desktop', () => {
    setViewport(false)
    render(<ChatBubble />)
    fireEvent.click(screen.getByLabelText('Abrir asistente'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByLabelText('Asistente MIRIV')).toBeInTheDocument()
  })
})
