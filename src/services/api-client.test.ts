import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiRequest } from './api-client'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

describe('apiRequest', () => {
  it('maps 422 to an ApiRequestError with status and the server message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(422, { message: 'Capacidad superada' })))
    await expect(apiRequest('/api/deposits', { method: 'POST' })).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 422,
      message: 'Capacidad superada',
    })
  })

  it('appends violation fields to the message on 400', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, {
      message: 'Validation failed.',
      violations: [{ field: 'capacity', message: 'must be positive' }],
    })))
    let caught: unknown
    try {
      await apiRequest('/api/deposits', { method: 'POST' })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ApiRequestError)
    const err = caught as ApiRequestError
    expect(err.status).toBe(400)
    expect(err.message).toContain('capacity')
    expect(err.message).toContain('must be positive')
    expect(err.violations).toHaveLength(1)
  })

  it('returns an uncertain network error when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')))
    let caught: unknown
    try {
      await apiRequest('/api/deposits')
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(ApiRequestError)
    const err = caught as ApiRequestError
    expect(err.status).toBe(0)
    expect(err.code).toBe('NETWORK')
    expect(err.uncertain).toBe(true)
  })

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const result = await apiRequest('/api/deposits/1', { method: 'DELETE' })
    expect(result).toBeUndefined()
  })
})