import { ShieldAlert } from 'lucide-react'

export function ForbiddenPage() {
  return (
    <main role="alert" className="mx-auto mt-20 max-w-md rounded-2xl border border-[#f0d9de] bg-white p-8 text-center shadow-sm">
      <ShieldAlert className="mx-auto mb-4 size-10 text-[#8e1f33]" />
      <h1 className="text-lg font-semibold text-copy">No tienes permiso para acceder a esta sección.</h1>
      <p className="mt-2 text-sm text-muted">
        Si necesitas esta funcionalidad, pide a un administrador que te asigne el permiso correspondiente.
      </p>
      <a href="/" className="mt-6 inline-block rounded-lg bg-plum px-4 py-2 text-sm font-semibold text-white">Volver al inicio</a>
    </main>
  )
}