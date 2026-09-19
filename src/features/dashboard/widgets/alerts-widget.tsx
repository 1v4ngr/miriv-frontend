import { useEffect, useState } from 'react'
import { AlertTriangle, BellRing, Check, Info, OctagonAlert } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useCan } from '../../../hooks/use-permissions'
import { useResource } from '../../../hooks/use-resource'
import { formatRelative } from '../../../lib/format'
import { trackingApi, type AlertSeverity, type TrackingAlert } from '../../tracking/services/tracking-api'
import type { AlertsWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

const REFRESH_MS = 60_000
const RANK: Record<AlertSeverity, number> = { INFO: 1, WARN: 2, CRIT: 3 }
const STYLE: Record<AlertSeverity, { icon: typeof Info; chip: string; label: string }> = {
  CRIT: { icon: OctagonAlert, chip: 'bg-[#f7dadf] text-[#8e1f33]', label: 'Crítico' },
  WARN: { icon: AlertTriangle, chip: 'bg-[#f8ecc9] text-[#6b5a10]', label: 'Aviso' },
  INFO: { icon: Info, chip: 'bg-[#e0ecf5] text-[#1f4f73]', label: 'Info' },
}

/** Rules that hold right now (e.g. "fermentación terminada") for the tanks of the cellar, most serious first. */
export function AlertsWidgetView({ widget, globals, onNavigate }: WidgetProps<AlertsWidget>) {
  const list = useResource(() => trackingApi.alerts(), [])
  const canAck = useCan('INCIDENT_ACKNOWLEDGE')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const timer = window.setInterval(list.reload, REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [list.reload])

  if (!list.data && list.loading) return <LoadingState label="Cargando avisos…" />
  if (list.error && !list.data) return <ErrorState message={list.error} onRetry={list.reload} />

  const focused = widget.followGlobal && globals.contents.length > 0 ? new Set(globals.contents) : null
  const shown = (list.data ?? []).filter((alert) => RANK[alert.severity] >= RANK[widget.minSeverity] && (!focused || focused.has(alert.content)))
  if (shown.length === 0) {
    return <p className="flex items-center justify-center gap-2 p-6 text-center text-xs text-muted"><Check className="size-4 text-[#1f5c3a]" aria-hidden="true" />Sin avisos: todo dentro de lo previsto.</p>
  }

  const acknowledge = async (alert: TrackingAlert) => {
    setBusy(alert.ruleId + alert.content); setError('')
    try { await trackingApi.acknowledgeAlert(alert.ruleId, alert.content); list.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido marcar como visto.') }
    finally { setBusy('') }
  }

  return (
    <div>
      {error && <p role="alert" className="m-2 rounded-lg bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}
      <ul className="divide-y divide-border" aria-label="Avisos activos">
        {shown.map((alert) => {
          const { icon: Icon, chip, label } = STYLE[alert.severity]
          return (
            <li key={alert.ruleId + alert.content} className="flex flex-wrap items-start gap-2 px-3 py-2.5 text-xs">
              <Icon className={`mt-0.5 size-4 shrink-0 ${alert.severity === 'CRIT' ? 'text-[#8e1f33]' : alert.severity === 'WARN' ? 'text-[#a4780f]' : 'text-[#1f6fa8]'}`} aria-label={label} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{alert.rule}</p>
                <p className="text-muted"><button type="button" onClick={() => onNavigate(`tracking/${encodeURIComponent(alert.content)}`)} className="font-mono font-semibold text-plum hover:underline">{alert.deposit}</button> · {alert.content} · {formatRelative(alert.since)}</p>
                <p className="mt-0.5 text-[11.5px] text-copy">{alert.detail}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chip}`}>{label}</span>
              {canAck && (
                <button type="button" disabled={busy === alert.ruleId + alert.content} onClick={() => acknowledge(alert)} title="Ocultar hasta que haya una muestra nueva" className="widget-no-drag shrink-0 rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-plum hover:bg-plum-soft disabled:opacity-50">Visto</button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AlertsWidgetSettings({ widget, onChange }: WidgetSettingsProps<AlertsWidget>) {
  return (
    <div className="space-y-3">
      <label className="grid gap-1 font-semibold text-muted">Mostrar desde la gravedad
        <select value={widget.minSeverity} onChange={(event) => onChange({ ...widget, minSeverity: event.target.value as AlertSeverity })} className="rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy">
          <option value="INFO">Informativos y superiores</option><option value="WARN">Avisos y críticos</option><option value="CRIT">Solo críticos</option>
        </select>
      </label>
      <p className="flex gap-2 rounded-xl bg-plum-soft p-2 text-[11.5px] text-plum"><BellRing className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Las condiciones se configuran en Administración → Avisos y, para un solo contenido, en su pestaña «Evolución».</p>
    </div>
  )
}
