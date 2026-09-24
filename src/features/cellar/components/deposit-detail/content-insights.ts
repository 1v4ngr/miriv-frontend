import { useEffect, useState } from 'react'
import { trackingApi, type LatestContent, type LatestReading, type SeriesResponse, type Status, type TrackingAlert, type TrackingEvent } from '../../../tracking/services/tracking-api'
import { evaluateStatus } from '../../../tracking/utils'
import { contentApi } from '../../services/content-api'
import type { Occupation } from '../../types'
import type { Sample } from '../../../laboratory/types'
import { reportsApi, type CurrentPhase, type ReportPhase } from '../../../reports/services/reports-api'
import { panelsApi, type PanelView } from '../../../laboratory/services/panels-api'

/** Built-in fallback when no configured phase (Administración › Analítica › Fases de elaboración) matches the content. */
export type Phase = 'AF' | 'FML' | 'WINE'

const RUNNING = new Set(['NOT_STARTED', 'ACTIVE', 'SLOW', 'SUSPECTED_STOP'])

/**
 * Where the content is in its elaboration, which decides what an enologist wants to see first:
 * the alcoholic fermentation (a must, or a running AF), the malolactic, or a finished wine.
 */
export function phaseOf(occupation: Occupation): Phase {
  if ((occupation.category ?? '').toLocaleLowerCase('es') === 'mosto' || RUNNING.has(occupation.alcoholicState)) return 'AF'
  if (RUNNING.has(occupation.malolacticState) && occupation.malolacticState !== 'NOT_STARTED') return 'FML'
  return 'WINE'
}

export const phaseLabel: Record<Phase, string> = { AF: 'Fermentación alcohólica', FML: 'Fermentación maloláctica', WINE: 'Vino terminado' }

/** Parameters that tell the state of the tank in each phase, most telling first. The chart shows the first two. */
const KEY_PARAMETERS: Record<Phase, string[]> = {
  AF: ['DENSITY', 'CONTENT_TEMPERATURE', 'REDUCING_SUGARS', 'GLUCOSE_FRUCTOSE', 'VOLATILE_ACIDITY', 'PH', 'TOTAL_ACIDITY'],
  FML: ['MALIC_ACID', 'L_LACTIC_ACID', 'VOLATILE_ACIDITY', 'PH', 'CONTENT_TEMPERATURE', 'FREE_SO2'],
  WINE: ['VOLATILE_ACIDITY', 'FREE_SO2', 'PH', 'ETHANOL', 'TOTAL_ACIDITY', 'REDUCING_SUGARS'],
}
/** Used to fill the readings grid when the phase parameters have no data. */
const FALLBACK = ['VOLATILE_ACIDITY', 'DENSITY', 'CONTENT_TEMPERATURE', 'PH', 'MALIC_ACID', 'FREE_SO2', 'ETHANOL', 'TOTAL_ACIDITY', 'REDUCING_SUGARS']
const READINGS_SHOWN = 6

export interface KeyReading { reading: LatestReading; status: Status; trend: number[] }

export interface ContentInsights {
  loading: boolean
  latest?: LatestContent
  series?: SeriesResponse
  events: TrackingEvent[]
  alerts: TrackingAlert[]
  samples: Sample[]
  /** Configured phase the content is in now (null when none matches), and all phases in evaluation order. */
  phase: ReportPhase | null
  current: CurrentPhase | null
  phases: ReportPhase[]
  /** Analysis templates (panels) and their parameters, to group the readings. */
  panels: PanelView[]
}

/** Everything the deposit detail shows about its current content, loaded in parallel; each part fails soft. */
export function useContentInsights(contentCode: string | undefined, since: string | undefined, version: number): ContentInsights {
  const [state, setState] = useState<ContentInsights>({ loading: Boolean(contentCode), events: [], alerts: [], samples: [], phase: null, current: null, phases: [], panels: [] })

  useEffect(() => {
    if (!contentCode) { setState({ loading: false, events: [], alerts: [], samples: [], phase: null, current: null, phases: [], panels: [] }); return }
    let active = true
    setState((current) => ({ ...current, loading: true }))
    const soft = <T,>(promise: Promise<T>, fallback: T) => promise.catch(() => fallback)
    void (async () => {
      const [latestList, events, alerts, content, current, phases, panels] = await Promise.all([
        soft(trackingApi.latest([contentCode]), []),
        soft(trackingApi.events([contentCode], since), []),
        soft(trackingApi.alerts(), []),
        soft(contentApi.getContent(contentCode), undefined),
        soft(reportsApi.currentPhase(contentCode), null),
        soft(reportsApi.phases(), []),
        soft(panelsApi.panels(), []),
      ])
      const latest = latestList[0]
      const parameters = latest?.readings.map((reading) => reading.parameter) ?? []
      const series = parameters.length ? await soft(trackingApi.series({ contents: [contentCode], parameters }), undefined) : undefined
      if (!active) return
      setState({ loading: false, latest, series, events, alerts: alerts.filter((alert) => alert.content === contentCode), samples: content?.samples ?? [], phase: current?.phase ?? null, current, phases: phases.filter((item) => item.active), panels: panels.filter((item) => item.active) })
    })()
    return () => { active = false }
  }, [contentCode, since, version])

  return state
}

