import type { ReactNode } from 'react'

/** White block of the home page: title, optional aside (a toggle, a link) and its content. */
export function HomeCard({ title, aside, children, className = '', id }: { title: string; aside?: ReactNode; children: ReactNode; className?: string; /** Anchor to come back to (e.g. from a deposit opened here). */ id?: string }) {
  return (
    <section id={id} className={`flex min-w-0 scroll-mt-4 flex-col rounded-[18px] border border-border bg-white p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex min-h-7 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
