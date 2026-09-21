import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Star, X } from 'lucide-react'
import { useResource } from '../../../hooks/use-resource'
import { catalogApi } from '../../../services/catalog-api'
import {
  panelsApi, type PanelUpdate, type PanelView, type ParameterInput, type ParameterView,
} from '../../laboratory/services/panels-api'

const card = 'rounded-2xl border border-border bg-white p-4'
const input = 'w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-plum'

/**
 * Administración → Plantillas de análisis. Two views of the same thing: the templates (which
 * parameters an analysis asks for, and for which kind of content) and the parameter catalogue.
 */
export function AnalysisTemplatesTab() {
  const [view, setView] = useState<'templates' | 'parameters'>('templates')
  const panels = useResource(() => panelsApi.panels(), [])
  const parameters = useResource(() => panelsApi.parameters(), [])
  const categories = useResource(() => catalogApi.getInternalCategories(), [])
  const reload = () => { panels.reload(); parameters.reload() }

  return (
    <section className="mt-4 space-y-3">
      <div className={card}>
        <h2 className="text-sm font-semibold">Plantillas de análisis</h2>
        <p className="mt-1 text-xs text-muted">
          Qué parámetros pide cada análisis y para qué tipo de contenido. Al registrar o importar una muestra se propone
          la plantilla por defecto de lo que hay en el depósito: un mosto pide el control fermentativo, un vino el análisis de vino.
        </p>
        <div className="mt-3 flex gap-2">
          {(['templates', 'parameters'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setView(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === item ? 'bg-plum text-white' : 'border border-border bg-white text-copy'}`}>
              {item === 'templates' ? 'Plantillas' : 'Parámetros'}
            </button>
          ))}
        </div>
      </div>
      {view === 'templates'
        ? <TemplatesView panels={panels.data ?? []} parameters={parameters.data ?? []}
            categories={(categories.data ?? []).filter((item) => item.active)} loading={panels.loading} onChanged={reload} />
        : <ParametersView parameters={parameters.data ?? []} loading={parameters.loading} onChanged={reload} />}
    </section>
  )
}

// ---------------------------------------------------------------------------------------------- templates

function TemplatesView({ panels, parameters, categories, loading, onChanged }: {
  panels: PanelView[]; parameters: ParameterView[]; categories: { code: string; name: string }[]
  loading: boolean; onChanged: () => void
}) {
  const [editing, setEditing] = useState<PanelView | 'new'>()
  if (loading) return <p className="p-4 text-center text-xs text-muted">Cargando plantillas…</p>
  return (
    <>
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing('new')}
          className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"><Plus className="size-3.5" />Nueva plantilla</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {panels.map((panel) => (
          <button key={panel.code} type="button" onClick={() => setEditing(panel)}
            className={`${card} text-left transition hover:border-plum ${panel.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{panel.name}</p>
                <p className="font-mono text-[10.5px] text-muted">{panel.code}{panel.active ? '' : ' · desactivada'}</p>
              </div>
              <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10.5px] font-semibold text-plum">{panel.parameters.length} parámetros</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {panel.categories.length === 0 && <span className="text-[11px] text-muted">Sin asignar a ningún tipo de contenido</span>}
              {panel.categories.map((category) => (
                <span key={category.code} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${category.isDefault ? 'bg-plum text-white' : 'border border-border text-copy'}`}>
                  {category.isDefault && <Star className="size-2.5" aria-label="por defecto" />}{category.name}
                </span>
              ))}
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] text-muted">{panel.parameters.map((p) => p.name).join(' · ')}</p>
          </button>
        ))}
      </div>
      {editing && (
        <TemplateEditor panel={editing === 'new' ? undefined : editing} parameters={parameters} categories={categories}
          onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); onChanged() }} />
      )}
    </>
  )
}

function TemplateEditor({ panel, parameters, categories, onClose, onSaved }: {
  panel?: PanelView; parameters: ParameterView[]; categories: { code: string; name: string }[]
  onClose: () => void; onSaved: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState(panel?.name ?? '')
  const [description, setDescription] = useState(panel?.description ?? '')
  const [active, setActive] = useState(panel?.active ?? true)
  const [selected, setSelected] = useState(panel?.parameters.map((p) => ({ code: p.code, required: p.required })) ?? [])
  const [assigned, setAssigned] = useState(panel?.categories.map((c) => ({ code: c.code, isDefault: c.isDefault })) ?? [])
  const [adding, setAdding] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const byCode = useMemo(() => new Map(parameters.map((p) => [p.code, p])), [parameters])
  const available = parameters.filter((p) => p.active && !selected.some((s) => s.code === p.code))

  const move = (index: number, delta: number) => setSelected((list) => {
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item)
    return next
  })
  const toggleCategory = (categoryCode: string) => setAssigned((list) => list.some((c) => c.code === categoryCode)
    ? list.filter((c) => c.code !== categoryCode) : [...list, { code: categoryCode, isDefault: false }])
  const toggleDefault = (categoryCode: string) => setAssigned((list) => list.map((c) => c.code === categoryCode ? { ...c, isDefault: !c.isDefault } : c))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const target = panel?.code ?? (await panelsApi.createPanel({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || null })).code
      const body: PanelUpdate = { name: name.trim(), description: description.trim() || null, active, parameters: selected, categories: assigned }
      await panelsApi.updatePanel(target, body)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la plantilla.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="template-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}
        className="h-full w-full max-w-[520px] space-y-4 overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="template-title" className="text-lg font-semibold">{panel ? `Plantilla ${panel.name}` : 'Nueva plantilla'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        {panel && panel.samples > 0 && (
          <p className="rounded-xl bg-plum-soft p-2.5 text-[11px] text-plum">
            {panel.samples} análisis usan esta plantilla. Los cambios valen para los análisis nuevos; los ya registrados conservan sus resultados.
          </p>
        )}
        {!panel && (
          <label className="block text-xs font-semibold">Código *
            <input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="VINO_BLANCO" className={`${input} mt-1 font-mono`} />
            <span className="mt-1 block text-[11px] font-normal text-muted">No se puede cambiar después.</span>
          </label>
        )}
        <label className="block text-xs font-semibold">Nombre *
          <input required value={name} onChange={(event) => setName(event.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="block text-xs font-semibold">Descripción
          <input value={description} onChange={(event) => setDescription(event.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Activa (se ofrece al registrar muestras)</label>

        <fieldset>
          <legend className="text-xs font-semibold">Tipos de contenido</legend>
          <p className="text-[11px] text-muted">Marca a qué productos sirve; la estrella la propone por defecto.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const current = assigned.find((c) => c.code === category.code)
              return (
                <span key={category.code} className={`flex items-center overflow-hidden rounded-full border text-[11px] ${current ? 'border-plum' : 'border-border'}`}>
                  <button type="button" onClick={() => toggleCategory(category.code)} aria-pressed={Boolean(current)}
                    className={`px-2.5 py-1 font-semibold ${current ? 'bg-plum-soft text-plum' : 'bg-white text-copy'}`}>{category.name}</button>
                  {current && (
                    <button type="button" onClick={() => toggleDefault(category.code)} aria-pressed={current.isDefault}
                      aria-label={`Por defecto para ${category.name}`} title="Por defecto"
                      className={`border-l border-plum px-1.5 py-1 ${current.isDefault ? 'bg-plum text-white' : 'bg-white text-plum'}`}><Star className="size-3" /></button>
                  )}
                </span>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-semibold">Parámetros ({selected.length})</legend>
          <p className="text-[11px] text-muted">En el orden en que se introducen. Los obligatorios hay que rellenarlos para validar.</p>
          <ol className="mt-2 space-y-1">
            {selected.map((item, index) => {
              const parameter = byCode.get(item.code)
              return (
                <li key={item.code} className="flex items-center gap-2 rounded-xl border border-border bg-white px-2.5 py-1.5 text-xs">
                  <span className="w-5 text-right font-mono text-[10.5px] text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{parameter?.name ?? item.code}<span className="ml-1 text-[10.5px] text-muted">{parameter?.unit}</span></span>
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={item.required}
                    onChange={(event) => setSelected((list) => list.map((p) => p.code === item.code ? { ...p, required: event.target.checked } : p))} />Obligatorio</label>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="rounded p-1 hover:bg-plum-soft disabled:opacity-30"><ArrowUp className="size-3" /></button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} aria-label="Bajar" className="rounded p-1 hover:bg-plum-soft disabled:opacity-30"><ArrowDown className="size-3" /></button>
                  <button type="button" onClick={() => setSelected((list) => list.filter((p) => p.code !== item.code))} aria-label={`Quitar ${parameter?.name ?? item.code}`} className="rounded p-1 text-muted hover:bg-plum-soft hover:text-plum"><X className="size-3" /></button>
                </li>
              )
            })}
          </ol>
          <div className="mt-2 flex gap-2">
            <select value={adding} onChange={(event) => setAdding(event.target.value)} aria-label="Parámetro a añadir" className={input}>
              <option value="">Añadir parámetro…</option>
              {available.map((p) => <option key={p.code} value={p.code}>{p.name}{p.unit ? ` (${p.unit})` : ''}</option>)}
            </select>
            <button type="button" disabled={!adding} onClick={() => { setSelected((list) => [...list, { code: adding, required: false }]); setAdding('') }}
              className="shrink-0 rounded-xl border border-border px-3 text-xs font-semibold text-plum disabled:opacity-40">Añadir</button>
          </div>
        </fieldset>

        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}
        <button disabled={saving} className="min-h-10 w-full rounded-xl bg-plum text-xs font-semibold text-white disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------- parameters

function ParametersView({ parameters, loading, onChanged }: { parameters: ParameterView[]; loading: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState<ParameterView | 'new'>()
  const [query, setQuery] = useState('')
  const shown = parameters.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(query.toLowerCase()))
  if (loading) return <p className="p-4 text-center text-xs text-muted">Cargando parámetros…</p>
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar parámetro…" aria-label="Buscar parámetro"
          className="min-h-9 w-full max-w-xs rounded-xl border border-border bg-white px-3 text-xs" />
        <button type="button" onClick={() => setEditing('new')}
          className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"><Plus className="size-3.5" />Nuevo parámetro</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-field text-[11px] text-muted"><tr>
            <th className="px-3 py-2">Parámetro</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Unidad</th>
            <th className="px-3 py-2">Decimales</th><th className="px-3 py-2">Plantillas</th><th className="px-3 py-2">Estado</th>
          </tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.code} onClick={() => setEditing(p)} className="cursor-pointer border-t border-border hover:bg-field">
                <td className="px-3 py-2 font-semibold">{p.name}</td>
                <td className="px-3 py-2 font-mono text-[10.5px] text-muted">{p.code}</td>
                <td className="px-3 py-2">{p.unit || '—'}</td>
                <td className="px-3 py-2">{p.decimals}</td>
                <td className="px-3 py-2">{p.panels}</td>
                <td className="px-3 py-2">{p.active ? 'Activo' : <span className="text-muted">Inactivo</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <ParameterEditor parameter={editing === 'new' ? undefined : editing}
        onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); onChanged() }} />}
    </>
  )
}

function ParameterEditor({ parameter, onClose, onSaved }: { parameter?: ParameterView; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ParameterInput>({
    code: parameter?.code ?? '', name: parameter?.name ?? '', unit: parameter?.unit ?? '', decimals: parameter?.decimals ?? 2,
    plausibilityMin: parameter?.plausibilityMin ?? null, plausibilityMax: parameter?.plausibilityMax ?? null,
    description: parameter?.description ?? '', active: parameter?.active ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const number = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const body = { ...form, description: form.description?.trim() || null }
      if (parameter) await panelsApi.updateParameter(parameter.code, body)
      else await panelsApi.createParameter({ ...body, code: (form.code ?? '').trim().toUpperCase() })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el parámetro.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="parameter-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}
        className="h-full w-full max-w-[440px] space-y-4 overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="parameter-title" className="text-lg font-semibold">{parameter ? parameter.name : 'Nuevo parámetro'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        <label className="block text-xs font-semibold">Código *
          <input required disabled={Boolean(parameter)} value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
            placeholder="ACIDO_TARTARICO" className={`${input} mt-1 font-mono disabled:bg-field`} />
          {!parameter && <span className="mt-1 block text-[11px] font-normal text-muted">Lo usan resultados y avisos: no se puede cambiar después.</span>}
        </label>
        <label className="block text-xs font-semibold">Nombre *
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${input} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold">Unidad
            <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="g/L" className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Decimales
            <input type="number" min={0} max={6} value={form.decimals} onChange={(event) => setForm({ ...form, decimals: Number(event.target.value) })} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Mínimo plausible
            <input inputMode="decimal" value={form.plausibilityMin ?? ''} onChange={(event) => setForm({ ...form, plausibilityMin: number(event.target.value) })} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Máximo plausible
            <input inputMode="decimal" value={form.plausibilityMax ?? ''} onChange={(event) => setForm({ ...form, plausibilityMax: number(event.target.value) })} className={`${input} mt-1`} />
          </label>
        </div>
        <label className="block text-xs font-semibold">Descripción
          <textarea rows={2} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${input} mt-1`} />
        </label>
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Activo (se puede añadir a plantillas)</label>
        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}
        <button disabled={saving} className="min-h-10 w-full rounded-xl bg-plum text-xs font-semibold text-white disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar parámetro'}
        </button>
      </form>
    </div>
  )
}
