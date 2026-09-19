import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { MessageCircle, Send, Square, Trash2, X } from 'lucide-react'
import { hasActiveSession } from '../../../services/api-client'
import { clearAssistantHistory, useAssistantChat } from '../hooks/use-assistant-chat'

/** Deposit code when the user is on a deposit detail page (`#deposits/<code>`), so the AI can prioritise it. */
export function depositFromHash(hash: string): string | undefined {
  const route = hash.replace(/^#/, '')
  const match = /^deposits\/([^/]+)$/.exec(route)
  return match ? decodeURIComponent(match[1]) : undefined
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)
}

/** Minimal, XSS-safe markdown: paragraphs, bullet lists and bold. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let items: string[] = []
  const flush = () => {
    if (items.length) blocks.push(<ul key={`ul${blocks.length}`} className="ml-4 list-disc space-y-0.5">{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>)
    items = []
  }
  for (const line of text.split('\n')) {
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line)
    if (bullet) { items.push(bullet[1]); continue }
    flush()
    if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{inline(line.replace(/^#+\s*/, ''))}</p>)
  }
  flush()
  return <div className="space-y-1.5">{blocks}</div>
}

function useSession() {
  const [active, setActive] = useState(hasActiveSession)
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const update = () => { setActive(hasActiveSession()); setHash(window.location.hash) }
    window.addEventListener('hashchange', update)
    window.addEventListener('miriv:session-expired', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener('miriv:session-expired', update)
      window.removeEventListener('storage', update)
    }
  }, [])
  useEffect(() => { if (!active) clearAssistantHistory() }, [active])
  return { active, hash }
}

export function ChatBubble() {
  const { active, hash } = useSession()
  if (!active || hash.replace(/^#/, '') === 'login') return null
  return <ChatWidget depositCode={depositFromHash(hash)} />
}

function ChatWidget({ depositCode }: { depositCode?: string }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, busy, status, send, stop, clear } = useAssistantChat(depositCode)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, status, open])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  if (!open) {
    return (
      <button type="button" aria-label="Abrir asistente" onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-plum text-white shadow-lg transition hover:bg-plum-dark">
        <MessageCircle size={24} />
      </button>
    )
  }

  return (
    <section aria-label="Asistente MIRIV"
      className="fixed bottom-5 right-5 z-50 flex h-[min(34rem,calc(100vh-2.5rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-plum px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">Asistente MIRIV</p>
          <p className="text-xs opacity-80">{depositCode ? `Depósito ${depositCode}` : 'Consulta tu bodega'}</p>
        </div>
        <div className="flex gap-1">
          <button type="button" aria-label="Borrar conversación" title="Borrar conversación" onClick={clear} className="rounded p-1.5 hover:bg-white/15"><Trash2 size={16} /></button>
          <button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)} className="rounded p-1.5 hover:bg-white/15"><X size={16} /></button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-field p-3 text-sm text-ink">
        {messages.length === 0 && (
          <p className="text-muted">Pregúntame por el estado de un depósito, qué alertas hay o qué conviene hacer hoy.</p>
        )}
        {messages.map((message, i) => (
          <div key={i} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.role === 'user' ? 'bg-plum text-white' : message.error ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-border bg-white'}`}>
              {message.role === 'user' ? message.content : <Markdown text={message.content} />}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs italic text-muted" role="status">{status}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border bg-white p-2">
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Escribe tu pregunta…" maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-border bg-field px-3 py-2 text-sm outline-none focus:border-plum" />
        {busy
          ? <button type="button" aria-label="Detener" onClick={stop} className="rounded-lg bg-plum-soft p-2 text-plum"><Square size={18} /></button>
          : <button type="submit" aria-label="Enviar" disabled={!draft.trim()} className="rounded-lg bg-plum p-2 text-white disabled:opacity-40"><Send size={18} /></button>}
      </form>
    </section>
  )
}
