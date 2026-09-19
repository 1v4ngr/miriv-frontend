import { useEffect, useState } from 'react'

/**
 * Observed width/height of an element (px); 0 until measured. `ref` is a callback ref, so it also works
 * when the element mounts later than the component that owns the hook (e.g. after a loading state).
 */
export function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    if (!element) return
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [element])
  return { ref: setElement, ...size }
}
