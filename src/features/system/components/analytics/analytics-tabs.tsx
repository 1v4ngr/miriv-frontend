import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Star, X } from 'lucide-react'
import { CenteredModal } from '../../../../components/ui/centered-modal'
import { useResource } from '../../../../hooks/use-resource'
import { fermentationLabels } from '../../../../lib/labels'
import { catalogApi } from '../../../../services/catalog-api'
import { panelsApi, type PanelUpdate, type PanelView, type ParameterInput, type ParameterView } from '../../../laboratory/services/panels-api'
import { AlertRuleForm } from '../../../tracking/components/alert-rule-form'
import { trackingApi, type AlertCondition, type AlertRule, type AlertRuleInput, type TargetInput, type TargetView } from '../../../tracking/services/tracking-api'
import { AnaliticaOverview } from './analitica-overview'
import { ParameterPickerModal } from './parameter-picker-modal'
import { ParametersTab } from './parameters-tab'
import { TemplatesTab } from './templates-tab'
import { TargetsTab } from './targets-tab'
import { AlertRulesTab } from './alert-rules-tab'
import { ReportPhasesTab } from '../../../reports/components/report-phases-tab'

type AnaliticaTab = 'overview' | 'parameters' | 'templates' | 'targets' | 'rules' | 'report-phases'
const TABS: Array<{ id: AnaliticaTab; label: string }> = [
  { id: 'overview', label: 'Resumen' },
  { id: 'parameters', label: 'Parámetros' },
  { id: 'templates', label: 'Plantillas' },
  { id: 'targets', label: 'Objetivos analíticos' },
  { id: 'rules', label: 'Avisos' },
  { id: 'report-phases', label: 'Fases de informe' },
]

interface EditingState {
  parameter?: ParameterView | 'new'
  template?: PanelView | 'new'
  target?: TargetView | 'new'
  rule?: AlertRule | 'new'
}
interface DeletingState {
  parameter?: ParameterView
  template?: PanelView
  target?: TargetView
  rule?: AlertRule
}
const EMPTY: EditingState = {}

const input = 'w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-plum'

interface AnalyticsTabsProps {
  canTargets: boolean
  canAlerts: boolean
  initialTab?: AnaliticaTab
}

