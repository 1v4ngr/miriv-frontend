import { useEffect, useState } from 'react'
import { BellRing, FlaskConical, LineChart, Pin, Plus } from 'lucide-react'
import { panelsApi, type PanelView, type ParameterView } from '../../../laboratory/services/panels-api'
import { trackingApi, type AlertRule, type TargetView } from '../../../tracking/services/tracking-api'

interface AnaliticaOverviewProps {
  canTargets: boolean
  canAlerts: boolean
  onNavigate: (tab: 'parameters' | 'templates' | 'targets' | 'rules') => void
  onNewParameter: () => void
  onNewTemplate: () => void
}

interface Counts {
  parameters: { total: number; active: number } | undefined
  templates: { total: number; active: number } | undefined
  targets: number | undefined
  rules: { total: number; active: number; inactive: number } | undefined
  loading: boolean
  error: string
}

/** Loads counts in parallel and exposes four clickable summary cards. */
function useCounts(): Counts {
  const [state, setState] = useState<Counts>({
    parameters: undefined, templates: undefined, targets: undefined, rules: undefined,
    loading: true, error: '',
  })

  useEffect(() => {
    let active = true
    Promise.all([
      panelsApi.parameters().catch(() => []),
      panelsApi.panels().catch(() => []),
      trackingApi.listTargets().catch(() => []),
      trackingApi.alertRules().catch(() => []),
    ]).then(([parameters, panels, targets, rules]) => {
      if (!active) return
      setState({
        parameters: { total: parameters.length, active: parameters.filter((p) => p.active).length },
        templates: { total: panels.length, active: panels.filter((p) => p.active).length },
        targets: targets.length,
        rules: {
          total: rules.length,
          active: rules.filter((r) => r.active).length,
          inactive: rules.filter((r) => !r.active).length,
        },
        loading: false,
        error: '',
      })
    }).catch(() => {
      if (active) setState((prev) => ({ ...prev, loading: false, error: 'No se han podido cargar los contadores.' }))
    })
    return () => { active = false }
  }, [])

  return state
}

const card = 'rounded-2xl border border-border bg-white p-4'

/** "Resumen" tab of the Analítica section. Four counters plus quick links. */
export function AnaliticaOverview({ canTargets, canAlerts, onNavigate, onNewParameter, onNewTemplate }: AnaliticaOverviewProps) {
  const counts = useCounts()

  return (
    <section className={card}>
      <header>
        <h2 className="text-sm font-semibold">Configuración analítica</h2>
        <p className="mt-1 text-xs text-muted">
          Define primero los parámetros, después qué se mide en cada tipo de contenido (plantillas),
          luego los rangos esperados (objetivos) y por último las reglas que disparan avisos automáticos.
        </p>
      </header>

      {counts.error && (
        <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{counts.error}</p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {canTargets && (
          <CounterCard
            icon={<FlaskConical className="size-4 text-plum" aria-hidden="true" />}
            label="Parámetros"
            value={counts.parameters ? `${counts.parameters.active} / ${counts.parameters.total}` : '—'}
            hint={counts.parameters ? `${counts.parameters.total - counts.parameters.active} inactivos` : 'Cargando…'}
            onClick={() => onNavigate('parameters')}
          />
        )}
        {canTargets && (
          <CounterCard
            icon={<LineChart className="size-4 text-plum" aria-hidden="true" />}
            label="Plantillas"
            value={counts.templates ? `${counts.templates.active} / ${counts.templates.total}` : '—'}
            hint={counts.templates ? `${counts.templates.total - counts.templates.active} inactivas` : 'Cargando…'}
            onClick={() => onNavigate('templates')}
          />
        )}
        {canTargets && (
          <CounterCard
            icon={<Pin className="size-4 text-plum" aria-hidden="true" />}
            label="Objetivos definidos"
            value={counts.targets === undefined ? '—' : String(counts.targets)}
            hint={counts.targets === undefined ? 'Cargando…' : 'Aviso / crítico por parámetro'}
            onClick={() => onNavigate('targets')}
          />
        )}
        {canAlerts && (
          <CounterCard
            icon={<BellRing className="size-4 text-plum" aria-hidden="true" />}
            label="Avisos"
            value={counts.rules ? `${counts.rules.active} / ${counts.rules.total}` : '—'}
            hint={counts.rules && counts.rules.inactive > 0 ? `${counts.rules.inactive} desactivados` : 'Todos activos'}
            onClick={() => onNavigate('rules')}
          />
        )}
      </div>

      {canTargets && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <button type="button" onClick={onNewParameter}
            className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white">
            <Plus className="size-3.5" />Nuevo parámetro
          </button>
          <button type="button" onClick={onNewTemplate}
            className="flex min-h-9 items-center gap-1 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-plum">
            <Plus className="size-3.5" />Nueva plantilla
          </button>
        </div>
      )}
    </section>
  )
}

function CounterCard({ icon, label, value, hint, onClick }: {
  icon: React.ReactNode; label: string; value: string; hint: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-[#fdfbfc] p-4 text-left transition hover:border-plum">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {icon}{label}
      </span>
      <span className="font-mono text-2xl font-semibold leading-none">{value}</span>
      <span className="text-[11px] text-muted">{hint}</span>
    </button>
  )
}

export type { PanelView, ParameterView, AlertRule, TargetView }
