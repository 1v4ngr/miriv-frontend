import { AlertTriangle, Ban, Info } from 'lucide-react'
import type { BlendCheck, CheckLevel } from '../checks'

const STYLE: Record<CheckLevel, { icon: typeof Info; cls: string; label: string }> = {
  BLOCK: { icon: Ban, cls: 'bg-[#f7dadf] text-[#8e1f33]', label: 'Bloquea' },
  WARN: { icon: AlertTriangle, cls: 'bg-[#f8ecc9] text-[#6b5a10]', label: 'Aviso' },
  INFO: { icon: Info, cls: 'bg-[#eee9f4] text-[#5b4a72]', label: 'Nota' },
}
const ORDER: CheckLevel[] = ['BLOCK', 'WARN', 'INFO']

export function ChecksList({ checks }: { checks: BlendCheck[] }) {
  if (checks.length === 0) return null
  const sorted = [...checks].sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level))
  return (
    <ul className="space-y-1.5" aria-label="Comprobaciones">
      {sorted.map((check) => {
        const { icon: Icon, cls, label } = STYLE[check.level]
        return (
          <li key={check.code + check.message} className={`flex gap-2 rounded-xl px-3 py-2 text-xs ${cls}`}>
            <Icon className="mt-0.5 size-4 shrink-0" aria-label={label} />
            <div>
              <p>{check.message}</p>
              {check.reference && <p className="mt-0.5 text-[11px] opacity-75">{check.reference}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