/** Root container for the four analytical sub-tabs and every edit / delete modal. */
export function AnalyticsTabs({ canTargets, canAlerts, initialTab = 'overview' }: AnalyticsTabsProps) {
  const initial = pickInitial(initialTab, canTargets, canAlerts)
  const [tab, setTab] = useState<AnaliticaTab>(initial)
  const [editing, setEditing] = useState<EditingState>(EMPTY)
  const [deleting, setDeleting] = useState<DeletingState>({})

  const parameters = useResource(() => panelsApi.parameters(), [])
  const panels = useResource(() => panelsApi.panels(), [])
  const targets = useResource(() => trackingApi.listTargets(), [])
  const rules = useResource(() => trackingApi.alertRules(), [])
  const parameterInfo = useResource(() => trackingApi.parameters(true), [])
  const categories = useResource(() => catalogApi.getInternalCategories(), [])

  const activeCategories = useMemo(
    () => (categories.data ?? []).filter((c) => c.active),
    [categories.data],
  )

  /** Bumped whenever a write commits. Sub-tabs include this in their own `useResource` deps so that
   * mutations made from a modal (delete, save) refresh them without the parent having to share data. */
  const [reloadToken, setReloadToken] = useState(0)
  const reload = () => {
    parameters.reload(); panels.reload(); targets.reload(); rules.reload(); parameterInfo.reload()
    setReloadToken((token) => token + 1)
  }

  const closeAll = () => { setEditing(EMPTY); setDeleting({}) }

  const openTemplate = (panel: PanelView | 'new') => {
    setEditing({ template: panel }); setDeleting({}); setTab('templates')
  }
  const openRule = (rule: AlertRule | 'new') => {
    setEditing({ rule }); setDeleting({}); setTab('rules')
  }
  const openTarget = (target: TargetView | 'new') => {
    setEditing({ target }); setDeleting({}); setTab('targets')
  }
  const openParameter = (parameter: ParameterView | 'new') => {
    setEditing({ parameter }); setDeleting({}); setTab('parameters')
  }

  const visibleTabs = TABS.filter((t) => (t.id === 'rules' ? canAlerts : canTargets))

  return (
    <section>
      <nav aria-label="Secciones de configuración analítica"
        className="no-scrollbar flex max-w-full gap-2 overflow-x-auto pb-1">
        {visibleTabs.map((item) => {
          const idx = visibleTabs.findIndex((t) => t.id === item.id)
          return (
            <SubTabButton key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
              <span className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-md bg-plum-soft font-mono text-[10.5px] font-semibold text-plum">{idx + 1}</span>
                {item.label}
              </span>
            </SubTabButton>
          )
        })}
      </nav>

      <div className="mt-3 space-y-3">
        {tab === 'overview' && (
          <AnaliticaOverview
            canTargets={canTargets}
            canAlerts={canAlerts}
            onNavigate={setTab}
            onNewParameter={() => openParameter('new')}
            onNewTemplate={() => openTemplate('new')}
            reloadToken={reloadToken}
          />
        )}
        {tab === 'parameters' && canTargets && (
          <ParametersTab
            canEdit
            onEdit={openParameter}
            onAskDelete={(parameter) => setDeleting({ parameter })}
            editingId={editing.parameter === 'new' ? 'new' : editing.parameter?.code}
            deletingId={deleting.parameter?.code}
            reloadToken={reloadToken}
          />
        )}
        {tab === 'templates' && canTargets && (
          <TemplatesTab
            canEdit
            onEdit={openTemplate}
            onAskDelete={(panel) => setDeleting({ template: panel })}
            targets={targets.data ?? []}
            editingCode={editing.template === 'new' ? 'new' : editing.template?.code}
            deletingCode={deleting.template?.code}
            reloadToken={reloadToken}
          />
        )}
        {tab === 'targets' && canTargets && (
          <TargetsTab
            canEdit
            onEdit={openTarget}
            onAskDelete={(target) => setDeleting({ target })}
            deletingId={deleting.target?.id}
            reloadToken={reloadToken}
          />
        )}
        {tab === 'report-phases' && canTargets && <ReportPhasesTab canEdit />}
        {tab === 'rules' && canAlerts && (
          <AlertRulesTab
            canEdit
            onEdit={openRule}
            onAskDelete={(rule) => setDeleting({ rule })}
            onToggle={async (rule) => {
              try {
                await trackingApi.updateAlertRule(rule.id, {
                  name: rule.name, severity: rule.severity, conditions: rule.conditions,
                  categoryCode: rule.categoryCode, contentCode: rule.contentCode, phases: rule.phases,
                  active: !rule.active,
                })
                rules.reload()
                setReloadToken((token) => token + 1)
              } catch {
                /* silent — toggle is a one-click action with no UI affordance for errors yet */
              }
            }}
            deletingId={deleting.rule?.id}
            reloadToken={reloadToken}
          />
        )}
      </div>

      {editing.parameter !== undefined && (
        <ParameterEditor
          parameter={editing.parameter === 'new' ? undefined : editing.parameter}
          panels={panels.data ?? []}
          onClose={closeAll}
          onSaved={() => { closeAll(); reload() }}
          onOpenTemplate={openTemplate}
        />
      )}
      {editing.template !== undefined && (
        <TemplateEditor
          panel={editing.template === 'new' ? undefined : editing.template}
          parameters={parameters.data ?? []}
          categories={activeCategories}
          onClose={closeAll}
          onSaved={() => { closeAll(); reload() }}
        />
      )}
      {editing.target !== undefined && (
        <TargetEditor
          target={editing.target === 'new' ? undefined : editing.target}
          parameters={parameterInfo.data ?? []}
          categories={activeCategories}
          rules={rules.data ?? []}
          onClose={closeAll}
          onSaved={() => { closeAll(); reload() }}
          onEditRule={openRule}
        />
      )}
      {editing.rule !== undefined && (
        <RuleEditor
          rule={editing.rule === 'new' ? undefined : editing.rule}
          parameters={parameterInfo.data ?? []}
          categories={activeCategories}
          targets={targets.data ?? []}
          onClose={closeAll}
          onSaved={() => { closeAll(); reload() }}
        />
      )}

      {deleting.parameter && (
        <ConfirmDeleteModal
          title="Eliminar parámetro"
          message={buildParameterDeleteMessage(deleting.parameter)}
          confirmLabel="Eliminar parámetro"
          onClose={closeAll}
          onConfirm={async () => {
            await panelsApi.deleteParameter(deleting.parameter!.code); closeAll(); reload()
          }}
        />
      )}
      {deleting.template && (
        <ConfirmDeleteModal
          title="Eliminar plantilla"
          message={buildTemplateDeleteMessage(deleting.template)}
          confirmLabel="Eliminar plantilla"
          onClose={closeAll}
          onConfirm={async () => {
            await panelsApi.deletePanel(deleting.template!.code); closeAll(); reload()
          }}
        />
      )}

      {deleting.target && (
        <ConfirmDeleteModal
          title="Eliminar objetivo analítico"
          message={buildTargetDeleteMessage(deleting.target)}
          confirmLabel="Eliminar objetivo"
          onClose={closeAll}
          onConfirm={async () => {
            await trackingApi.deleteTarget(deleting.target!.id); closeAll(); reload()
          }}
        />
      )}
      {deleting.rule && (
        <ConfirmDeleteModal
          title="Eliminar aviso"
          message={`¿Eliminar el aviso «${deleting.rule.name}»? Dejará de aparecer en el panel «Avisos» del dashboard.`}
          confirmLabel="Eliminar aviso"
          onClose={closeAll}
          onConfirm={async () => {
            await trackingApi.deleteAlertRule(deleting.rule!.id); closeAll(); reload()
          }}
        />
      )}
    </section>
  )
}

