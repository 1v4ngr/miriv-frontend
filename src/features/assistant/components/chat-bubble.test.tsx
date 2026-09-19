import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { depositFromHash, Markdown } from './chat-bubble'

describe('depositFromHash', () => {
  it('extracts the code only on deposit detail routes', () => {
    expect(depositFromHash('#deposits/D-01')).toBe('D-01')
    expect(depositFromHash('#deposits/D%2001')).toBe('D 01')
    expect(depositFromHash('#deposits/D-01/movement')).toBeUndefined()
    expect(depositFromHash('#deposits')).toBeUndefined()
  })
})

describe('Markdown', () => {
  it('renders bold and bullets without injecting html', () => {
    render(<Markdown text={'Hola **mundo**\n- uno\n- <b>dos</b>'} />)
    expect(screen.getByText('mundo').tagName).toBe('STRONG')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('<b>dos</b>')).toBeTruthy()
  })
})
