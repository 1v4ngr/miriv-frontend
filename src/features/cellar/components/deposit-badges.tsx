import { Layers, MapPin, Sun, Warehouse, type LucideIcon } from 'lucide-react'

interface LocationMeta { icon: LucideIcon; className: string }

// Deposit locations are zones. The three known ones get their own icon and tint so the table can be
// scanned at a glance; any other zone a center defines falls back to a neutral pin.
const locationMeta: Record<string, LocationMeta> = {
  exterior: { icon: Sun, className: 'bg-[#fbeed3] text-[#85560c]' },
  interior: { icon: Warehouse, className: 'bg-[#e3ebf4] text-[#2f4d6e]' },
  suelo: { icon: Layers, className: 'bg-[#ede3d8] text-[#6b4a2b]' },
}
const fallbackLocation: LocationMeta = { icon: MapPin, className: 'bg-[#efeff5] text-[#43435c]' }

export const locationOrder = ['exterior', 'interior', 'suelo']

export function locationKey(zone?: string | null) {
  return (zone ?? '').trim().toLocaleLowerCase('es')
}

export function LocationBadge({ zone, compact = false }: { zone?: string | null; compact?: boolean }) {
  if (!zone) return <span className="text-[11px] text-muted">Sin localización</span>
  const meta = locationMeta[locationKey(zone)] ?? fallbackLocation
  const Icon = meta.icon
  return <span title={zone} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.className}`}><Icon className="size-3" aria-hidden="true" />{compact ? null : zone}</span>
}

export function LocationIcon({ zone }: { zone?: string | null }) {
  const Icon = (locationMeta[locationKey(zone)] ?? fallbackLocation).icon
  return <Icon className="size-3.5" aria-hidden="true" />
}

// Content categories arrive as their display name (Tinto, Blanco, ...). Colors follow the product.
const contentColors: Record<string, { dot: string; badge: string }> = {
  tinto: { dot: 'bg-[#7b1e3a]', badge: 'bg-[#f5dde4] text-[#7b1e3a]' },
  blanco: { dot: 'bg-[#d4b22c]', badge: 'bg-[#f8efcc] text-[#6f5708]' },
  rosado: { dot: 'bg-[#e0789d]', badge: 'bg-[#fbe3ec] text-[#a1325b]' },
  mosto: { dot: 'bg-[#7a9a3a]', badge: 'bg-[#e6efd6] text-[#465f18]' },
  'vino base': { dot: 'bg-[#c08a3e]', badge: 'bg-[#f4e6cf] text-[#7a4f12]' },
}
const fallbackContent = { dot: 'bg-plum', badge: 'bg-plum-soft text-plum' }

export function contentDotClass(category?: string | null) {
  return category ? (contentColors[category.toLocaleLowerCase('es')] ?? fallbackContent).dot : 'border border-dashed border-[#b8aab1] bg-transparent'
}

export function ContentBadge({ category }: { category?: string | null }) {
  if (category === undefined) return <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-[#d6c8cf] px-2 py-0.5 text-[10.5px] font-semibold text-muted">Vacío</span>
  const colors = category ? (contentColors[category.toLocaleLowerCase('es')] ?? fallbackContent) : fallbackContent
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${colors.badge}`}><span className={`size-1.5 rounded-full ${colors.dot}`} aria-hidden="true" />{category || 'Sin categoría'}</span>
}
