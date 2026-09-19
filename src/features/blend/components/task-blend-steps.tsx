import { useState } from 'react'
import { Check } from 'lucide-react'
import { useCan } from '../../../hooks/use-permissions'
import { cellarApi } from '../../cellar/services/cellar-api'
import { parseBlendSteps } from '../task-steps'

interface Props { description: string | null | undefined; onNavigate: (path: string) => void }

/** Steps of a blend task: each planned transfer can be executed here, after confirming. */
export function TaskBlendSteps({ description, onNavigate }: Props) {
  const parsed = parseBlendSteps(description)
  const canExecute = useCan('MOVEMENT_REGISTER')
  const [done, setDone] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  if (parsed.steps.length === 0) return null

  const execute = async (code: string, label: string) => {
    if (!confirm(`¿Ejecutar ahora el movimiento previsto? ${label}\nSe moverá el vino y no se puede deshacer.`)) return
    setBusy(code); setError('')
    try { await cellarApi.executeMovement(code); setDone((current) => ({ ...current, [code]: 'Ejecutado' })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido ejecutar el movimiento.') }
    finally { setBusy('') }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-4" aria-label="Pasos de la mezcla">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Pasos de la mezcla</h2>
        {parsed.blendId && <button type="button" onClick={() => onNavigate(`blend/${parsed.blendId}`)} className="text-xs font-semibold text-plum underline">Ver simulación</button>}
      </div>
      {error && <p role="alert" className="mt-2 rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}
      <ol className="mt-3 space-y-2">
        {parsed.steps.map((step) => (
          <li key={step.step} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-xs">
            <span className="flex size-5 items-center justify-center rounded-full bg-plum-soft text-[10px] font-semibold text-plum">{step.step}</span>
            {step.kind === 'transfer' ? (
              <>
                <span className="min-w-0 flex-1">Trasegar <strong>{step.liters} L</strong> de {step.source} ({step.content}) → {step.destination} <span className="text-muted">(autorizar mezcla)</span></span>
                {step.movementCode && done[step.movementCode] && <span className="flex items-center gap-1 font-semibold text-[#1f5c3a]"><Check className="size-3.5" />{done[step.movementCode]}</span>}
                {step.movementCode && !done[step.movementCode] && (
                  <button type="button" disabled={!canExecute || busy === step.movementCode} onClick={() => execute(step.movementCode!, `${step.liters} L de ${step.source} → ${step.destination}`)}
                    title={canExecute ? undefined : 'Necesitas el permiso para registrar movimientos'} className="rounded-xl bg-plum px-3 py-1.5 font-semibold text-white disabled:opacity-50">{busy === step.movementCode ? 'Ejecutando…' : 'Ejecutar movimiento previsto'}</button>
                )}
                {!step.movementCode && <button type="button" onClick={() => onNavigate(`deposits/${encodeURIComponent(step.source)}/movement`)} className="font-semibold text-plum underline">Abrir asistente</button>}
              </>
            ) : <span className="min-w-0 flex-1">Añadir {step.text} tras la mezcla</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[11px] text-muted">Ejecuta los traslados en orden y, al terminar, las adiciones. Después completa la tarea con una muestra de la mezcla.</p>
    </section>
  )
}