function pickInitial(requested: AnaliticaTab, canTargets: boolean, canAlerts: boolean): AnaliticaTab {
  if (requested !== 'overview') return requested
  if (!canTargets && canAlerts) return 'rules'
  if (!canAlerts && canTargets) return 'parameters'
  return 'overview'
}

function buildTargetDeleteMessage(target: TargetView): string {
  const where = [target.categoryName ?? 'todas las categorías', target.phase ? (fermentationLabels[target.phase] ?? target.phase) : 'cualquier fase'].join(' / ')
  return `¿Eliminar el objetivo de ${target.parameterName} (${where})? La matriz y las curvas dejarán de usarlo.`
}

function buildParameterDeleteMessage(parameter: ParameterView): string {
  const pieces = [`${parameter.name} (${parameter.code})`]
  if (parameter.panels > 0) pieces.push(`forma parte de ${parameter.panels} plantilla(s)`)
  return pieces.length === 1
    ? `¿Eliminar el parámetro ${pieces[0]}? No se eliminará el historial de análisis, pero cualquier resultado que lo siga usando bloqueará esta acción.`
    : `¿Eliminar el parámetro ${pieces[0]}? Hoy ${pieces[1]}. Si algún resultado lo sigue usando, el backend rechaza el borrado y tendrás que dejarlo como inactivo.`
}

function buildTemplateDeleteMessage(panel: PanelView): string {
  const pieces = [`${panel.name} (${panel.code})`]
  if (panel.samples > 0) pieces.push(`${panel.samples} análisis ya la han usado`)
  return pieces.length === 1
    ? `¿Eliminar la plantilla ${pieces[0]}? No se eliminarán las asignaciones a tipos de contenido, pero si algún análisis la sigue usando el backend rechaza el borrado y tendrás que dejarla como inactiva.`
    : `¿Eliminar la plantilla ${pieces[0]}? Hoy ${pieces[1]}: el backend rechazará el borrado y tendrás que dejar la plantilla como inactiva.`
}

