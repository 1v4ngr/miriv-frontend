import { useEffect, useState, type FormEvent } from 'react'
import { panelsApi, type PanelView } from '../services/panels-api'
import { ArrowLeft, ArrowRight, ChevronDown, RotateCcw } from 'lucide-react'
import { cellarApi } from '../../cellar/services/cellar-api'
import { activeOccupation } from '../../cellar/utils'
import { laboratoryApi } from '../services/laboratory-api'
import { catalogApi, type CatalogItem } from '../../../services/catalog-api'
import { profileApi, type CenterMember } from '../../../services/profile-api'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import type { NewSample, Sample } from '../types'
import { useCan } from '../../../hooks/use-permissions'
import { DepositPickerModal } from '../../cellar/components/deposit-picker-modal'

interface Props { onBack: () => void; onSaved: (sampleCode: string, introduceResults: boolean) => void; initialDeposit?: string }

function panelInitial(panel: string): string {
  const cleaned = panel.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return (cleaned.slice(0, 3) || 'GEN')
}

function deriveSampleCode(panel: string, year: number, existing: Sample[]): string {
  const ini = panelInitial(panel)
  const pattern = new RegExp(`^MUS-${year}-${ini}-(\\d{3,})$`)
  const used = existing
    .map((sample) => sample.code.match(pattern)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((n) => Number.parseInt(n, 10))
  const next = (used.length ? Math.max(...used) : 0) + 1
  return `MUS-${year}-${ini}-${String(next).padStart(3, '0')}`
}
const today = new Date().toISOString().slice(0, 10)
const nowTime = new Date().toTimeString().slice(0, 5)
const initialYear = new Date().getFullYear()
const emptyForm = (): NewSample => ({ code: `MUS-${initialYear}-CTL-001`, originDeposit: '', contentCode: '', lotCode: '', category: '', takenAt: `${today}T${nowTime}`, takenDate: today, panel: 'Control', responsible: '', laboratoryCode: '', observations: '' })

export function SampleFormPage({ onBack, onSaved, initialDeposit }: Props) {
  const canEnterResults = useCan('RESULT_ENTER')
  const [form, setForm] = useState(emptyForm)
  const [deposits, setDeposits] = useState<{ code: string; contentCode: string; lotCode: string; category: string }[]>([])
  const [loadingDeposits, setLoadingDeposits] = useState(true)
  const [centerMembers, setCenterMembers] = useState<CenterMember[]>([])
  const [samples, setSamples] = useState<Sample[]>([])
  const [codeManual, setCodeManual] = useState(false)
  const [panelOptions, setPanelOptions] = useState<PanelView[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [depositPickerOpen, setDepositPickerOpen] = useState(false)
  const profile = useCurrentProfile()
  useEffect(() => { cellarApi.getDeposits().then((items) => setDeposits(items.flatMap((deposit) => { const occupation = activeOccupation(deposit); return occupation ? [{ code: deposit.code, contentCode: occupation.contentCode, lotCode: occupation.lotCode, category: occupation.category }] : [] }))).finally(() => setLoadingDeposits(false)) }, [])
  useEffect(() => { laboratoryApi.getSamples().then(setSamples).catch(() => undefined) }, [])
  useEffect(() => { profileApi.listCenterMembers().then(setCenterMembers).catch(() => undefined) }, [])
  useEffect(() => { if (profile) setForm((current) => (current.responsible ? current : { ...current, responsible: profile.username ?? profile.displayName })) }, [profile])
  useEffect(() => { if (deposits.length === 0) return; if (initialDeposit) { const target = deposits.find((deposit) => deposit.code === initialDeposit); if (target) { setForm((current) => (current.originDeposit === target.code ? current : { ...current, originDeposit: target.code, contentCode: target.contentCode, lotCode: target.lotCode, category: target.category })); return } } setForm((current) => (current.originDeposit ? current : { ...current, originDeposit: deposits[0].code, contentCode: deposits[0].contentCode, lotCode: deposits[0].lotCode, category: deposits[0].category })) }, [deposits, initialDeposit])
  // The templates the content's category offers, the default first: a must proposes the fermentation
  // control, a wine the wine analysis. Re-proposed whenever the chosen deposit holds another kind of product.
  useEffect(() => {
    let active = true
    panelsApi.panels(form.category || undefined).then((items) => {
      if (!active) return
      setPanelOptions(items)
      if (items[0]) setForm((current) => ({ ...current, panel: items[0].name }))
    }).catch(() => setPanelOptions([]))
    return () => { active = false }
  }, [form.category])
  useEffect(() => {
    if (codeManual) return
    setForm((current) => ({ ...current, code: deriveSampleCode(current.panel, initialYear, samples) }))
  }, [form.panel, codeManual, samples])
  const selected = deposits.find((deposit) => deposit.code === form.originDeposit)
  const updateDeposit = (code: string) => {
    const deposit = deposits.find((item) => item.code === code)
    if (deposit) setForm({ ...form, originDeposit: code, contentCode: deposit.contentCode, lotCode: deposit.lotCode, category: deposit.category })
  }
  const handleSave = async (introduceResults: boolean) => { setSaving(true); setError(''); try { const sample = await laboratoryApi.createSample(form); onSaved(sample.code, introduceResults) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la muestra.') } finally { setSaving(false) } }
  const field = 'mt-1.5 min-h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs outline-none focus:border-[#b9899c]'
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-6">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum">
        <ArrowLeft className="size-4" />Volver a pendientes de laboratorio
      </button>
      <header>
        <p className="text-[11px] text-muted">Laboratorio / Bandeja / Registrar muestra</p>
        <h1 className="mt-1 text-[23px] font-semibold">Registrar muestra</h1>
        <p className="mt-1 text-xs text-muted">Qué se tomó, dónde y cuándo. Los tres bloques son obligatorios.</p>
      </header>
      <form onSubmit={(event) => { event.preventDefault(); handleSave(false) }} className="space-y-4">
        <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold">
            <span className="mr-2 rounded-full bg-plum px-2 py-1 text-[10px] text-white">1</span>Identificación
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold">Código de muestra *
                <div className="mt-1.5 flex items-stretch gap-2">
                  <input
                    required
                    value={form.code}
                    onChange={(event) => { setCodeManual(true); setForm({ ...form, code: event.target.value }) }}
                    className={`${field} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => { setCodeManual(false); setForm((current) => ({ ...current, code: deriveSampleCode(current.panel, initialYear, samples) })) }}
                    title={codeManual ? 'Volver a autogenerar' : 'Regenerar sugerencia'}
                    className="flex min-h-10 items-center gap-1 rounded-xl border border-border px-2 text-[11px] font-semibold text-plum hover:bg-plum-soft"
                  >
                    <RotateCcw className="size-3.5" />Auto
                  </button>
                </div>
                <p className="mt-1 text-[10.5px] leading-4 text-muted">
                  Formato sugerido: <span className="font-mono">MUS-{initialYear}-CTL-001</span> (3 letras del panel + correlativo).
                  {' '}{codeManual ? 'Estás editándolo manualmente.' : 'Editable: cambia a manual al teclear.'}
                </p>
              </label>
            </div>
            <div className="text-xs font-semibold">
              Depósito de toma *
              {selected ? (
                <button
                  type="button"
                  onClick={() => setDepositPickerOpen(true)}
                  disabled={deposits.length === 0}
                  className={`mt-1.5 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-normal hover:border-plum disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-base font-semibold tracking-wide text-copy">{selected.code}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {[selected.contentCode && `Contenido ${selected.contentCode}`, selected.lotCode && `Lote ${selected.lotCode}`, selected.category && selected.category]
                        .filter(Boolean)
                        .join(' · ') || 'Sin contenido activo ahora mismo.'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-plum">
                    Cambiar<ChevronDown className="size-3.5" aria-hidden="true" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDepositPickerOpen(true)}
                  disabled={deposits.length === 0 || loadingDeposits}
                  className="mt-1.5 flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-white px-3 py-2 text-left text-xs font-normal text-muted hover:border-plum disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingDeposits ? 'Cargando depósitos…' : deposits.length === 0 ? 'Sin depósitos disponibles' : 'Elegir depósito…'}
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {!loadingDeposits && deposits.length === 0 && (
            <p role="alert" className="mt-4 rounded-xl bg-[#f5e4da] p-3 text-xs text-[#7a4a22]">
              No hay ningún depósito con contenido activo ahora mismo. Registra un lote con entrada en bodega antes de tomar una muestra.
            </p>
          )}
          {selected && (
            <div className="mt-4 rounded-xl bg-plum-soft p-3 text-xs">
              <p>Muestra del contenido <strong className="font-mono">{selected.contentCode}</strong> en <strong>{selected.code}</strong></p>
              <p className="mt-1 text-muted">La asignación se guarda con la ocupación y fecha de toma; no se sustituye por una ubicación futura.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <span>Contenido: <strong className="font-mono">{selected.contentCode}</strong></span>
                <span>Lote: <strong className="font-mono">{selected.lotCode}</strong></span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold">
            <span className="mr-2 rounded-full bg-plum px-2 py-1 text-[10px] text-white">2</span>Toma
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Fecha *
              <input
                required
                max={today}
                type="date"
                value={form.takenDate}
                onChange={(event) => setForm({ ...form, takenDate: event.target.value, takenAt: `${event.target.value}T${form.takenAt.slice(11)}` })}
                className={field}
              />
            </label>
            <label className="text-xs font-semibold">Hora *
              <input
                required
                type="time"
                value={form.takenAt.slice(11)}
                onChange={(event) => setForm({ ...form, takenAt: `${form.takenDate}T${event.target.value}` })}
                className={field}
              />
            </label>
            <label className="text-xs font-semibold">Responsable *
              <select
                required
                value={form.responsible}
                onChange={(event) => setForm({ ...form, responsible: event.target.value })}
                className={field}
              >
                <option value="">Selecciona un responsable</option>
                {centerMembers.map((member) => (
                  <option key={member.username} value={member.username}>
                    {member.displayName || member.username}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-[11px] text-muted">La fecha es visible y editable; una muestra histórica no se guarda con la fecha actual en silencio.</p>
        </section>

        <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
          <h2 className="text-sm font-semibold">
            <span className="mr-2 rounded-full bg-plum px-2 py-1 text-[10px] text-white">3</span>Solicitud
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Panel *
              <select
                value={form.panel}
                onChange={(event) => setForm({ ...form, panel: event.target.value })}
                className={field}
              >
                {panelOptions.length === 0 && <option>{form.panel}</option>}
                {panelOptions.map((panel, index) => (
                  <option key={panel.code} value={panel.name}>
                    {panel.name}{index === 0 && form.category ? ' (recomendada)' : ''}
                  </option>
                ))}
              </select>
              {form.category && panelOptions[0] && (
                <span className="mt-1 block text-[11px] font-normal text-muted">
                  Plantillas para {form.category}. {panelOptions.find((panel) => panel.name === form.panel)?.parameters.length ?? 0} parámetros.
                </span>
              )}
            </label>
          </div>
          <label className="mt-3 block text-xs font-semibold">Observaciones
            <textarea
              value={form.observations}
              onChange={(event) => setForm({ ...form, observations: event.target.value })}
              placeholder="Condiciones especiales, aspecto, temperatura de la toma…"
              rows={3}
              className={field}
            />
          </label>
        </section>

        <section className="sticky bottom-3 rounded-2xl border border-border bg-[#fdfbfc] p-4 shadow-lg">
          <h2 className="text-xs font-semibold">Identidad de la muestra</h2>
          <p className="mt-2 font-mono text-xs">
            {form.code} · {form.contentCode} · {form.originDeposit} · {form.takenDate} · {form.panel}
          </p>
          <p className="mt-1 text-[11px] text-muted">Este resumen permanece visible antes de guardar.</p>
          {error && <p role="alert" className="mt-3 text-xs text-[#8e1f33]">{error}</p>}
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {canEnterResults && (
              <button
                type="button"
                disabled={saving || deposits.length === 0 || !form.originDeposit}
                onClick={() => handleSave(true)}
                className="min-h-10 rounded-xl bg-plum px-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                Guardar e introducir resultados <ArrowRight className="inline size-3.5" />
              </button>
            )}
            <button
              disabled={saving || deposits.length === 0 || !form.originDeposit}
              className="min-h-10 rounded-xl border border-border bg-white px-3 text-xs font-semibold disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar muestra'}
            </button>
          </div>
        </section>
      </form>

      <DepositPickerModal
        open={depositPickerOpen}
        title="Depósito de toma"
        subtitle="Solo aparecen depósitos con contenido activo. La asignación se guardará al registrar la muestra."
        deposits={deposits}
        preSelected={form.originDeposit || undefined}
        onClose={() => setDepositPickerOpen(false)}
        onPick={(picked) => {
          const code = Array.isArray(picked) ? picked[0] : picked
          if (code) updateDeposit(code)
        }}
      />
    </div>
  )
}
