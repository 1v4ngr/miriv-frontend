import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** Below lg the app shows a fixed bottom navigation (mobile-bottom-nav.tsx): the list must end above it. */
const MOBILE_NAV_QUERY = '(max-width: 1023px)'
const MOBILE_NAV_HEIGHT = 96
/** Matches the shell's bottom padding on desktop (lg:pb-8), so the page ends exactly at the window. */
const DESKTOP_GAP = 32
const MIN_HEIGHT = 260

/**
 * Height that makes an element end exactly at the bottom of the viewport, so the page itself never
 * scrolls and the element scrolls inside. Recomputed on resize and whenever the content above it
 * changes size (filters wrapping to a second line, a banner appearing…).
 */
export function useFitHeight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [height, setHeight] = useState<number>()

  const measure = useCallback(() => {
    const element = ref.current
    if (!element) return
    const top = element.getBoundingClientRect().top + window.scrollY
    const gap = window.matchMedia(MOBILE_NAV_QUERY).matches ? MOBILE_NAV_HEIGHT : DESKTOP_GAP
    const next = Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - top - gap))
    setHeight((current) => (current === next ? current : next))
  }, [])

  useLayoutEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    // The element's own height changes are ignored by measure() (it only reads its top), so observing
    // the whole document cannot loop; it catches layout shifts above the list.
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
    observer?.observe(document.documentElement)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [measure])

  // Callback ref: measure as soon as the element mounts (it may appear after data loads).
  const setRef = useCallback((element: T | null) => {
    ref.current = element
    if (element) measure()
  }, [measure])

  return { ref: setRef, element: ref, height }
}
