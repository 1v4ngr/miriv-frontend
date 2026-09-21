import { useEffect, useState, type RefObject } from 'react'

/**
 * Renders a long, already-loaded list in batches: the next batch is added when the sentinel at the
 * end of the scroll container comes into view. Starts over whenever the list itself changes
 * (a filter or a search), so the user is back at the top of the new results.
 */
export function useIncrementalList<T>(items: T[], root: RefObject<HTMLElement | null>, batch = 30) {
  const [count, setCount] = useState(batch)
  // Kept in state, not a ref: the sentinel only mounts once the data has loaded, and the observer
  // must be attached at that moment.
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    setCount(batch)
    root.current?.scrollTo?.({ top: 0 })
  }, [items, batch, root])

  const hasMore = count < items.length

  useEffect(() => {
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setCount((current) => current + batch)
    }, { root: root.current, rootMargin: '200px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, batch, root, count])

  return { visible: items.slice(0, count), hasMore, sentinel: setSentinel }
}
