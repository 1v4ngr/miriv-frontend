export type Period = '7' | '30' | '90' | 'all'
export type Mode = 'overlay' | 'grid'
export type Axis = 'date' | 'days'

export interface Favorite {
  name: string
  contents: string[]
  parameters: string[]
  period: Period
  mode: Mode
  axis: Axis
}

const KEY = 'miriv:tracking-favorites'

/** Saved comparisons live only in this browser; every access is guarded because storage can be blocked. */
export function loadFavorites(): Favorite[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === 'string' && Array.isArray(item.contents) && Array.isArray(item.parameters)) : []
  } catch {
    return []
  }
}

export function saveFavorites(favorites: Favorite[]) {
  try { localStorage.setItem(KEY, JSON.stringify(favorites)) } catch { /* private mode or blocked storage: the list just won't persist */ }
}
