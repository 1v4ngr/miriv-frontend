import type { Deposit } from './types'

export function formatLiters(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
}

export function activeOccupation(deposit: Deposit) {
  return deposit.occupations.find((occupation) => !occupation.exitDate)
}

export function statusLabel(deposit: Deposit): string {
  if (deposit.status === 'available') return 'Vacío · limpio'
  if (deposit.status === 'maintenance') return 'Mantenimiento'
  if (deposit.status === 'cleaning') return 'En limpieza'
  if (deposit.priority === 'critical') return 'Crítica'
  if (deposit.priority === 'overdue') return 'Control vencido'
  if (deposit.priority === 'high') return 'Alta'
  return 'Ocupado'
}

export function statusClass(deposit: Deposit): string {
  if (deposit.priority === 'critical') return 'bg-[#f7dadf] text-[#8e1f33]'
  if (deposit.priority === 'overdue') return 'bg-[#f5e4da] text-[#7a4a22]'
  if (deposit.priority === 'high') return 'bg-[#fae3d3] text-[#8a4715]'
  if (deposit.status === 'available') return 'bg-[#dceadf] text-[#1f5c3a]'
  if (deposit.status === 'maintenance' || deposit.status === 'cleaning') return 'bg-[#efeff5] text-[#43435c]'
  return 'bg-[#f3e7ee] text-plum'
}
