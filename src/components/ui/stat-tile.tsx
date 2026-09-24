import type { ReactNode } from 'react'

/**
 * A headline figure in a white card: small label, the value, an optional hint. Clickable when `onClick` is
 * given (it then leads to the screen behind the figure). Used by the deposit detail and the home page.
 */
export function StatTile({ label, value, hint, tone, onClick, children, className = '' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'danger' | 'warning'
  onClick?: () => void
  children?: ReactNode
  className?: string
}) {
  const valueTone = tone === 'danger' ? 'text-[#9b1f36]' : tone === 'warning' ? 'text-[#8a6412]' : 'text-ink'
  const body = <>{children}<div className="min-w-0"><div className="truncate text-[11px] text-muted">{label}</div><div className={`truncate text-[16px] font-semibold ${valueTone}`}>{value}</div>{hint && <div className="truncate text-[10.5px] text-muted">{hint}</div>}</div></>
  const base = `flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-white px-3.5 py-3 text-left sm:px-4 ${className}`
  return onClick
    ? <button type="button" onClick={onClick} className={`${base} transition-colors hover:border-[#d6c1cc] active:bg-[#fdfbfc]`}>{body}</button>
    : <div className={base}>{body}</div>
}
