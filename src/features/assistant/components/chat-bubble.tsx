import { useEffect, useRef, useState, type FormEvent } from 'react'
import { MessageCircle, Send, Square, Trash2, X } from 'lucide-react'
import { hasActiveSession } from '../../../services/api-client'
import { clearAssistantHistory, useAssistantChat } from '../hooks/use-assistant-chat'
import { PHONE_QUERY, useMediaQuery } from '../hooks/use-media-query'
import { MarkdownMessage } from './markdown-message'

/** Deposit code when the user is on a deposit detail page (`#deposits/<code>`), so the AI can prioritise it. */
export function depositFromHash(hash: string): string | undefined {
  const route = hash.replace(/^#/, '')
  const match = /^deposits\/([^/]+)$/.exec(route)
  return match ? decodeURIComponent(match[1]) : undefined
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
  const phone = useMediaQuery(PHONE_QUERY)
  const { messages, busy, status, send, stop, clear } = useAssistantChat(depositCode)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'end' }) }, [messages, status, open])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft
    setDraft('')
    void send(text)
  }

  if (!open) {
    return (
      // Above the mobile bottom nav (fixed, z-20, hidden from lg up).
      <button type="button" aria-label="Abrir asistente" onClick={() => setOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-30 flex size-14 items-center justify-center rounded-full bg-plum text-white shadow-lg transition hover:bg-plum-dark active:scale-95 lg:bottom-6 lg:right-6">
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    )
  }

  const panel = (
    <section
      // On phones index.css turns this into a full-height bottom sheet with a grab handle,
      // draggable down to close (lib/mobile-sheets.ts triggers the backdrop's mousedown).
      {...(phone ? { role: 'dialog' as const, 'aria-modal': true } : {})}
      aria-label="Asistente MIRIV"
      onMouseDown={event => event.stopPropagation()}
      className={`flex flex-col overflow-hidden bg-white ${phone
        ? 'w-full rounded-t-[22px]'
        : 'fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-4 z-30 h-[min(34rem,calc(100dvh-10rem))] w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border shadow-2xl lg:bottom-6 lg:right-6 lg:h-[min(38rem,calc(100dvh-4rem))] lg:w-[26rem] xl:h-[min(44rem,calc(100dvh-4rem))] xl:w-[30rem]'}`}>
      <header className="flex items-center justify-between gap-2 bg-plum px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Asistente MIRIV</p>
          <p className="truncate text-xs opacity-80">{depositCode ? `Depósito ${depositCode}` : 'Consulta tu bodega'}</p>
        </div>
        <div className="flex flex-none gap-1">
          <button type="button" aria-label="Borrar conversación" title="Borrar conversación" onClick={clear}
            className="rounded-lg p-2 hover:bg-white/15"><Trash2 size={18} aria-hidden="true" /></button>
          <button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)}
            className="rounded-lg p-2 hover:bg-white/15"><X size={18} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain bg-field p-3 text-[13.5px] text-ink">
        {messages.length === 0 && (
          <p className="text-muted">Pregúntame por el estado de un depósito, qué alertas hay o qué conviene hacer hoy.</p>
        )}
        {messages.map((message, index) => (
          <div key={index} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={`max-w-[88%] rounded-2xl px-3 py-2 sm:max-w-[85%] ${message.role === 'user'
              ? 'bg-plum text-white'
              : message.error ? 'border border-red-200 bg-red-50 text-red-800' : 'w-full border border-border bg-white'}`}>
              {message.role === 'user' ? <span className="whitespace-pre-wrap break-words">{message.content}</span> : <MarkdownMessage text={message.content} />}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs italic text-muted" role="status">{status}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit}
        className="flex items-end gap-2 border-t border-border bg-white p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <textarea ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={2000}
          placeholder="Escribe tu pregunta…"
          onKeyDown={event => {
            // Enter sends on pointer devices; on phones it adds a newline and the button sends.
            if (event.key === 'Enter' && !event.shiftKey && !phone) { event.preventDefault(); submit(event) }
          }}
          className="max-h-28 min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-xl border border-border bg-field px-3 py-2.5 outline-none focus:border-plum" />
        {busy
          ? <button type="button" aria-label="Detener" onClick={stop} className="flex size-11 flex-none items-center justify-center rounded-xl bg-plum-soft text-plum"><Square size={18} aria-hidden="true" /></button>
          : <button type="submit" aria-label="Enviar" disabled={!draft.trim()} className="flex size-11 flex-none items-center justify-center rounded-xl bg-plum text-white disabled:opacity-40"><Send size={18} aria-hidden="true" /></button>}
      </form>
    </section>
  )

  if (!phone) return panel
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-[#2e262a]/30" onMouseDown={() => setOpen(false)}>
      {panel}
    </div>
  )
}
