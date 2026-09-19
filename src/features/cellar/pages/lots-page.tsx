import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Plus, RotateCcw, X } from 'lucide-react'
import { cellarApi } from '../services/cellar-api'
import { catalogApi, type CatalogItem } from '../../../services/catalog-api'
import { profileApi, type CenterMember } from '../../../services/profile-api'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { currentYearInCenter } from '../../../lib/format'
import type { Deposit, Lot, NewEntry, NewLot } from '../types'
import { activeOccupation, formatLiters } from '../utils'

interface LotsPageProps {
  search: string
  onOpenLot: (code: string) => void
  openFormForDeposit?: string
}

interface OriginLine { source: string; reference: string; percentage: string }

const today = new Date().toISOString().slice(0, 10)

function initialsFrom(value: string): string {
  const cleaned = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return (cleaned.slice(0, 3) || 'LOT')
}

function deriveLotCode(category: string, campaign: number, existing: Lot[]): string {
  const cat = initialsFrom(category || '')
  const pattern = new RegExp(`^${cat}-${campaign}-(\\d{3,})$`)
  const used = existing
    .map((lot) => lot.code.match(pattern)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => Number.parseInt(n, 10))
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `${cat}-${campaign}-${String(next).padStart(3, '0')}`
}

function LotForm({ deposits, existingLots, defaultResponsibleUsername, initialDeposit, onClose, onCreated }: { deposits: Deposit[]; existingLots: Lot[]; defaultResponsibleUsername: string; initialDeposit?: string; onClose: () => void; onCreated: (lot: Lot) => void }) {
  const initialCategory = ''
  const initialCampaign = new Date().getFullYear()
  const [step, setStep] = useState(1)
  const [lot, setLot] = useState<NewLot>({
    code: deriveLotCode(initialCategory, initialCampaign, existingLots),
    campaign: initialCampaign,
    entryDate: today,
    category: initialCategory,
    destination: '',
    responsible: defaultResponsibleUsername,
    origin: '',
    varieties: [],
  })
  const [codeManual, setCodeManual] = useState(false)
  const [entry, setEntry] = useState<NewEntry>({ depositCode: '', volumeLiters: 0, effectiveDate: today })
  const [origins, setOrigins] = useState<OriginLine[]>([{ source: '', reference: '', percentage: '' }])
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [destinations, setDestinations] = useState<CatalogItem[]>([])
  const [varieties, setVarieties] = useState<CatalogItem[]>([])
  const [centerMembers, setCenterMembers] = useState<CenterMember[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    catalogApi.getInternalCategories().then((items) => { setCategories(items); setLot((current) => (current.category ? current : { ...current, category: items[0]?.name ?? '' })) }).catch(() => undefined)
    catalogApi.getDestinations().then((items) => { setDestinations(items); setLot((current) => (current.destination ? current : { ...current, destination: items[0]?.name ?? '' })) }).catch(() => undefined)
    catalogApi.getVarieties().then(setVarieties).catch(() => undefined)
    profileApi.listCenterMembers().then((items) => {
      setCenterMembers(items)
      setLot((current) => {
        if (current.responsible && items.some((member) => member.username === current.responsible)) return current
        // Fallback chain: prefer the explicit default (current user), else any member
        // whose username matches the default, else the first available member.
        // Without this last branch, if the profile hook hasn't resolved by the
        // time the form opens, defaultResponsibleUsername is '' and the select
        // visually shows the first member but the React state stays empty,
        // making the validation fail silently.
        const fallback = items.find((member) => member.username === defaultResponsibleUsername) ?? items[0]
        return fallback ? { ...current, responsible: fallback.username } : current
      })
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (codeManual) return
    setLot((current) => ({ ...current, code: deriveLotCode(current.category, current.campaign, existingLots) }))
  }, [lot.category, lot.campaign, codeManual, existingLots])

  useEffect(() => {
    if (!initialDeposit || entry.depositCode === initialDeposit) return
    setEntry((current) => (current.depositCode ? current : { ...current, depositCode: initialDeposit }))
  }, [initialDeposit, entry.depositCode])

  const [saving, setSaving] = useState(false)
  const selectedDeposit = deposits.find((deposit) => deposit.code === entry.depositCode)
  const availableDeposits = deposits.filter((deposit) => deposit.status === 'available')

  const handleNext = () => {
    if (step === 1 && (!lot.code.trim() || !lot.campaign || !lot.entryDate || !lot.category || !lot.destination || !lot.responsible.trim())) {
      // The DOM can show a value while React state is still empty (e.g. catalogs
      // hadn't loaded when the form opened). Refusing here with a generic
      // message helps nobody — surface which field is actually missing.
      const missing = [
        !lot.code.trim() && 'código',
        !lot.campaign && 'campaña',
        !lot.entryDate && 'fecha de entrada',
        !lot.category && 'categoría',
        !lot.destination && 'destino',
        !lot.responsible.trim() && 'responsable',
      ].filter(Boolean)
      setError(`Faltan campos obligatorios: ${missing.join(', ')}. Espera a que carguen los catálogos y vuelve a pulsar Continuar.`)
      return
    }
    if (step === 1) {
      const known = origins.filter((item) => item.percentage.trim() !== '')
      if (known.length === origins.length && known.length > 0 && known.reduce((sum, item) => sum + Number(item.percentage), 0) !== 100) { setError('Si indicas todos los porcentajes, deben sumar 100 %.'); return }
    }
    setError('')
    setStep(Math.min(3, step + 1))
  }

  const handleSave = async (withEntry: boolean) => {
    if (withEntry && (!entry.depositCode || !entry.volumeLiters || entry.volumeLiters <= 0)) {
      setError('Selecciona un depósito y un volumen mayor que 0.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const origin = origins.filter((item) => item.source.trim()).map((item) => [item.source.trim(), item.reference.trim(), item.percentage ? `${item.percentage} %` : ''].filter(Boolean).join(' · ')).join(' / ')
      const created = await cellarApi.createLot({ ...lot, origin }, withEntry ? entry : undefined)
      onCreated(created)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el lote.') } finally { setSaving(false) }
  }

  const fieldClass = 'mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[12.5px] font-normal outline-none focus:border-[#b9899c]'

  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="lot-form-title" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[520px] flex-col bg-[#fdfbfc] shadow-xl"><div className="flex items-start justify-between border-b border-border px-5 py-4 sm:px-6"><div><p className="m-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Paso {step} de 3</p><h2 id="lot-form-title" className="mt-1 text-[20px] font-semibold">Nuevo lote y entrada</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button></div><div className="flex gap-1 border-b border-border px-5 py-3 sm:px-6">{['Lote', 'Entrada', 'Resumen'].map((label, index) => <span key={label} className={`flex-1 rounded-lg px-2 py-1.5 text-center text-[11px] font-semibold ${step === index + 1 ? 'bg-plum text-white' : 'bg-plum-soft text-plum'}`}>{index + 1} · {label}</span>)}</div>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
      {step === 1 && <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className="block text-[11.5px] font-semibold text-copy">Código de lote *<div className="mt-1.5 flex items-stretch gap-2"><input required value={lot.code} onChange={(event) => { setCodeManual(true); setLot({ ...lot, code: event.target.value }) }} className={`${fieldClass} font-mono`} /><button type="button" onClick={() => { setCodeManual(false); setLot((current) => ({ ...current, code: deriveLotCode(current.category, current.campaign, existingLots) })) }} title={codeManual ? 'Volver a autogenerar' : 'Regenerar sugerencia'} className="flex min-h-10 items-center gap-1 rounded-xl border border-border px-2 text-[11px] font-semibold text-plum hover:bg-plum-soft"><RotateCcw className="size-3.5" />Auto</button></div><p className="mt-1 text-[10.5px] leading-4 text-muted">Formato sugerido: 3 letras de la categoría + campaña + correlativo (p. ej. TIN-2026-003). {codeManual ? 'Estás editándolo manualmente.' : 'Editable: cambia a manual al teclear.'}</p></label></div><label className="text-[11.5px] font-semibold text-copy">Campaña *<input required type="number" min="2000" value={lot.campaign} onChange={(event) => setLot({ ...lot, campaign: Number(event.target.value) })} className={fieldClass} /></label><label className="text-[11.5px] font-semibold text-copy">Fecha de entrada *<input required type="date" value={lot.entryDate} onChange={(event) => setLot({ ...lot, entryDate: event.target.value })} className={fieldClass} /></label><label className="text-[11.5px] font-semibold text-copy">Categoría *<select value={lot.category} onChange={(event) => setLot({ ...lot, category: event.target.value })} className={fieldClass}>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11.5px] font-semibold text-copy">Destino *<select value={lot.destination} onChange={(event) => setLot({ ...lot, destination: event.target.value })} className={fieldClass}>{destinations.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label><label className="text-[11.5px] font-semibold text-copy">Responsable *<select required value={lot.responsible} onChange={(event) => setLot({ ...lot, responsible: event.target.value })} className={fieldClass}>{centerMembers.map((member) => <option key={member.username} value={member.username}>{member.displayName || member.username}</option>)}</select></label></div><fieldset className="block"><legend className="text-[11.5px] font-semibold text-copy">Variedad</legend><div className="mt-1.5 grid max-h-44 gap-1 overflow-y-auto rounded-xl border border-border bg-white p-2">{varieties.length === 0 ? <p className="text-[11px] text-muted">Catálogo de variedades vacío.</p> : varieties.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-[12px] hover:bg-field"><input type="checkbox" checked={lot.varieties.includes(item.name)} onChange={(event) => setLot({ ...lot, varieties: event.target.checked ? [...lot.varieties, item.name] : lot.varieties.filter((name) => name !== item.name) })} />{item.name}</label>)}</div></fieldset><details><summary className="cursor-pointer text-[11.5px] font-semibold text-copy">Procedencia detallada</summary><div className="mt-2 space-y-2">{origins.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px]"><input value={item.source} onChange={(event) => setOrigins((current) => current.map((row, i) => i === index ? { ...row, source: event.target.value } : row))} placeholder="Procedencia" className={fieldClass} /><input value={item.reference} onChange={(event) => setOrigins((current) => current.map((row, i) => i === index ? { ...row, reference: event.target.value } : row))} placeholder="Referencia" className={fieldClass} /><input type="number" min="0" max="100" value={item.percentage} onChange={(event) => setOrigins((current) => current.map((row, i) => i === index ? { ...row, percentage: event.target.value } : row))} placeholder="%" className={fieldClass} /></div>)}{origins.length > 1 && <button type="button" onClick={() => setOrigins((current) => current.slice(0, -1))} className="text-[11px] font-semibold text-plum hover:underline">Quitar última fila</button>}<button type="button" onClick={() => setOrigins((current) => [...current, { source: '', reference: '', percentage: '' }])} className="text-[11px] font-semibold text-plum hover:underline">Añadir procedencia</button></div></details></div>}
      {step === 2 && <div className="space-y-4"><div><h3 className="text-[14px] font-semibold">Entrada en depósito</h3><p className="mt-1 text-[11.5px] text-muted">Puedes continuar sin entrada y crear únicamente el lote.</p></div><label className="block text-[11.5px] font-semibold text-copy">Depósito<select value={entry.depositCode} onChange={(event) => setEntry({ ...entry, depositCode: event.target.value })} className={fieldClass}><option value="">Selecciona un depósito</option>{availableDeposits.map((deposit) => <option key={deposit.id} value={deposit.code}>{deposit.code} · {deposit.zone} · {formatLiters(deposit.capacityLiters)} L</option>)}</select></label><label className="block text-[11.5px] font-semibold text-copy">Volumen (L)<input type="number" min="1" value={entry.volumeLiters || ''} onChange={(event) => setEntry({ ...entry, volumeLiters: Number(event.target.value) })} className={fieldClass} /></label><label className="block text-[11.5px] font-semibold text-copy">Fecha efectiva<input type="date" value={entry.effectiveDate} onChange={(event) => setEntry({ ...entry, effectiveDate: event.target.value })} className={fieldClass} /></label>{selectedDeposit && <div className={`rounded-xl p-3 text-[11.5px] ${entry.volumeLiters > selectedDeposit.capacityLiters ? 'bg-[#f7dadf] text-[#8e1f33]' : 'bg-[#dceadf] text-[#1f5c3a]'}`}>Capacidad útil {formatLiters(selectedDeposit.capacityLiters)} L · {entry.volumeLiters > selectedDeposit.capacityLiters ? `exceso de ${formatLiters(entry.volumeLiters - selectedDeposit.capacityLiters)} L` : `margen de ${formatLiters(selectedDeposit.capacityLiters - entry.volumeLiters)} L`}</div>}</div>}
      {step === 3 && <div className="space-y-3"><h3 className="text-[14px] font-semibold">Revisa antes de confirmar</h3><div className="rounded-xl border border-border bg-white p-4 text-[12px]"><div className="flex justify-between gap-2"><span className="text-muted">Lote</span><strong className="font-mono">{lot.code}</strong></div><div className="mt-2 flex justify-between gap-2"><span className="text-muted">Categoría · destino</span><strong>{lot.category} · {lot.destination}</strong></div><div className="mt-2 flex justify-between gap-2"><span className="text-muted">Variedad</span><strong>{lot.varieties.length === 0 ? 'Pendiente de determinar' : lot.varieties.join(', ')}</strong></div><div className="mt-2 flex justify-between gap-2"><span className="text-muted">Depósito · volumen</span><strong>{entry.depositCode || 'Sin seleccionar'} · {formatLiters(entry.volumeLiters)} L</strong></div></div><p className="text-[11.5px] leading-5 text-muted">Crear solo el lote lo deja sin contenido. Crear y confirmar entrada crea también una unidad de contenido y su ocupación, tras validar la capacidad.</p></div>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f7dadf] p-3 text-[11.5px] text-[#8e3b4a]">{error}</p>}
    </div><div className="flex flex-wrap justify-between gap-2 border-t border-border bg-white px-5 py-3 sm:px-6"><button type="button" onClick={() => step === 1 ? onClose() : setStep(step - 1)} className="flex min-h-10 items-center gap-1 rounded-xl border border-border px-3 text-[11.5px] font-semibold"><ArrowLeft className="size-3.5" />{step === 1 ? 'Cancelar' : 'Volver'}</button>{step < 3 ? <button type="button" onClick={handleNext} className="flex min-h-10 items-center gap-1 rounded-xl bg-plum px-4 text-[11.5px] font-semibold text-white">Continuar<ArrowRight className="size-3.5" /></button> : <div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => handleSave(false)} className="min-h-10 rounded-xl border border-border px-3 text-[11.5px] font-semibold disabled:opacity-60">Crear solo el lote</button><button type="button" disabled={saving} onClick={() => handleSave(true)} className="min-h-10 rounded-xl bg-plum px-3 text-[11.5px] font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Crear y confirmar entrada'}</button></div>}</div></section></div>
}

export function LotsPage({ search, onOpenLot, openFormForDeposit }: LotsPageProps) {
  const profile = useCurrentProfile()
  const [lots, setLots] = useState<Lot[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('Todas')
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['Todas'])
  useEffect(() => { catalogApi.getInternalCategories().then((items) => setCategoryOptions(['Todas', ...items.map((item) => item.name)])).catch(() => undefined) }, [])
  const [archive, setArchive] = useState('Activos')
  const [campaign, setCampaign] = useState('Todas')
  const [showForm, setShowForm] = useState(Boolean(openFormForDeposit))
  const [notice, setNotice] = useState('')
  const load = () => { setLoading(true); Promise.all([cellarApi.getLots(), cellarApi.getDeposits()]).then(([newLots, newDeposits]) => { setLots(newLots); setDeposits(newDeposits) }).finally(() => setLoading(false)) }
  useEffect(load, [])

  const year = currentYearInCenter()
  const campaignOptions = ['Todas', ...Array.from(new Set(lots.map((lot) => String(lot.campaign)))).sort().reverse()]
  const filtered = useMemo(() => lots.filter((lot) => lot.code.toUpperCase().replace(/\s+/g, '').includes(search.toUpperCase().replace(/\s+/g, '')) && (category === 'Todas' || lot.category === category) && (campaign === 'Todas' || String(lot.campaign) === campaign) && (archive === 'Todos' || (archive === 'Archivados' ? lot.archived : !lot.archived))), [lots, search, category, archive, campaign])
  const currentYearLots = useMemo(() => lots.filter((lot) => lot.campaign === year), [lots, year])
  const volumeFor = (lot: Lot) => deposits.filter((deposit) => activeOccupation(deposit)?.lotCode === lot.code).reduce((sum, deposit) => sum + (activeOccupation(deposit)?.volumeLiters ?? 0), 0)

  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[23px] font-semibold tracking-tight">Lotes</h1><p className="mt-1 text-[12px] text-muted">{currentYearLots.length} lotes en campaña {year}</p></div><button type="button" onClick={() => setShowForm(true)} className="flex min-h-10 items-center gap-1 rounded-xl bg-plum px-3.5 text-[12px] font-semibold text-white hover:bg-plum-dark"><Plus className="size-4" />Nuevo lote</button></div><div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-[#fdfbfc] p-3 sm:p-4">{([['Campaña', campaign, setCampaign, campaignOptions], ['Categoría', category, setCategory, categoryOptions], ['Archivo', archive, setArchive, ['Activos', 'Archivados', 'Todos']]] as const).map(([label, value, setter, options]) => <label key={label} className="text-[11px] font-semibold text-muted">{label}<select value={value} onChange={(event) => setter(event.target.value)} className="ml-2 min-h-9 rounded-lg border border-border bg-white px-2 text-[11.5px] font-medium text-ink">{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}</div>{loading ? <p className="p-6 text-center text-[12px] text-muted">Cargando lotes…</p> : filtered.length === 0 ? <div className="rounded-2xl border border-border bg-white p-8 text-center text-[13px] text-muted">No hay lotes con estos filtros.</div> : <div className="overflow-hidden rounded-2xl border border-border bg-white"><div className="hidden grid-cols-[1.35fr_.7fr_.7fr_.8fr_.85fr] gap-3 bg-[#fdfbfc] px-4 py-3 text-[10.5px] font-semibold text-muted sm:grid"><span>Lote</span><span>Categoría</span><span>Unidades</span><span>Volumen total</span><span>Estado</span></div>{filtered.map((lot) => { const activeCount = lot.activeContentCodes.length; const state = lot.archived ? 'Archivado' : activeCount === 0 ? 'Sin contenido' : lot.varieties.length === 0 ? 'Pendiente de variedad' : 'Activo'; return <button key={lot.code} type="button" onClick={() => onOpenLot(lot.code)} className="grid w-full grid-cols-[1.35fr_.7fr_.7fr_.8fr_.85fr] gap-3 border-t border-border px-4 py-3 text-left text-[12px] first:border-t-0 hover:bg-plum-soft"><span><span className="block font-mono font-semibold">{lot.code}</span><span className="text-[10.5px] text-muted">campaña {lot.campaign}</span></span><span>{lot.category}</span><span><strong className="font-semibold">{activeCount}</strong> activas<p className="text-[10.5px] text-muted">{lot.contentCodes.length - activeCount} cerradas</p></span><span>{formatLiters(volumeFor(lot))} L</span><span><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${state === 'Activo' ? 'bg-[#dceadf] text-[#1f5c3a]' : state === 'Sin contenido' ? 'bg-[#efeff5] text-[#43435c]' : state === 'Pendiente de variedad' ? 'bg-[#f5eed0] text-[#6b5a10]' : 'bg-[#efeff5] text-[#43435c]'}`}>{state}</span></span></button> })}</div>}
    {notice && <div role="status" className="rounded-xl bg-[#dceadf] p-3 text-[12px] text-[#1f5c3a]">{notice}</div>}
    {showForm && <LotForm deposits={deposits} existingLots={lots} defaultResponsibleUsername={profile?.username ?? ''} initialDeposit={openFormForDeposit} onClose={() => setShowForm(false)} onCreated={(lot) => { setShowForm(false); setNotice(`${lot.code} creado${lot.activeContentCodes.length ? ' con entrada confirmada' : ' sin contenido registrado'}.`); load() }} />}
  </div>
}