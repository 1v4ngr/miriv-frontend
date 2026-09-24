import { useCallback, useEffect, useRef, useState } from 'react'
import type { Context, Message, Tool } from '@ag-ui/core'
import { runAssistant, type AgUiEvent, type ChatMessage } from '../services/assistant-api'
import { currentView } from '../view-context'
import { useAccount } from '../../../hooks/use-permissions'
import { useCurrentProfile } from '../../../hooks/use-current-profile'

const STORAGE_KEY = 'miriv.assistant.history'
const THREAD_KEY = 'miriv.assistant.thread'
const MAX_HISTORY = 30

export interface UiMessage extends ChatMessage { id?: string; error?: boolean; streaming?: boolean }

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

function load(): UiMessage[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(messages: UiMessage[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => !m.streaming).slice(-MAX_HISTORY))) } catch { /* storage unavailable */ }
}

/** One AG-UI thread per conversation: kept for the browser session, renewed when the chat is cleared. */
function threadId(renew = false): string {
  try {
    const existing = sessionStorage.getItem(THREAD_KEY)
    if (existing && !renew) return existing
    const id = newId()
    sessionStorage.setItem(THREAD_KEY, id)
    return id
  } catch {
    return newId()
  }
}

export function clearAssistantHistory() {
  try { sessionStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(THREAD_KEY) } catch { /* storage unavailable */ }
}

/** Screens the assistant may open for the user (AG-UI frontend tool `navigate_to`). */
const NAVIGABLE = /^(home|deposits|lots|movements|contents|laboratory|tracking|dashboard|blend|reports|admin|account)(\/[\w%.\-]+){0,2}$/

export const FRONTEND_TOOLS: Tool[] = [{
  name: 'navigate_to',
  description: 'Abre una pantalla de MIRIV para el usuario. Rutas: home, deposits, deposits/<código>, lots, lots/<código>, contents/<código>, movements, laboratory, tracking, tracking/<contenido>, reports, admin.',
  parameters: { type: 'object', properties: { path: { type: 'string', description: 'Ruta sin #, p. ej. deposits/239' } }, required: ['path'] },
}]

/** Performs a frontend tool call; returns false if it was not allowed. */
function performTool(name: string, rawArgs: string): boolean {
  if (name !== 'navigate_to') return false
  try {
    const path = String((JSON.parse(rawArgs || '{}') as { path?: unknown }).path ?? '').replace(/^#?\/?/, '')
    if (!NAVIGABLE.test(path)) return false
    window.location.hash = path
    return true
  } catch {
    return false
  }
}

// Human wording of the server tools while they run.
const TOOL_LABELS: Record<string, string> = {
  get_deposit_detail: 'el depósito', get_deposit_status: 'la evolución del depósito', get_cellar_overview: 'la bodega',
  list_deposits: 'los depósitos', get_alerts: 'las alertas', get_deposit_series: 'las series analíticas', list_movements: 'los movimientos',
  get_content: 'el contenido', get_deposit_events: 'los eventos', get_deposit_targets_and_rules: 'los objetivos', list_parameters: 'los parámetros',
}

/**
 * The assistant conversation over AG-UI. Every question carries, as `context`, what the user is looking at
 * (the published view), who they are and their local date and time; `tools` offers `navigate_to`.
 * The answer is shown as it streams in.
 */
export function useAssistantChat() {
  const [messages, setMessages] = useState<UiMessage[]>(load)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const account = useAccount()
  const profile = useCurrentProfile()

  useEffect(() => { save(messages) }, [messages])
  useEffect(() => () => abortRef.current?.abort(), [])

  const buildContext = useCallback((): Context[] => {
    const view = currentView()
    const now = new Date()
    return [
      { description: 'Vista actual del usuario (lo que tiene en pantalla ahora)', value: JSON.stringify(view) },
      { description: 'Usuario', value: JSON.stringify({ nombre: profile?.displayName, puesto: profile?.jobTitle, centro: profile?.centerName, zonas: profile?.zones, roles: account?.roles.map((role) => role.name) }) },
      { description: 'Fecha y hora local del usuario', value: `${now.toISOString()} (${Intl.DateTimeFormat().resolvedOptions().timeZone})` },
    ]
  }, [account, profile])

  const send = useCallback(async (text: string) => {
    const content = text.trim()
    if (!content || busy) return
    const history: UiMessage[] = [...messages, { id: newId(), role: 'user', content }]
    setMessages(history)
    setBusy(true)
    setStatus('Pensando…')
    const controller = new AbortController()
    abortRef.current = controller
    const calls = new Map<string, { name: string; args: string }>()
    let answered = false
    const agentMessages: Message[] = history.filter((m) => !m.error).map((m) => ({ id: m.id ?? newId(), role: m.role, content: m.content }))

    const onEvent = (event: AgUiEvent) => {
      switch (event.type) {
        case 'TOOL_CALL_START': {
          const name = String(event.toolCallName)
          calls.set(String(event.toolCallId), { name, args: '' })
          setStatus(FRONTEND_TOOLS.some((tool) => tool.name === name) ? 'Abriendo la pantalla…' : `Consultando ${TOOL_LABELS[name] ?? name.replace(/_/g, ' ')}…`)
          break
        }
        case 'TOOL_CALL_ARGS': {
          const call = calls.get(String(event.toolCallId))
          if (call) call.args += String(event.delta ?? '')
          break
        }
        case 'TOOL_CALL_END': {
          const call = calls.get(String(event.toolCallId))
          if (call && FRONTEND_TOOLS.some((tool) => tool.name === call.name)) performTool(call.name, call.args)
          setStatus('Pensando…')
          break
        }
        case 'TEXT_MESSAGE_START':
          answered = true
          setStatus(null)
          setMessages((prev) => [...prev, { id: String(event.messageId), role: 'assistant', content: '', streaming: true }])
          break
        case 'TEXT_MESSAGE_CONTENT':
          setMessages((prev) => prev.map((m) => (m.id === event.messageId ? { ...m, content: m.content + String(event.delta ?? '') } : m)))
          break
        case 'TEXT_MESSAGE_END':
          setMessages((prev) => prev.map((m) => (m.id === event.messageId ? { ...m, streaming: false } : m)))
          break
        case 'RUN_ERROR':
          answered = true
          setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: String(event.message ?? 'Error del asistente.'), error: true }])
          break
      }
    }

    try {
      await runAssistant({
        threadId: threadId(), runId: newId(), state: {}, messages: agentMessages, tools: FRONTEND_TOOLS, context: buildContext(), forwardedProps: {},
      }, onEvent, controller.signal)
      if (!answered && !controller.signal.aborted) {
        setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: 'No he recibido respuesta. Inténtalo de nuevo.', error: true }])
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado.'
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: message, error: true }])
    } finally {
      setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)))
      setBusy(false)
      setStatus(null)
      abortRef.current = null
    }
  }, [busy, messages, buildContext])

  const stop = useCallback(() => abortRef.current?.abort(), [])
  const clear = useCallback(() => { abortRef.current?.abort(); setMessages([]); clearAssistantHistory(); threadId(true) }, [])

  return { messages, busy, status, send, stop, clear }
}