function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-[12px] font-semibold ${
        active ? 'bg-plum-soft text-plum' : 'border border-border bg-white text-copy hover:bg-plum-soft'
      }`}
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------------------------- editors

function ParameterEditor({ parameter, panels, onClose, onSaved, onOpenTemplate }: {
  parameter?: ParameterView; panels: PanelView[]
  onClose: () => void; onSaved: () => void
  onOpenTemplate: (panel: PanelView) => void
}) {
  const [form, setForm] = useState<ParameterInput>({
    code: parameter?.code ?? '', name: parameter?.name ?? '', unit: parameter?.unit ?? '', decimals: parameter?.decimals ?? 2,
    plausibilityMin: parameter?.plausibilityMin ?? null, plausibilityMax: parameter?.plausibilityMax ?? null,
    description: parameter?.description ?? '', active: parameter?.active ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const parseNumber = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')))

  const usedIn = useMemo(
    () => panels.filter((panel) => panel.parameters.some((p) => p.code === parameter?.code)),
    [panels, parameter?.code],
  )

  const save = async () => {
    setError('')
    if (!form.name.trim()) { setError('Pon un nombre al parámetro.'); return }
    if (!parameter && !(form.code ?? '').trim()) { setError('Pon un código al parámetro.'); return }
    setSaving(true)
    try {
      const body = { ...form, description: form.description?.trim() || null }
      if (parameter) await panelsApi.updateParameter(parameter.code, body)
      else await panelsApi.createParameter({ ...body, code: (form.code ?? '').trim().toUpperCase() })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el parámetro.')
      setSaving(false)
    }
  }

  return (
    <CenteredModal
      open size="sm"
      title={parameter ? parameter.name : 'Nuevo parámetro'}
      subtitle={parameter ? `Código ${parameter.code} · los resultados y avisos lo usan y no se puede cambiar.` : 'Lo usan resultados y avisos: no se puede cambiar después.'}
      primaryLabel={saving ? 'Guardando…' : 'Guardar parámetro'}
      primaryDisabled={saving}
      onPrimary={save}
      onClose={onClose}
    >
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void save() }} className="space-y-3">
        {!parameter && (
          <label className="block text-xs font-semibold">Código *
            <input required value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') })}
              placeholder="ACIDO_TARTARICO" className={`${input} mt-1 font-mono`} />
          </label>
        )}
        <label className="block text-xs font-semibold">Nombre *
          <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={`${input} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold">Unidad
            <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="g/L" className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Decimales
            <input type="number" min={0} max={6} value={form.decimals}
              onChange={(event) => setForm({ ...form, decimals: Number(event.target.value) })} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Mínimo plausible
            <input inputMode="decimal" value={form.plausibilityMin ?? ''}
              onChange={(event) => setForm({ ...form, plausibilityMin: parseNumber(event.target.value) })} className={`${input} mt-1`} />
          </label>
          <label className="block text-xs font-semibold">Máximo plausible
            <input inputMode="decimal" value={form.plausibilityMax ?? ''}
              onChange={(event) => setForm({ ...form, plausibilityMax: parseNumber(event.target.value) })} className={`${input} mt-1`} />
          </label>
        </div>
        <label className="block text-xs font-semibold">Descripción
          <textarea rows={2} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })}
            className={`${input} mt-1`} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
          Activo (se puede añadir a plantillas)
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}

        {parameter && (
          <section className="rounded-xl border border-border bg-[#fdfbfc] p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">Dónde se usa</h3>
            {usedIn.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Aún no forma parte de ninguna plantilla.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {usedIn.map((panel) => (
                  <li key={panel.code} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">
                      <strong className="font-semibold">{panel.name}</strong>
                      <span className="ml-1 font-mono text-[10.5px] text-muted">{panel.code}</span>
                    </span>
                    <button type="button" onClick={() => onOpenTemplate(panel)}
                      className="shrink-0 text-xs font-semibold text-plum">Ir a plantilla →</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </form>
    </CenteredModal>
  )
}

function TemplateEditor({ panel, parameters, categories, onClose, onSaved }: {
  panel?: PanelView; parameters: ParameterView[]
  categories: Array<{ code: string; name: string }>
  onClose: () => void; onSaved: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState(panel?.name ?? '')
  const [description, setDescription] = useState(panel?.description ?? '')
  const [active, setActive] = useState(panel?.active ?? true)
  const [selected, setSelected] = useState<Array<{ code: string; required: boolean }>>(panel?.parameters.map((p) => ({ code: p.code, required: p.required })) ?? [])
  const [assigned, setAssigned] = useState(panel?.categories.map((c) => ({ code: c.code, isDefault: c.isDefault })) ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const byCode = useMemo(() => new Map(parameters.map((p) => [p.code, p])), [parameters])
  const available = parameters.filter((p) => p.active && !selected.some((s) => s.code === p.code))
  const alreadyInTemplate = useMemo(() => new Set(selected.map((s) => s.code)), [selected])

  const move = (index: number, delta: number) => setSelected((list) => {
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(Math.max(0, Math.min(next.length, index + delta)), 0, item)
    return next
  })
  const toggleCategory = (code: string) => setAssigned((list) => list.some((c) => c.code === code)
    ? list.filter((c) => c.code !== code) : [...list, { code, isDefault: false }])
  const toggleDefault = (code: string) => setAssigned((list) => list.map((c) => c.code === code ? { ...c, isDefault: !c.isDefault } : c))

  const save = async () => {
    setError('')
    if (!name.trim()) { setError('Pon un nombre a la plantilla.'); return }
    if (!panel && !code.trim()) { setError('Pon un código a la plantilla.'); return }
    setSaving(true)
    try {
      const target = panel?.code ?? (await panelsApi.createPanel({ code: code.trim().toUpperCase(), name: name.trim(), description: description.trim() || null })).code
      const body: PanelUpdate = { name: name.trim(), description: description.trim() || null, active, parameters: selected, categories: assigned }
      await panelsApi.updatePanel(target, body)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la plantilla.')
      setSaving(false)
    }
  }

  return (
    <CenteredModal
      open size="md"
      title={panel ? `Plantilla ${panel.name}` : 'Nueva plantilla'}
      subtitle={panel && panel.samples > 0
        ? `${panel.samples} análisis usan esta plantilla. Los cambios valen para análisis nuevos; los ya registrados conservan sus resultados.`
        : 'Define qué parámetros se piden para qué tipo de contenido.'}
      primaryLabel={saving ? 'Guardando…' : 'Guardar plantilla'}
      primaryDisabled={saving}
      onPrimary={save}
      onClose={onClose}
    >
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void save() }} className="space-y-4">
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
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Activa (se ofrece al registrar muestras)
        </label>

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
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="checkbox" checked={item.required}
                      onChange={(event) => setSelected((list) => list.map((p) => p.code === item.code ? { ...p, required: event.target.checked } : p))} />
                    Obligatorio
                  </label>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" className="rounded p-1 hover:bg-plum-soft disabled:opacity-30"><ArrowUp className="size-3" /></button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} aria-label="Bajar" className="rounded p-1 hover:bg-plum-soft disabled:opacity-30"><ArrowDown className="size-3" /></button>
                  <button type="button" onClick={() => setSelected((list) => list.filter((p) => p.code !== item.code))} aria-label={`Quitar ${parameter?.name ?? item.code}`} className="rounded p-1 text-muted hover:bg-plum-soft hover:text-plum"><X className="size-3" /></button>
                </li>
              )
            })}
          </ol>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setPickerOpen(true)} disabled={available.length === 0}
              className="flex min-h-9 items-center gap-1 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-plum disabled:cursor-not-allowed disabled:opacity-50">
              <Plus className="size-3.5" />Añadir parámetros
            </button>
            {available.length === 0 && (
              <span className="text-[11px] text-muted">
                Todos los parámetros activos ya forman parte de la plantilla.
              </span>
            )}
          </div>
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}
      </form>

      <ParameterPickerModal
        open={pickerOpen}
        title="Añadir parámetros a la plantilla"
        subtitle="Marca uno o varios parámetros para añadirlos. Aparecerán al final de la lista."
        parameters={parameters}
        exclude={alreadyInTemplate}
        activeOnly
        multiple
        confirmLabel={available.length > 0 ? undefined : undefined}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          const codes = Array.isArray(picked) ? picked : picked ? [picked] : []
          if (codes.length === 0) return
          setSelected((list) => [...list, ...codes.map((code) => ({ code, required: false }))])
        }}
      />
    </CenteredModal>
  )
}

