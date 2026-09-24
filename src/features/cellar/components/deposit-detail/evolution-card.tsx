import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Check, Plus, Search, X } from 'lucide-react'
import { SeriesChart, type ChartSeries } from '../../../tracking/components/series-chart'
import { buildChartSeries } from '../../../tracking/build-chart-series'
import type { ParameterInfo, SeriesResponse, TrackingEvent } from '../../../tracking/services/tracking-api'

const COLORS = ['#7b1e3a', '#2e7d9a', '#c0782a']
const MAX_SELECTED = 3

/** Curves of the current content (the shared tracking chart), with the phase's key parameters preselected. */
export function EvolutionCard({ series, events, defaults, recommended = [], onOpenTracking }: { series?: SeriesResponse; events: TrackingEvent[]; defaults: string[]; recommended?: string[]; onOpenTracking?: () => void }) {
  const [selected, setSelected] = useState<string[]>(defaults)
  useEffect(() => setSelected(defaults), [defaults.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const available = useMemo(() => (series?.parameters ?? []).filter((parameter) => (series?.points ?? []).filter((point) => point.parameter === parameter.code && point.value !== null).length >= 2), [series])
  const chartSeries = useMemo<ChartSeries[]>(() => (series ? buildChartSeries(series) : [])
    .filter((item) => selected.includes(item.parameter.code))
    .map((item) => ({ ...item, color: COLORS[selected.indexOf(item.parameter.code) % COLORS.length] })), [series, selected])

  const toggle = (code: string) => setSelected((current) => current.includes(code) ? current.filter((item) => item !== code) : current.length >= MAX_SELECTED ? [...current.slice(1), code] : [...current, code])

  return (
    <section className="min-w-0 rounded-[18px] border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Evolución</h2>
        {onOpenTracking && <button type="button" onClick={onOpenTracking} className="flex items-center gap-1 text-[11.5px] font-semibold text-plum hover:underline">Abrir en Seguimiento<ArrowUpRight className="size-3.5" /></button>}
      </div>
      {available.length === 0 ? <p className="mt-3 rounded-xl bg-[#fdfbfc] p-6 text-center text-[12px] text-muted">Hacen falta al menos dos análisis para dibujar la evolución.</p> : <>
        {/* Only the drawn parameters show, as removable chips; the rest are one tap away in a searchable list. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Parámetros de la gráfica">
          {selected.map((code, index) => {
            const parameter = available.find((item) => item.code === code)
            if (!parameter) return null
            return <span key={code} className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-[#f7f1f4] pl-2 pr-0.5 text-[11px] font-medium text-ink"><span className="size-2 rounded-full" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />{parameter.name}<button type="button" onClick={() => toggle(code)} aria-label={`Quitar ${parameter.name}`} className="rounded-md p-0.5 text-muted hover:bg-white hover:text-plum"><X className="size-3" /></button></span>
          })}
          <ParameterPicker available={available} selected={selected} recommended={recommended} onToggle={toggle} full={selected.length >= MAX_SELECTED} />
        </div>
        {chartSeries.length ? <div className="mt-2"><SeriesChart series={chartSeries} axis="date" events={events} showTargets showRate={false} height={280} label="Evolución de los parámetros del contenido" /></div> : <p className="mt-3 rounded-xl bg-[#fdfbfc] p-6 text-center text-[12px] text-muted">Elige un parámetro para ver su evolución.</p>}
      </>}
    </section>
  )
}

function ParameterPicker({ available, selected, recommended, onToggle, full }: { available: ParameterInfo[]; selected: string[]; recommended: string[]; onToggle: (code: string) => void; full: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const term = query.trim().toLocaleLowerCase('es')
  const matches = available.filter((item) => item.name.toLocaleLowerCase('es').includes(term))
  const groups = [
    { title: 'De esta fase', items: matches.filter((item) => recommended.includes(item.code)).sort((a, b) => recommended.indexOf(a.code) - recommended.indexOf(b.code)) },
    { title: 'Otros', items: matches.filter((item) => !recommended.includes(item.code)).sort((a, b) => a.name.localeCompare(b.name, 'es')) },
  ].filter((group) => group.items.length)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => { setOpen(!open); setQuery('') }} aria-haspopup="dialog" aria-expanded={open} className="flex h-7 items-center gap-1 rounded-lg border border-dashed border-[#d6c8cf] px-2 text-[11px] font-medium text-muted transition-colors hover:border-[#b9899c] hover:text-plum"><Plus className="size-3" aria-hidden="true" />Parámetro</button>
      {open && <>
        {/* Phones: a bottom sheet over a dim backdrop. From sm up: a popover under the button. */}
        <div className="fixed inset-0 z-40 bg-[#2e262a]/30 sm:hidden" aria-hidden="true" onMouseDown={() => setOpen(false)} />
        <div role="dialog" aria-label="Elegir parámetros" className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-[22px] bg-white px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_rgba(46,38,42,0.18)] sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:z-30 sm:mt-2 sm:max-h-none sm:w-[280px] sm:rounded-2xl sm:border sm:border-border sm:p-1.5 sm:shadow-[0_12px_32px_rgba(46,38,42,0.14)]">
          <div className="sm:hidden">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#cdc2c8]" aria-hidden="true" />
            <div className="mb-2 flex items-center justify-between px-1"><span className="text-[15px] font-semibold">Parámetros</span><button type="button" onClick={() => setOpen(false)} className="h-8 rounded-lg px-3 text-[13px] font-semibold text-plum">Hecho</button></div>
          </div>
          <label className="mb-1 flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#f7f1f4] px-2.5 sm:h-8 sm:rounded-lg sm:px-2">
            <Search className="size-4 shrink-0 text-muted sm:size-3.5" aria-hidden="true" />
            <input ref={(element) => { if (element && window.matchMedia('(min-width: 640px)').matches) element.focus() }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar parámetro" aria-label="Buscar parámetro" className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#9a8b92]" />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:max-h-64">
            {groups.map((group) => (
              <div key={group.title} className="py-1">
                <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">{group.title}</p>
                {group.items.map((item) => {
                  const on = selected.includes(item.code)
                  return <button key={item.code} type="button" onClick={() => onToggle(item.code)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-[13px] text-ink hover:bg-[#f7f1f4] sm:gap-2 sm:py-1.5 sm:text-[12px]"><span className={`flex size-5 shrink-0 items-center justify-center rounded border sm:size-4 ${on ? 'border-plum bg-plum text-white' : 'border-[#d6c8cf]'}`}>{on && <Check className="size-3" />}</span><span className="min-w-0 flex-1 truncate">{item.name}</span>{item.unit && <span className="max-w-[40%] shrink-0 truncate text-[10.5px] text-muted">{item.unit}</span>}</button>
                })}
              </div>
            ))}
            {groups.length === 0 && <p className="px-2 py-3 text-center text-[11.5px] text-muted">Sin resultados.</p>}
          </div>
          {full && <p className="shrink-0 border-t border-border px-2 pb-1 pt-2 text-[10.5px] text-muted">Máximo {MAX_SELECTED} a la vez: al añadir otro se quita el primero.</p>}
        </div>
      </>}
    </div>
  )
}
