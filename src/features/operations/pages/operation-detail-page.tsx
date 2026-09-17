import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'

interface Props { id: string; onBack: () => void; onOpenContent: (code: string) => void }

const card = 'rounded-2xl border border-border bg-white p-4 sm:p-5'

export function OperationDetailPage({ id, onBack, onOpenContent }: Props) {
  const [notice, setNotice] = useState('')
  return <div className="mx-auto max-w-6xl space-y-4 pb-6">
    <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum"><ArrowLeft className="size-4" />Volver a actividad</button>
    <header className={card}><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h1 className="font-mono text-[22px] font-semibold">{id}</h1><span className="rounded-full bg-[#e8dcea] px-2.5 py-1 text-[11px] font-semibold text-[#55345f]">Sulfitado</span><span className="rounded-full bg-[#f5eed0] px-2.5 py-1 text-[11px] font-medium text-[#6b5a10]">Ejecutada con desviación</span></div><p className="mt-2 text-xs text-copy">Contenido <button onClick={() => onOpenContent('C-2026-114')} className="font-mono text-plum underline">C-2026-114</button> · DEP-014 · responsable María Solana</p></div></div></header>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
      <div className="space-y-4">
        <section className={card}><h2 className="text-sm font-semibold">Instrucción</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Producto" value="Metabisulfito potásico" /><Field label="Cantidad prevista" value="120 g" mono /><Field label="Volumen tratado" value="18.400 L" mono /></div><p className="mt-3 text-[11.5px] text-muted">Prevista por María Solana · 15 sep 17:00</p></section>

        <section className="rounded-2xl border border-[#f0d9de] bg-white p-4 sm:p-5"><h2 className="text-sm font-semibold">Ejecución real</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Cantidad real" value="105 g" mono tone="critical" /><Field label="Diferencia" value="−15 g" mono tone="critical" /><Field label="Ejecutada" value="16 sep 08:30" mono /></div><div className="mt-3"><p className="text-[12px] font-semibold text-copy">Motivo de la diferencia</p><p className="mt-1 text-[13px] leading-5">Stock disponible en bodega inferior al calculado; se completará en el próximo control posterior.</p></div></section>

        <section className={card}><h2 className="text-sm font-semibold">Control posterior</h2><div className="mt-3 flex items-center gap-2 rounded-xl bg-[#f5eed0] px-3 py-2.5 text-xs text-[#6b5a10]"><span className="size-1.5 shrink-0 rounded-full bg-current" />Pendiente: verificar sulfuroso libre tras la corrección de cantidad.</div><button onClick={() => setNotice('Control posterior añadido en la demostración.')} className="mt-3 min-h-9 rounded-xl bg-plum-soft px-3 text-xs font-semibold text-plum">Añadir control posterior</button></section>
      </div>

      <aside className="space-y-4">
        <section className={card}><h2 className="text-sm font-semibold">Ubicación en la ejecución</h2><p className="mt-2 text-xs text-copy">DEP-014 coincide con el lugar previsto. Ningún trasiego intermedio desde el registro.</p></section>
        <section className={card}><h2 className="text-sm font-semibold">Analíticas posteriores</h2><p className="mt-2 text-xs text-copy">Sulfuroso libre — última toma 14 sep, previa a la corrección de cantidad.</p><button onClick={() => setNotice('Curva de sulfuroso libre pendiente de datos posteriores a la corrección.')} className="mt-2 text-xs font-semibold text-plum">Ver curva</button></section>
        <div className="space-y-2"><button onClick={() => setNotice('Edición del registro pendiente en la demostración.')} className="min-h-11 w-full rounded-xl bg-plum text-sm font-semibold text-white">Editar registro</button><button onClick={() => onOpenContent('C-2026-114')} className="min-h-11 w-full rounded-xl border border-border text-sm font-semibold">Ver contenido C-2026-114</button></div>
      </aside>
    </div>
    {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}
  </div>
}

function Field({ label, value, mono, tone }: { label: string; value: string; mono?: boolean; tone?: 'critical' }) {
  return <div className="flex flex-col gap-1"><span className="text-[11.5px] text-muted">{label}</span><span className={`text-[14px] ${mono ? 'font-mono' : ''} ${tone === 'critical' ? 'text-[#8e1f33]' : ''}`}>{value}</span></div>
}
