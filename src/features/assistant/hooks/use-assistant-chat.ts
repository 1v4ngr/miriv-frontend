import { useCallback, useEffect, useRef, useState } from 'react'
import { streamChat, type ChatMessage } from '../services/assistant-api'

const STORAGE_KEY = 'miriv.assistant.history'
const MAX_HISTORY = 30

export interface UiMessage extends ChatMessage { error?: boolean }

function load(): UiMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(messages: UiMessage[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY))) } catch { /* storage unavailable */ }
}

export function clearAssistantHistory() {
  try { sessionStorage.removeItem(STORAGE_KEY) } catch { /* storage unavailable */ }
}

export function useAssistantChat(depositCode?: string) {
  const [messages, setMessages] = useState<UiMessage[]>(load)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => { save(messages) }, [messages])
  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const history: UiMessage[] = [...messages, { role: 'user', content }]
    setMessages(history)
    setBusy(true)
    setStatus('Pensando…')
    const controller = new AbortController()
    abortRef.current = controller
    let answered = false
    try {
      await streamChat(
        history.filter(m => !m.error).map(({ role, content: c }) => ({ role, content: c })),
        { depositCode },
        event => {
          if (event.type === 'tool_call') setStatus(`Consultando ${event.tool.replace(/_/g, ' ')}…`)
          else if (event.type === 'final') { answered = true; setMessages(prev => [...prev, { role: 'assistant', content: event.text }]) }
          else if (event.type === 'error') { answered = true; setMessages(prev => [...prev, { role: 'assistant', content: event.message, error: true }]) }
        },
        controller.signal,
      )
      if (!answered && !controller.signal.aborted) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'No he recibido respuesta. Inténtalo de nuevo.', error: true }])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado.'
      setMessages(prev => [...prev, { role: 'assistant', content: message, error: true }])
    } finally {
      setBusy(false)
      setStatus(null)
      abortRef.current = null
    }
  }, [busy, messages, depositCode])

  const stop = useCallback(() => abortRef.current?.abort(), [])
  const clear = useCallback(() => { abortRef.current?.abort(); setMessages([]); clearAssistantHistory() }, [])

  return { messages, busy, status, send, stop, clear }
}