// ------------------------------------------------------------------------------------------- target editor

const TARGET_LIMITS = ['warnMin', 'warnMax', 'critMin', 'critMax'] as const
type TargetLimit = (typeof TARGET_LIMITS)[number]
const TARGET_LIMIT_LABEL: Record<TargetLimit, string> = {
  warnMin: 'Aviso mín.', warnMax: 'Aviso máx.', critMin: 'Crítico mín.', critMax: 'Crítico máx.',
}

function TargetEditor({ target, parameters, categories, rules, onClose, onSaved, onEditRule }: {
  target?: TargetView
  parameters: Array<{ code: string; name: string; unit: string | null }>
  categories: Array<{ code: string; name: string }>
  rules: AlertRule[]
  onClose: () => void; onSaved: () => void
  onEditRule: (rule: AlertRule) => void
}) {
  const [draft, setDraft] = useState<{
    parameter: string; categoryCode: string; phase: string; note: string
    limits: Record<TargetLimit, string>
  }>(() => ({
    parameter: target?.parameter ?? '',
    categoryCode: target?.categoryCode ?? '',
    phase: target?.phase ?? '',
    note: target?.note ?? '',
    limits: {
      warnMin: formatLimitForInput(target?.warnMin), warnMax: formatLimitForInput(target?.warnMax),
      critMin: formatLimitForInput(target?.critMin), critMax: formatLimitForInput(target?.critMax),
    },
  }))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const parseLimit = (text: string): number | null => {
    const clean = text.trim().replace(',', '.')
    if (!clean) return null
    return /^-?\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN
  }

  const save = async () => {
    setError('')
    if (!draft.parameter) { setError('Elige un parámetro.'); return }
    const parsed = Object.fromEntries(TARGET_LIMITS.map((key) => [key, parseLimit(draft.limits[key])])) as Record<TargetLimit, number | null>
    if (TARGET_LIMITS.some((key) => Number.isNaN(parsed[key]))) {
      setError('Los límites deben ser números (admite coma decimal).')
      return
    }
    const body: TargetInput = {
      parameter: draft.parameter,
      categoryCode: draft.categoryCode || null,
      phase: draft.phase || null,
      note: draft.note.trim() || null,
      ...parsed,
    }
    setSaving(true)
    try {
      if (target) await trackingApi.updateTarget(target.id, body)
      else await trackingApi.createTarget(body)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el objetivo.')
      setSaving(false)
    }
  }

  const relatedRules = useMemo(() => {
    if (!draft.parameter) return []
    return rules.filter((rule) => rule.conditions.some((condition) => condition.parameter === draft.parameter))
  }, [rules, draft.parameter])

  return (
    <CenteredModal
      open size="md"
      title={target ? 'Editar objetivo analítico' : 'Nuevo objetivo analítico'}
      subtitle="Aplica el objetivo más específico: categoría+fase > categoría > fase > general."
      primaryLabel={saving ? 'Guardando…' : (target ? 'Guardar cambios' : 'Añadir objetivo')}
      primaryDisabled={saving}
      onPrimary={save}
      onClose={onClose}
    >
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void save() }} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <div className="grid gap-1 text-[11px] font-semibold text-muted">
            Parámetro
            {(() => {
              const selected = draft.parameter ? parameters.find((p) => p.code === draft.parameter) : undefined
              return (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className={`flex min-h-10 items-center justify-between gap-2 rounded-xl border border-border bg-white px-3 py-2 text-left text-xs font-normal ${selected ? 'text-copy' : 'text-muted'}`}
                >
                  <span className="min-w-0 truncate">
                    {selected
                      ? <><strong className="font-semibold">{selected.name}</strong>{selected.unit ? <span className="ml-1 text-muted">({selected.unit})</span> : null}</>
                      : 'Elegir parámetro…'}
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold text-plum">Cambiar</span>
                </button>
              )
            })()}
          </div>
          <label className="grid gap-1 text-[11px] font-semibold text-muted">Categoría
            <select value={draft.categoryCode}
              onChange={(event) => setDraft({ ...draft, categoryCode: event.target.value })}
              className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-xs font-normal text-copy">
              <option value="">Todas</option>
              {categories.map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-muted">Fase de la fermentación
            <select value={draft.phase}
              onChange={(event) => setDraft({ ...draft, phase: event.target.value })}
              className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-xs font-normal text-copy">
              <option value="">Cualquiera</option>
              {Object.entries(fermentationLabels).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TARGET_LIMITS.map((key) => (
            <label key={key} className="grid gap-1 text-[11px] font-semibold text-muted">{TARGET_LIMIT_LABEL[key]}
              <input inputMode="decimal" value={draft.limits[key]}
                onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, [key]: event.target.value } })}
                placeholder="sin límite"
                className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-xs font-normal text-copy" />
            </label>
          ))}
        </div>

        <label className="grid gap-1 text-[11px] font-semibold text-muted">Nota
          <input value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
            className="min-h-10 rounded-xl border border-border bg-white px-3 py-2 text-xs font-normal text-copy" />
        </label>

        <div className="rounded-xl border border-border bg-[#fdfbfc] p-3 text-[11px] leading-5 text-muted">
          <strong className="text-copy">Precedencia.</strong>{' '}
          Sin categoría ni fase → general. Solo categoría → esa categoría en cualquier fase.
          Solo fase → esa fase en cualquier categoría. Categoría + fase → más específico.
        </div>

        {draft.parameter && (
          <section className="rounded-xl border border-border bg-[#fdfbfc] p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Avisos que vigilan este parámetro
            </h3>
            {relatedRules.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                Ningún aviso vigila este parámetro: cualquier valor fuera del rango solo se ve en el panel «Avisos» si defines una regla.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {relatedRules.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate">
                      <strong className="font-semibold">{rule.name}</strong>
                      <span className="ml-1 text-muted">{ruleSeverity(rule.severity)}</span>
                    </span>
                    <button type="button" onClick={() => onEditRule(rule)}
                      className="shrink-0 text-xs font-semibold text-plum">Editar aviso →</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}
      </form>

      <ParameterPickerModal
        open={pickerOpen}
        title={draft.parameter ? 'Cambiar parámetro' : 'Elegir parámetro'}
        subtitle="Solo puedes asignar un parámetro por objetivo: si necesitas varios, crea uno por cada uno."
        parameters={parameters}
        preSelected={draft.parameter ? new Set([draft.parameter]) : undefined}
        activeOnly={false}
        multiple={false}
        confirmLabel="Seleccionar"
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          const code = Array.isArray(picked) ? picked[0] : picked
          if (code) setDraft((current) => ({ ...current, parameter: code }))
        }}
      />
    </CenteredModal>
  )
}

