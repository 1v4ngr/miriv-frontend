import { formatReading, formatAge, statusLabel } from '../../../tracking/utils'
import type { Status } from '../../../tracking/services/tracking-api'
import { Sparkline } from './sparkline'
import { ChevronDown } from 'lucide-react'
import type { KeyReading, TemplateGroup } from './content-insights'

const TONE: Record<Status, { value: string; line: string; chip: string }> = {
  OK: { value: 'text-ink', line: '#4d8b4f', chip: 'bg-[#e6f1e9] text-[#1f5c3a]' },
  WARN: { value: 'text-[#8a6412]', line: '#c0902a', chip: 'bg-[#f8ecc9] text-[#6b5a10]' },
  CRIT: { value: 'text-[#9b1f36]', line: '#b3263f', chip: 'bg-[#f7dadf] text-[#8e1f33]' },
  UNKNOWN: { value: 'text-ink', line: '#8a7a9c', chip: 'bg-[#eee9f4] text-[#5b4a72]' },
  NONE: { value: 'text-ink', line: '#6d4656', chip: '' },
}

/**
 * The last tile stretches over whatever its row leaves empty, so an odd count never leaves a blank cell:
 * 2 columns on phones, 3 from sm up.
 */
function span(index: number, count: number): string {
  if (index !== count - 1) return ''
  const phone = count % 2 === 1 ? 'col-span-2' : ''
  const rest = count % 3
  const wide = rest === 1 ? 'sm:col-span-3' : rest === 2 ? 'sm:col-span-2' : phone ? 'sm:col-span-1' : ''
  return `${phone} ${wide}`
}

/** Latest value of the parameters that matter now, with a sparkline of their last readings and their target status. */
export function KeyReadings({ readings }: { readings: KeyReading[] }) {
  if (readings.length === 0) return <p className="rounded-xl bg-white p-4 text-[12px] text-muted">Todavía no hay análisis de este contenido.</p>
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
      {readings.map(({ reading, status, trend }, index) => {
        const tone = TONE[status]
        return (
          <div key={reading.parameter} className={`min-w-0 bg-white p-3 ${span(index, readings.length)}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="truncate text-[11px] text-muted" title={reading.name}>{reading.name}</span>
              {(status === 'WARN' || status === 'CRIT') && <span className={`shrink-0 rounded-full px-1.5 text-[9.5px] font-semibold leading-4 ${tone.chip}`}>{statusLabel[status]}</span>}
            </div>
            <div className={`mt-0.5 font-mono text-[17px] font-medium ${tone.value}`}>{formatReading(reading.value, reading.qualifier, reading.limit, reading.decimals)}<span className="ml-1 font-sans text-[11px] font-normal text-muted">{reading.unit ?? ''}</span></div>
            <Sparkline values={trend} color={tone.line} label={`Tendencia de ${reading.name}`} />
            <div className="text-[10px] text-muted">{formatAge(reading.daysAgo)}{reading.validated ? '' : ' · sin validar'}</div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Everything analysed recently, one folded section per analysis template: name, how many parameters and when
 * it was last analysed, and the same tiles as the key readings when opened. Out-of-range counts show folded.
 */
export function TemplateReadings({ groups, days }: { groups: TemplateGroup[]; days: number }) {
  if (groups.length === 0) return null
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-[12px] font-semibold text-copy">Todos los análisis <span className="font-normal text-muted">· últimos {days} días</span></h3>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {groups.map((group) => {
          const flagged = group.readings.filter((item) => item.status === 'WARN' || item.status === 'CRIT')
          const critical = flagged.some((item) => item.status === 'CRIT')
          return (
            <details key={group.code} className="group/template bg-white [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#fdfbfc]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">{group.name}</span>
                  <span className="block text-[10.5px] text-muted">{group.readings.length} parámetro{group.readings.length === 1 ? '' : 's'} · {formatAge(group.lastDays)}</span>
                </span>
                {flagged.length > 0 && <span className={`shrink-0 rounded-full px-1.5 text-[9.5px] font-semibold leading-4 ${critical ? TONE.CRIT.chip : TONE.WARN.chip}`}>{flagged.length} fuera de rango</span>}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open/template:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-border bg-[#fdfbfc] p-2.5"><KeyReadings readings={group.readings} /></div>
            </details>
          )
        })}
      </div>
    </div>
  )
}
