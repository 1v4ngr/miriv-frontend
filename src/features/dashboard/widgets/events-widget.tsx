import { ArrowRightLeft, ClipboardCheck, FlaskConical, Wrench } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { formatDateTime } from '../../../lib/format'
import { DepositPicker } from '../components/deposit-picker'
import { EVENT_COLORS } from '../../tracking/components/series-chart'
import type { Period } from '../../tracking/favorites'
import { PERIODS, periodStart } from '../../tracking/period'
import { trackingApi, type TrackingEvent } from '../../tracking/services/tracking-api'
import { useDashboardContext } from '../dashboard-context'
import { effectiveContents, effectivePeriod } from '../filters'
import type { EventsWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

const GROUPS: Array<{ value: string; label: string; types: TrackingEvent['type'][] }> = [
  { value: 'movements', label: 'Movimientos', types: ['TRANSFER', 'ENTRY', 'MIX', 'SPLIT', 'EXIT', 'LOSS', 'ADJUSTMENT'] },
  { value: 'operations', label: 'Operaciones', types: ['OPERATION'] },
  { value: 'reviews', label: 'Revisiones de estado', types: ['STATE_REVIEW'] },
]
const iconOf = (type: string) => (type === 'OPERATION' ? Wrench : type === 'STATE_REVIEW' ? ClipboardCheck : type === 'ENTRY' ? FlaskConical : ArrowRightLeft)
const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy'

/** Newest-first list of what happened to the chosen tanks. */
export function EventsWidgetView({ widget, globals, openSettings }: WidgetProps<EventsWidget>) {
  const { overview } = useDashboardContext()
  const contents = effectiveContents(widget.contents, widget.followGlobal, globals, overview)
  const period = effectivePeriod(widget.period, widget.followGlobal, globals)
  const events = useResource(() => (contents.length ? trackingApi.events(contents, periodStart(period)) : Promise.resolve([] as TrackingEvent[])), [contents.join(','), period])
  if (contents.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        <p>Elige depósitos para ver sus eventos.</p>
        <button type="button" onClick={openSettings} className="mt-2 font-semibold text-plum underline">Abrir ⚙ Ajustes</button>
      </div>
    )
  }
  if (events.loading) return <LoadingState label="Cargando…" />
  if (events.error) return <ErrorState message={events.error} onRetry={events.reload} />
  const allowed = widget.types.length ? new Set(GROUPS.filter((group) => widget.types.includes(group.value)).flatMap((group) => group.types)) : null
  const list = [...(events.data ?? [])].filter((event) => !allowed || allowed.has(event.type)).sort((a, b) => b.at.localeCompare(a.at))
  if (list.length === 0) return <div className="p-3"><EmptyState label="Sin eventos en este periodo." /></div>
  return (
    <ul className="divide-y divide-border">
      {list.map((event, index) => {
        const Icon = iconOf(event.type)
        return (
          <li key={`${event.at}|${event.content}|${index}`} className="flex gap-2 px-3 py-2 text-xs">
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color: EVENT_COLORS[event.type] ?? '#6d4656' }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-semibold">{event.label} <span className="font-mono font-normal text-muted">{event.content}</span></p>
              <p className="text-[11px] text-muted">{formatDateTime(event.at)}{event.detail ? ` · ${event.detail}` : ''}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function EventsWidgetSettings({ widget, onChange }: WidgetSettingsProps<EventsWidget>) {
  const { overview } = useDashboardContext()
  return (
    <div className="space-y-4">
      <DepositPicker rows={overview?.rows ?? []} selected={widget.contents} onChange={(contents) => onChange({ ...widget, contents })} />
      <label className="grid gap-1 font-semibold text-muted">Periodo
        <select value={widget.period} disabled={widget.followGlobal} onChange={(event) => onChange({ ...widget, period: event.target.value as Period })} className={select}>
          {PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-semibold text-muted">Tipos (ninguno marcado = todos)</legend>
        {GROUPS.map((group) => (
          <label key={group.value} className="flex items-center gap-2">
            <input type="checkbox" checked={widget.types.includes(group.value)} onChange={(event) => onChange({ ...widget, types: event.target.checked ? [...widget.types, group.value] : widget.types.filter((item) => item !== group.value) })} className="size-3.5 accent-plum" />{group.label}
          </label>
        ))}
      </fieldset>
    </div>
  )
}
