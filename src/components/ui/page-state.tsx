import { AlertCircle, RefreshCw, SearchX } from 'lucide-react'

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return <p className="flex items-center justify-center gap-2 p-6 text-center text-xs text-muted"><RefreshCw className="size-4 animate-spin" />{label}</p>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-[#f0d9de] bg-white p-6 text-center text-sm text-[#8e1f33]"><AlertCircle className="mx-auto mb-2 size-5" />{message}{onRetry && <button type="button" onClick={onRetry} className="mt-3 block w-full text-xs font-semibold text-plum underline">Reintentar</button>}</div>
}

export function NotFoundState({ label, onBack }: { label: string; onBack?: () => void }) {
  return <div className="rounded-2xl border border-border bg-white p-6 text-center text-sm text-copy"><SearchX className="mx-auto mb-2 size-5 text-muted" />{label}{onBack && <button type="button" onClick={onBack} className="mt-3 block w-full text-xs font-semibold text-plum underline">Volver</button>}</div>
}

export function EmptyState({ label }: { label: string }) {
  return <p className="rounded-2xl border border-border bg-white p-8 text-center text-xs text-muted">{label}</p>
}