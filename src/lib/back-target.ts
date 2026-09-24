/**
 * Where "Volver" should take the user when a page was opened from somewhere other than its own list
 * (e.g. a deposit opened from the home map goes back to the home, scrolled to the map).
 */
export interface BackTarget {
  /** Route to return to (hash without #). */
  route: string
  /** Text of the back link ("Volver a inicio"). */
  label: string
  /** id of the element to scroll to once the route is shown. */
  anchor?: string
}

let pending: { forRoute: string; target: BackTarget } | undefined

/** Remembers where to go back to from `forRoute` (the page about to be opened). */
export function setBackTarget(forRoute: string, target: BackTarget) {
  pending = { forRoute, target }
}

/** The back target of `route`, if that page was opened with one. */
export function backTargetFor(route: string): BackTarget | undefined {
  return pending?.forRoute === route ? pending.target : undefined
}

/** Scrolls to `anchor` as soon as it exists (the destination may still be loading), for a few seconds at most. */
export function scrollToAnchor(anchor: string) {
  const started = performance.now()
  const look = () => {
    const element = document.getElementById(anchor)
    if (element) { element.scrollIntoView({ behavior: 'smooth', block: 'start' }); return }
    if (performance.now() - started < 4000) requestAnimationFrame(look)
  }
  requestAnimationFrame(look)
}
