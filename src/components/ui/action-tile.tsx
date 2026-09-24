import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Classes of a thumb-sized mobile action: icon over a short label. */
export const actionTileClass = 'flex h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-[11px] font-semibold transition-colors'

/** Thumb-sized mobile action tile. `primary` is the main action of the screen (one per row). */
export function ActionTile({ icon: Icon, label, primary = false, className = '', ...props }: { icon: LucideIcon; label: string; primary?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${actionTileClass} ${primary ? 'border-transparent bg-plum text-white active:bg-plum-dark' : 'border-border bg-white text-copy active:bg-plum-soft'} ${className}`}><Icon className="size-5" aria-hidden="true" />{label}</button>
}
