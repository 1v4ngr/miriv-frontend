import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export interface ToastMessage {
  id: number
  text: ReactNode
  tone?: 'default' | 'error'
  action?: { label: string; onClick: () => void }
}

/**
 * One floating message at the bottom of the screen (above the phone navigation bar), with an optional
 * action such as "Deshacer". It slides in, stays `duration` ms and slides out; a new message replaces it.
 */
export function Toast({ message, onDismiss, duration = 6000 }: { message: ToastMessage | null; onDismiss: () => void; duration?: number }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [message, duration, onDismiss])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6" aria-live="polite">
      <AnimatePresence mode="popLayout">
        {message && (
          <motion.div key={message.id} role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`pointer-events-auto flex max-w-[min(100%,440px)] items-center gap-3 rounded-2xl px-4 py-3 text-[12.5px] text-white shadow-[0_12px_32px_rgba(46,38,42,0.28)] ${message.tone === 'error' ? 'bg-[#8e1f33]' : 'bg-[#2e262a]'}`}>
            <span className="min-w-0 flex-1">{message.text}</span>
            {message.action && <button type="button" onClick={() => { message.action?.onClick(); onDismiss() }} className="shrink-0 rounded-lg px-2 py-1 font-semibold text-[#f3c9d8] hover:bg-white/10">{message.action.label}</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