/** Parameters that matter now: the ones configured for the content's phase, else the built-in list. */
export function phaseParameters(insights: ContentInsights, occupation: Occupation): string[] {
  return insights.phase?.parameterCodes.length ? insights.phase.parameterCodes : KEY_PARAMETERS[phaseOf(occupation)]
}

/** The readings worth a glance: out-of-range ones first, then the phase's key parameters, then others with data. */
export function keyReadings(insights: ContentInsights, parameters: string[]): KeyReading[] {
  const readings = insights.latest?.readings ?? []
  const targets = insights.latest?.targets ?? []
  const byCode = new Map(readings.map((reading) => [reading.parameter, reading]))
  const order = [...new Set([...parameters, ...FALLBACK])]
  const picked = order.map((code) => byCode.get(code)).filter((reading): reading is LatestReading => Boolean(reading))
  const withStatus = readings.map((reading) => ({ reading, status: evaluateStatus(reading, targets.find((target) => target.parameter === reading.parameter)) }))
  const flagged = withStatus.filter((item) => item.status === 'WARN' || item.status === 'CRIT').sort((a, b) => (a.status === 'CRIT' ? -1 : 0) - (b.status === 'CRIT' ? -1 : 0))
  const chosen = [...flagged.map((item) => item.reading), ...picked].filter((reading, index, all) => all.findIndex((item) => item.parameter === reading.parameter) === index).slice(0, READINGS_SHOWN)
  return chosen.map((reading) => toKeyReading(insights, reading))
}

/** A reading with its target status and the trend of its last readings (optionally only the last `days`). */
export function toKeyReading(insights: ContentInsights, reading: LatestReading, days?: number): KeyReading {
  const since = days === undefined ? 0 : Date.now() - days * 86_400_000
  return {
    reading,
    status: evaluateStatus(reading, insights.latest?.targets.find((target) => target.parameter === reading.parameter)),
    trend: (insights.series?.points ?? [])
      .filter((point) => point.parameter === reading.parameter && point.qualifier === 'NONE' && point.value !== null && new Date(point.takenAt).getTime() >= since)
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
      .slice(-10)
      .map((point) => point.value as number),
  }
}

export interface TemplateGroup { code: string; name: string; readings: KeyReading[]; lastDays: number }

/**
 * Every parameter analysed in the last `days`, grouped by the analysis template it belongs to. A parameter in
 * several templates shows in each; parameters in none go to "Otros". Most recently analysed templates first.
 */
export function readingsByTemplate(insights: ContentInsights, days = 30): TemplateGroup[] {
  const recent = (insights.latest?.readings ?? []).filter((reading) => reading.daysAgo <= days)
  const grouped: TemplateGroup[] = insights.panels.map((panel) => {
    const readings = panel.parameters.map((parameter) => recent.find((reading) => reading.parameter === parameter.code)).filter((reading): reading is LatestReading => Boolean(reading))
    return { code: panel.code, name: panel.name, readings: readings.map((reading) => toKeyReading(insights, reading, days)), lastDays: Math.min(...readings.map((reading) => reading.daysAgo)) }
  }).filter((group) => group.readings.length > 0)
  const inPanels = new Set(insights.panels.flatMap((panel) => panel.parameters.map((parameter) => parameter.code)))
  const others = recent.filter((reading) => !inPanels.has(reading.parameter))
  if (others.length) grouped.push({ code: '__others__', name: 'Otros', readings: others.map((reading) => toKeyReading(insights, reading, days)), lastDays: Math.min(...others.map((reading) => reading.daysAgo)) })
  return grouped.sort((a, b) => (a.code === '__others__' ? 1 : b.code === '__others__' ? -1 : a.lastDays - b.lastDays || a.name.localeCompare(b.name, 'es')))
}

/** Parameters drawn by default: the first two of the phase that have at least two points, else any two that do. */
export function defaultChartParameters(insights: ContentInsights, parameters: string[]): string[] {
  const counts = new Map<string, number>()
  for (const point of insights.series?.points ?? []) if (point.value !== null) counts.set(point.parameter, (counts.get(point.parameter) ?? 0) + 1)
  const plottable = (code: string) => (counts.get(code) ?? 0) >= 2
  const phaseFirst = parameters.filter(plottable).slice(0, 2)
  if (phaseFirst.length) return phaseFirst
  return [...counts.keys()].filter(plottable).slice(0, 2)
}

/** Worst state among the latest readings, for the header. */
export function overallStatus(readings: KeyReading[], allReadings: LatestContent | undefined): 'OK' | 'WARN' | 'CRIT' | 'NONE' {
  const statuses = (allReadings?.readings ?? []).map((reading) => evaluateStatus(reading, allReadings?.targets.find((target) => target.parameter === reading.parameter)))
  const all = [...statuses, ...readings.map((item) => item.status)]
  if (all.includes('CRIT')) return 'CRIT'
  if (all.includes('WARN')) return 'WARN'
  if (all.includes('OK')) return 'OK'
  return 'NONE'
}
