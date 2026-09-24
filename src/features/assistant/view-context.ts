import { useEffect } from 'react'

/**
 * What the user has in front of them, for the assistant (sent as AG-UI `context`). Each screen publishes a
 * compact, structured picture of what it shows — the deposit and its phase, the readings, the filtered rows…
 * — so "¿cómo ves este depósito?" or "¿cuál de estos está peor?" need no explanation.
 */
export interface AssistantView {
  /** Stable screen id: `deposit-detail`, `deposits-list`, `home`… */
  screen: string
  /** What the screen is about, as the user would say it ("Depósito 239"). */
  title: string
  /** The data on screen, compact and already in the words the screen uses. */
  data?: Record<string, unknown>
  /** Questions that make sense here, offered as shortcuts in the chat. */
  suggestions?: string[]
  /** When this picture was taken (ISO). */
  capturedAt?: string
}

type Listener = (view: AssistantView) => void
let published: AssistantView | null = null
const listeners = new Set<Listener>()

/** Screens that publish nothing still say where the user is, from the route. */
export function viewFromRoute(hash: string): AssistantView {
  const route = decodeURIComponent(hash.replace(/^#/, '').split('?')[0]) || 'home'
  const [section, id] = route.split('/')
  const names: Record<string, string> = {
    home: 'Inicio', deposits: 'Depósitos', lots: 'Lotes', movements: 'Movimientos', contents: 'Contenido', laboratory: 'Laboratorio',
    tracking: 'Seguimiento', dashboard: 'Paneles de seguimiento', blend: 'Simulador de mezclas', reports: 'Informes', admin: 'Administración', audit: 'Auditoría', account: 'Mi cuenta',
  }
  const title = id ? `${names[section] ?? section} ${id}` : names[section] ?? section
  return { screen: id ? `${section}-detail` : section, title, data: { route } }
}

/** The picture of the current screen, taken now. */
export function currentView(): AssistantView {
  const view = published ?? viewFromRoute(window.location.hash)
  return { ...view, capturedAt: new Date().toISOString() }
}

export function onViewChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function publish(view: AssistantView | null) {
  published = view
  const next = view ?? viewFromRoute(window.location.hash)
  listeners.forEach((listener) => listener(next))
}

/**
 * Publishes what this screen shows while it is mounted. Pass `null` while the data is still loading. The
 * picture is replaced whenever `view` changes (compare by value: pass a memoised object or a stable JSON).
 */
export function useAssistantView(view: AssistantView | null) {
  const key = view ? JSON.stringify(view) : ''
  useEffect(() => {
    if (!view) return
    publish(view)
    return () => { if (published && JSON.stringify(published) === key) publish(null) }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
}
