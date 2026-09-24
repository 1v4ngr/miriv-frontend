import type { AssistantView } from '../assistant/view-context'
import { formatReading, formatAge } from '../tracking/utils'
import type { ReportPhase } from '../reports/services/reports-api'
import { keyReadings, overallStatus, phaseLabel, phaseOf, phaseParameters, readingsByTemplate, type ContentInsights } from './components/deposit-detail/content-insights'
import { daysSince, lastSampleOf } from './last-analysis'
import type { Deposit } from './types'
import { activeOccupation, statusLabel } from './utils'

const STATUS_WORDS = { OK: 'en rango', WARN: 'aviso', CRIT: 'crítico', UNKNOWN: 'no concluyente', NONE: 'sin objetivo' } as const
const lastAnalysis = (deposit: Deposit) => {
  const last = lastSampleOf(deposit)
  return last === undefined ? null : last === null ? 'nunca analizado' : `${last.slice(0, 10)} (hace ${daysSince(last)} d)`
}

/** The deposit detail screen, as the assistant should see it: exactly what the page shows, in its words. */
export function depositDetailView(deposit: Deposit, insights: ContentInsights): AssistantView {
  const occupation = activeOccupation(deposit)
  const fill = occupation ? Math.round(occupation.volumeLiters / deposit.capacityLiters * 100) : 0
  const readings = occupation ? keyReadings(insights, phaseParameters(insights, occupation)) : []
  const reading = (item: (typeof readings)[number]) => ({
    parametro: item.reading.name,
    valor: `${formatReading(item.reading.value, item.reading.qualifier, item.reading.limit, item.reading.decimals)} ${item.reading.unit ?? ''}`.trim(),
    estado: STATUS_WORDS[item.status],
    medido: formatAge(item.reading.daysAgo),
    tendencia: item.trend.length > 1 ? (item.trend.at(-1)! > item.trend[0] ? 'sube' : item.trend.at(-1)! < item.trend[0] ? 'baja' : 'estable') : 'sin serie',
  })
  const phase = insights.current?.phase
  return {
    screen: 'deposit-detail',
    title: `Depósito ${deposit.code}`,
    data: {
      deposito: { codigo: deposit.code, zona: deposit.zone, posicion: deposit.position || null, material: deposit.material, capacidadUtilL: deposit.capacityLiters, refrigerado: deposit.refrigerated, estado: statusLabel(deposit) },
      contenido: occupation ? { codigo: occupation.contentCode, lote: occupation.lotCode, tipo: occupation.category, volumenL: occupation.volumeLiters, llenado: `${fill} %`, desde: occupation.entryDate.slice(0, 10), ultimoAnalisis: lastAnalysis(deposit) } : null,
      fase: occupation ? { nombre: phase?.name ?? phaseLabel[phaseOf(occupation)], fijadaAMano: Boolean(insights.current?.manual), automatica: insights.current?.automatic?.name ?? null } : null,
      estadoAnalitico: occupation && !insights.loading ? STATUS_WORDS[overallStatus(readings, insights.latest)] : null,
      lecturasClave: readings.map(reading),
      todasLasLecturas30Dias: occupation ? readingsByTemplate(insights, 30).map((group) => ({ plantilla: group.name, lecturas: group.readings.map(reading) })) : [],
      muestrasAbiertas: insights.samples.filter((sample) => sample.status !== 'Validado' && sample.status !== 'Invalidado').map((sample) => ({ codigo: sample.code, estado: sample.status, tomada: sample.takenDate })),
      alertas: insights.alerts.map((alert) => ({ regla: alert.rule, gravedad: alert.severity, detalle: alert.detail, desde: alert.since })),
      actividadReciente: insights.events.slice(-6).reverse().map((event) => `${event.at.slice(0, 10)} · ${event.label}${event.detail ? ` (${event.detail})` : ''}`),
      ocupacionesAnteriores: deposit.occupations.filter((item) => item !== occupation).length,
    },
    suggestions: occupation
      ? ['¿Cómo ves este depósito?', '¿Qué debería medir ahora?', '¿Cómo evoluciona respecto a la semana pasada?']
      : ['¿Qué hace falta para usar este depósito?', '¿Qué contenido podría ir aquí?'],
  }
}

/** The deposits list as the assistant should see it: the active filters and the rows on screen. */
export function depositsListView(input: { rows: Deposit[]; total: number; filters: string[]; sort: string; phaseOf: (deposit: Deposit) => ReportPhase | null | undefined }): AssistantView {
  return {
    screen: 'deposits-list',
    title: input.filters.length ? `Depósitos filtrados (${input.rows.length} de ${input.total})` : `Depósitos (${input.total})`,
    data: {
      filtrosActivos: input.filters,
      orden: input.sort,
      mostrados: input.rows.length,
      total: input.total,
      filas: input.rows.slice(0, 60).map((deposit) => {
        const occupation = activeOccupation(deposit)
        return {
          deposito: deposit.code, zona: deposit.zone, estado: statusLabel(deposit),
          contenido: occupation ? `${occupation.category ?? 'sin tipo'} · ${occupation.lotCode}` : 'vacío',
          llenado: occupation ? `${Math.round(occupation.volumeLiters / deposit.capacityLiters * 100)} %` : '0 %',
          fase: input.phaseOf(deposit)?.name ?? null,
          ultimoAnalisis: lastAnalysis(deposit),
        }
      }),
      filasOmitidas: Math.max(0, input.rows.length - 60),
    },
    suggestions: ['¿Cuáles de estos necesitan atención?', '¿Cuáles llevan más días sin analizar?', 'Resúmeme el estado de estos depósitos'],
  }
}
