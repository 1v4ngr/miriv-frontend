import type { ReactNode } from 'react'

interface StatusBadgeProps {
  children: ReactNode
  tone: 'critical' | 'overdue' | 'high' | 'soft'
}

const toneClasses: Record<StatusBadgeProps['tone'], string> = {
  critical: 'bg-[#f7dadf] text-[#8e1f33]',
  overdue: 'bg-[#f5e4da] text-[#7a4a22]',
  high: 'bg-[#fae3d3] text-[#8a4715]',
  soft: 'bg-[#f3e7ee] text-plum',
}

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ${toneClasses[tone]}`}>{children}</span>
}
