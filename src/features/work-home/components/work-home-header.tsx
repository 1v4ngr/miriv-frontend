import { Bell, Search } from 'lucide-react'
import type { CurrentUserProfile } from '../../../services/profile-api'
import { TopNav, type TopNavProps } from './top-nav'

interface WorkHomeHeaderProps {
  center: string
  campaign: string
  search: string
  onSearchChange: (value: string) => void
  onOpenNotices: () => void
  onOpenProfile: () => void
  searchPlaceholder?: string
  profile?: CurrentUserProfile
  /** Desktop navigation, shown in the middle of the bar. */
  nav?: TopNavProps
}

function initials(profile?: CurrentUserProfile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).map((value) => value![0]).join('').toUpperCase() || '—'
}

export function WorkHomeHeader({ center, campaign, search, onSearchChange, onOpenNotices, onOpenProfile, searchPlaceholder = 'Buscar depósito, lote o actividad', profile, nav }: WorkHomeHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-[#fdfbfc] px-4 py-3 sm:px-5 lg:px-6">
      <div className="flex min-h-10 items-center gap-2 sm:gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="hidden font-mono text-[15px] font-semibold uppercase tracking-wider text-plum lg:inline">MIRIV</span>
          <span className="hidden text-[20px] font-light text-[#d6c8cf] lg:inline" aria-hidden="true">/</span>
          <div className="min-w-0 truncate rounded-xl bg-plum-soft px-3 py-2 text-[12px] font-semibold text-plum sm:text-[13px]">{center}</div>
          <div className="hidden shrink-0 rounded-xl border border-[#e0d2d9] px-3 py-2 text-[12px] font-medium text-copy sm:block lg:hidden 2xl:block">{campaign}</div>
        </div>
        {nav && <TopNav {...nav} />}
        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          <label className="hidden h-10 w-[200px] min-w-0 items-center gap-2 rounded-xl border border-[#e0d2d9] bg-field px-3 focus-within:border-[#b9899c] focus-within:ring-2 focus-within:ring-[#f3e7ee] lg:flex xl:w-[280px]">
            <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
            <span className="sr-only">{searchPlaceholder}</span>
            <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[#7b6d74]" />
          </label>
          <button type="button" onClick={onOpenNotices} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#e0d2d9] px-3 text-[12px] font-semibold transition-colors hover:bg-[#f7f0f4]" aria-label="Abrir avisos, 4 sin leer">
            <Bell className="size-4 text-muted" aria-hidden="true" /><span className="hidden sm:inline lg:hidden">Avisos</span><span className="rounded-full bg-[#f7dadf] px-1.5 py-0.5 font-mono text-[10px] text-[#8e1f33]">4</span>
          </button>
          <button type="button" onClick={onOpenProfile} className="flex shrink-0 items-center gap-2 rounded-xl text-left transition-colors hover:bg-[#f7f0f4] xl:pr-2" aria-label={`Abrir perfil de ${profile?.displayName ?? 'usuario'}`}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#e8dcea] text-xs font-bold text-plum">{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-10 rounded-xl object-cover" /> : initials(profile)}</span>
            <span className="hidden max-w-[140px] xl:block"><span className="block truncate text-[12px] font-semibold text-ink">{profile?.displayName ?? '—'}</span>{profile?.jobTitle && <span className="block truncate text-[10.5px] text-muted">{profile.jobTitle}</span>}</span>
          </button>
        </div>
      </div>
      <label className="mt-3 flex h-10 items-center gap-2 rounded-xl border border-[#e0d2d9] bg-field px-3 focus-within:border-[#b9899c] focus-within:ring-2 focus-within:ring-[#f3e7ee] lg:hidden">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <span className="sr-only">{searchPlaceholder}</span>
        <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[#7b6d74]" />
      </label>
    </header>
  )
}
