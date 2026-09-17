import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BellOff, Search } from 'lucide-react'
import { incidentsApi } from '../services/incidents-api'
import type { Incident } from '../types'

interface Props { onOpen: (id: string) => void }
type Filter = 'active' | 'monitoring' | 'closed'

const labels: Record<Filter, string> = { active: 'Activas', monitoring: 'En seguimiento', closed: 'Cerradas' }
const priorityClass: Record<Incident['priority'], string> = { Crítica: 'bg-[#f7dadf] text-[#8e1f33]', Alta: 'bg-[#fae3d3] text-[#8a4715]', Media: 'bg-[#f5eed0] text-[#6b5a10]' }

export function IncidentsInboxPage({ onOpen }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { incidentsApi.getAll().then(setIncidents).finally(() => setLoading(false)) }, [])
  const counts = useMemo(() => ({ active: incidents.filter((item) => item.status === 'active').length, monitoring: incidents.filter((item) => item.status === 'monitoring').length, closed: incidents.filter((item) => item.status === 'closed').length }), [incidents])
  const visible = useMemo(() => incidents.filter((item) => item.status === filter && `${item.id} ${item.title} ${item.depositCode} ${item.contentCode} ${item.lotCode}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es').trim())), [filter, incidents, search])
  if (loading) return <p className="p-6 text-center text-xs text-muted">Cargando incidencias…</p>
  return <div className="mx-auto max-w-6xl space-y-4 pb-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] text-muted">Incidencias · Centro Norte</p><h1 className="mt-1 text-[23px] font-semibold">Incidencias</h1><p className="mt-1 text-xs text-muted">Episodios detectados, no evaluaciones aisladas. Silenciar no los oculta.</p></div><label className="flex h-10 min-w-[230px] items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs text-muted"><Search className="size-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar incidencia o depósito" className="min-w-0 flex-1 bg-transparent outline-none" /></label></header>
    <div className="flex overflow-x-auto border-b border-border" role="tablist" aria-label="Estado de incidencias">{(Object.keys(labels) as Filter[]).map((item) => <button key={item} type="button" role="tab" aria-selected={filter === item} onClick={() => setFilter(item)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold ${filter === item ? 'border-plum text-plum' : 'border-transparent text-muted'}`}>{labels[item]} <span className="font-mono">{counts[item]}</span></button>)}</div>
    <section className="overflow-hidden rounded-2xl border border-border bg-white"><div className="hidden grid-cols-[100px_minmax(210px,1.5fr)_125px_150px_130px_130px_34px] gap-3 border-b border-border bg-field px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted lg:grid"><span>Prioridad</span><span>Condición detectada</span><span>Depósito</span><span>Última evidencia</span><span>Apertura</span><span>Responsable</span><span /></div>{visible.map((incident) => <button key={incident.id} onClick={() => onOpen(incident.id)} className="grid w-full gap-2 border-b border-border p-4 text-left last:border-0 hover:bg-plum-soft lg:grid-cols-[100px_minmax(210px,1.5fr)_125px_150px_130px_130px_34px] lg:items-center lg:gap-3"><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${priorityClass[incident.priority]}`}>{incident.priority}</span><span><span className="block text-xs font-semibold">{incident.title}</span><span className="mt-1 block font-mono text-[10.5px] text-muted">{incident.id} · {incident.contentCode} · {incident.lotCode}</span></span><span className="font-mono text-xs">{incident.depositCode}</span><span className="text-xs text-copy">{incident.lastEvidence}</span><span className="text-xs text-muted">{incident.openedAgo}</span><span className="text-xs text-copy">{incident.responsible ?? 'Sin asignar'}{incident.silencedUntil && <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#e3e3ef] px-1.5 py-0.5 text-[9px] text-[#43435c]"><BellOff className="size-2.5" />Silenciada</span>}</span><ArrowRight className="hidden size-4 text-plum lg:block" /></button>)}{visible.length === 0 && <p className="p-8 text-center text-xs text-muted">No hay incidencias en este estado que coincidan con la búsqueda.</p>}</section>
  </div>
}
