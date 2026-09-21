import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

const SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'max-w-[420px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[720px]',
}

interface CenteredModalProps {
  open: boolean
  title: string
  /** `sm` (420), `md` (560), `lg` (720) — max-width of the panel. */
  size?: 'sm' | 'md' | 'lg'
  /** When set, the modal renders a footer with `Cancelar` (closes) and this primary action. */
  primaryLabel?: string
  primaryDisabled?: boolean
  primaryKind?: 'default' | 'danger'
  onPrimary?: () => void
  /** Optional fixed secondary action on the left of the footer (does not close). */
  secondaryLabel?: string
  onSecondary?: () => void
  /** Optional sub-header text below the title. */
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Single-dialog primitive used across the Análisis section (parameters, templates, targets, rules).
 * Escape and backdrop click close it. Body scroll is locked while open and the first focusable
 * element receives focus on mount.
 */
export function CenteredModal({
  open, title, size = 'md', primaryLabel, primaryDisabled, primaryKind = 'default',
  onPrimary, secondaryLabel, onSecondary, subtitle, onClose, children,
}: CenteredModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(
        'input, select, textarea, button:not([aria-label="Cerrar"])',
      )
      target?.focus()
    })
    return () => {
      window.removeEventListener('keydown', handle)
      document.body.style.overflow = previous
      window.cancelAnimationFrame(frame)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-[#2e262a]/40 p-4"
      onMouseDown={onClose}
      data-testid="centered-modal-overlay"
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="centered-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
        className={`flex max-h-[90vh] w-full ${SIZE[size]} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id="centered-modal-title" className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-plum-soft"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {(primaryLabel || secondaryLabel) && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-4">
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="min-h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold"
              >
                {secondaryLabel}
              </button>
            )}
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={onPrimary}
              className={`min-h-9 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-60 ${
                primaryKind === 'danger' ? 'bg-[#8e1f33]' : 'bg-plum'
              }`}
            >
              {primaryLabel}
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}
