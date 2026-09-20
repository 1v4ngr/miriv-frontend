import { useEffect, useState } from 'react'

/** Phones: the breakpoint the app's bottom-sheet CSS uses (index.css, lib/mobile-sheets.ts). */
export const PHONE_QUERY = '(max-width: 767px)'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}
