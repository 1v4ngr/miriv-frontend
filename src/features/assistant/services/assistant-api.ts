import type { BaseEvent, RunAgentInput } from '@ag-ui/core'
import { ApiRequestError, clearAccessToken, getAccessToken } from '../../../services/api-client'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

/** An AG-UI event as it arrives (https://docs.ag-ui.com/concepts/events): `type` plus its own fields. */
export type AgUiEvent = BaseEvent & Record<string, unknown>

/**
 * Splits an AG-UI event stream (Server-Sent Events, one JSON event per `data:` block) into complete events;
 * returns the unconsumed remainder. Malformed blocks are skipped.
 */
export function parseAgUiStream(buffer: string): { events: AgUiEvent[]; rest: string } {
  const events: AgUiEvent[] = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('')
    if (!data) continue
    try {
      const event = JSON.parse(data) as AgUiEvent
      if (typeof event.type === 'string') events.push(event)
    } catch {
      // ignore malformed event
    }
  }
  return { events, rest }
}

/** Runs the agent over AG-UI: posts a RunAgentInput and hands each event of the answer stream to `onEvent`. */
export async function runAssistant(input: RunAgentInput, onEvent: (event: AgUiEvent) => void, signal?: AbortSignal): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/ai/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${getAccessToken() ?? ''}` },
      body: JSON.stringify(input),
    })
  } catch {
    if (signal?.aborted) return
    throw new ApiRequestError(0, 'No hay conexión con el asistente.', { code: 'NETWORK' })
  }
  if (response.status === 401) {
    clearAccessToken()
    window.dispatchEvent(new Event('miriv:session-expired'))
    throw new ApiRequestError(401, 'Tu sesión ha caducado. Vuelve a iniciar sesión.')
  }
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined
    throw new ApiRequestError(response.status, payload?.message ?? 'El asistente no está disponible.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseAgUiStream(buffer)
    buffer = parsed.rest
    parsed.events.forEach(onEvent)
  }
}
