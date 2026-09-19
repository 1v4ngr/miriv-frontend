import { ApiRequestError, clearAccessToken, getAccessToken } from '../../../services/api-client'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export type AssistantEvent =
  | { type: 'tool_call'; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; ok: boolean }
  | { type: 'final'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

/** Splits an SSE text buffer into complete events; returns the unconsumed remainder. */
export function parseSse(buffer: string): { events: AssistantEvent[]; rest: string } {
  const events: AssistantEvent[] = []
  const blocks = buffer.split('\n\n')
  const rest = blocks.pop() ?? ''
  for (const block of blocks) {
    let type = ''
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) type = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
    }
    if (!type) continue
    try {
      events.push({ type, ...(data ? JSON.parse(data) : {}) } as AssistantEvent)
    } catch {
      // ignore malformed event
    }
  }
  return { events, rest }
}

export async function streamChat(
  messages: ChatMessage[],
  context: { depositCode?: string },
  onEvent: (event: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/ai/chat`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken() ?? ''}` },
      body: JSON.stringify({ messages, context }),
    })
  } catch (error) {
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
    const parsed = parseSse(buffer)
    buffer = parsed.rest
    parsed.events.forEach(onEvent)
  }
}
