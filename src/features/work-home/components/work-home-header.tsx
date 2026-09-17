import { Bell, Search } from 'lucide-react'
import type { CurrentUserProfile } from '../../../services/profile-api'

interface WorkHomeHeaderProps {
  center: string
  campaign: string
  search: string
  onSearchChange: (value: string) => void
  onOpenNotices: () => void
  onOpenProfile: () => void
  searchPlaceholder?: string
  profile?: CurrentUserProfile
}

function initials(profile?: CurrentUserProfile) {
  return [profile?.firstName, profile?.lastName].filter(Boolean).map((value) => value![0]).join('').toUpperCase() || '—'
}

export function WorkHomeHeader({ center, campaign, search, onSearchChange, onOpenNotices, onOpenProfile, searchPlaceholder = 'Buscar depósito, lote o actividad', profile }: WorkHomeHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-[#fdfbfc] px-4 py-3 sm:px-5 lg:px-6">
      <div className="flex min-h-10 items-center gap-2 sm:gap-3">
        <div className="min-w-0 rounded-xl bg-plum-soft px-3 py-2 text-[12px] font-semibold text-plum sm:text-[13px]">{center}</div>
        <div className="hidden rounded-xl border border-[#e0d2d9] px-3 py-2 text-[12px] font-medium text-copy sm:block">{campaign}</div>
        <label className="ml-2 hidden h-10 min-w-0 max-w-[350px] flex-1 items-center gap-2 rounded-xl border border-[#e0d2d9] bg-field px-3 focus-within:border-[#b9899c] focus-within:ring-2 focus-within:ring-[#f3e7ee] lg:flex">
          <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">{searchPlaceholder}</span>
          <input type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-[#7b6d74]" />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onOpenNotices} className="flex h-10 items-center gap-2 rounded-xl border border-[#e0d2d9] px-3 text-[12px] font-semibold transition-colors hover:bg-[#f7f0f4]" aria-label="Abrir avisos, 4 sin leer">
            <Bell className="size-4 text-muted" aria-hidden="true" /><span className="hidden sm:inline">Avisos</span><span className="rounded-full bg-[#f7dadf] px-1.5 py-0.5 font-mono text-[10px] text-[#8e1f33]">4</span>
          </button>
          <button type="button" onClick={onOpenProfile} className="flex size-10 items-center justify-center rounded-xl bg-[#e8dcea] text-xs font-bold text-plum transition-colors hover:bg-[#decbd8]" aria-label={`Abrir perfil de ${profile?.displayName ?? 'usuario'}`}>{profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="size-10 rounded-xl object-cover" /> : initials(profile)}</button>
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