function formatLimitForInput(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',')
}

function ruleSeverity(severity: AlertRule['severity']): string {
  return ({ INFO: 'Informativo', WARN: 'Aviso', CRIT: 'Crítico' } as const)[severity]
}

// --------------------------------------------------------------------------------------------- rule editor

function RuleEditor({ rule, parameters, categories, targets, onClose, onSaved }: {
  rule?: AlertRule
  parameters: Array<{ code: string; name: string }>
  categories: Array<{ code: string; name: string }>
  targets: TargetView[]
  onClose: () => void
  onSaved: () => void
}) {
  const submit = async (input: AlertRuleInput) => {
    if (rule) await trackingApi.updateAlertRule(rule.id, input)
    else await trackingApi.createAlertRule(input)
    onSaved()
  }

  const relatedTargets = useMemo(() => {
    if (!rule) return [] as TargetView[]
    const codes = new Set(rule.conditions.map((c) => c.parameter))
    return targets.filter((t) => codes.has(t.parameter))
  }, [rule, targets])

  return (
    <CenteredModal
      open size="lg"
      title={rule ? `Editar aviso «${rule.name}»` : 'Nuevo aviso'}
      subtitle="Se dispara cuando se cumplen todas las condiciones sobre la última analítica del depósito."
      onClose={onClose}
    >
      <AlertRuleForm
        key={rule ? rule.id : 'new'}
        parameters={parameters as never}
        categories={categories}
        initial={rule}
        contentCode={rule?.contentCode ?? undefined}
        onSave={submit}
        onCancel={onClose}
      />

      {rule && rule.conditions.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-[#fdfbfc] p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Objetivos del parámetro
          </h3>
          {relatedTargets.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              Sin objetivo definido: este aviso no se colorea contra ningún rango, solo dispara por la regla.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {relatedTargets.map((target) => (
                <li key={target.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    <strong className="font-semibold">{target.parameterName}</strong>
                    <span className="ml-1 text-muted">
                      {[target.warnMin !== null && `aviso mín. ${formatLimitForInput(target.warnMin)}`,
                        target.warnMax !== null && `aviso máx. ${formatLimitForInput(target.warnMax)}`,
                        target.critMin !== null && `crítico mín. ${formatLimitForInput(target.critMin)}`,
                        target.critMax !== null && `crítico máx. ${formatLimitForInput(target.critMax)}`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                    <span className="ml-1 text-[10.5px] text-muted">
                      {target.categoryName ? `cat. ${target.categoryName}` : 'todas'} ·{' '}
                      {target.phase ? (fermentationLabels[target.phase] ?? target.phase) : 'cualquier fase'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </CenteredModal>
  )
}

// Avoid unused-import warning
void ({} as AlertCondition)

// --------------------------------------------------------------------------------------------------- shared

function ConfirmDeleteModal({ title, message, confirmLabel, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string
  onClose: () => void; onConfirm: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const confirm = async () => {
    setBusy(true)
    try { await onConfirm() } catch { onClose() }
    finally { setBusy(false) }
  }
  return (
    <CenteredModal
      open size="sm"
      title={title}
      primaryLabel={busy ? 'Eliminando…' : confirmLabel}
      primaryDisabled={busy}
      primaryKind="danger"
      onPrimary={() => { void confirm() }}
      onClose={onClose}
    >
      <p className="text-xs text-[#8e1f33]">{message}</p>
    </CenteredModal>
  )
}

export type { AnaliticaTab }
