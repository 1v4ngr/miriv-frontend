import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders outside the panel: react-grid-layout positions panels with CSS transforms, which turn
 * `position: fixed` inside them into "relative to the panel". Inside the fullscreen element when there is one.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => { setHost((document.fullscreenElement as HTMLElement | null) ?? document.body) }, [])
  return host ? createPortal(children, host) : null
}
