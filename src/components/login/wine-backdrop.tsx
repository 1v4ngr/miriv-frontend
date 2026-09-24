import { lazy, Suspense, useEffect, useState } from 'react'

// The shader library loads after the form: the login is usable before the background appears.
const MeshGradient = lazy(() => import('@paper-design/shaders-react').then((module) => ({ default: module.MeshGradient })))

// Pale wine on paper: cream, blush rosé, soft plum and a hint of old gold.
const COLORS = ['#f8f1f4', '#efd6df', '#dcb0c1', '#c28ba2', '#f0dfc4']

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/**
 * "Wine on paper": a very slow, low-contrast mesh gradient in pale wine tones with a fine grain, filling the
 * screen behind the login. Still for people who prefer reduced motion, slower on phones; the library itself
 * pauses it when the tab is hidden or it leaves the screen. The static gradient underneath shows meanwhile.
 */
export function WineBackdrop() {
  const reduced = usePrefersReducedMotion()
  const phone = window.matchMedia?.('(max-width: 639px)').matches ?? false
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 bg-[linear-gradient(150deg,#f7f0f4_0%,#f2eef1_45%,#efe9f0_100%)]" aria-hidden="true">
      <Suspense fallback={null}>
        <MeshGradient colors={COLORS} distortion={0.85} swirl={0.35} grainMixer={0.12} grainOverlay={0.08}
          speed={reduced ? 0 : phone ? 0.08 : 0.14} maxPixelCount={phone ? 700_000 : 2_400_000}
          className="absolute inset-0 animate-[backdrop-in_1.2s_ease-out_both]" style={{ width: '100%', height: '100%' }} />
      </Suspense>
      {/* A soft veil keeps the gradient behind the card quiet and the text readable. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,255,255,0.55),rgba(255,255,255,0)_60%)]" />
    </div>
  )
}
