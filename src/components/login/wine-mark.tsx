import { useId, type ReactNode } from 'react'

// A calm wave: 40-unit period, low swell; several periods wide so it can slide one period per loop.
const WAVE = 'M-40 0 q10 -1.5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V140 H-40 Z'
const SURFACE = 'M-40 0 q10 -1.5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0'

/** Level (%) a rendered mark shows right now, mid-transition included: lets another mark take over seamlessly. */
export function renderedLevel(svg: SVGSVGElement | null | undefined): number | undefined {
  const group = svg?.querySelector<SVGGElement>('g[data-level]')
  if (!group) return undefined
  const offset = new DOMMatrix(getComputedStyle(group).transform).f
  return Math.max(0, Math.min(100, ((95 - offset) / 88) * 100))
}

/**
 * The "M" mark: a round glass seen from the side, holding wine at `level` %. The letter is the hero and
 * crosses the wine: plum above the surface, light where it is submerged. Few elements on purpose — a white
 * disc, a faint inner glass, the wine with a lighter surface line, one reflection. The level glides when it
 * changes (it rises while signing in) and the surface sways gently; both stop for reduced motion.
 */
export function WineMark({ level, size = 112, levelMs = 1100 }: { level: number; size?: number; /** How long a level change takes. */ levelMs?: number }) {
  const id = useId().replace(/:/g, '')
  // Inner glass spans y 7..93; 0 % sits just below it (no sliver of wave left), 100 % at its top.
  const surfaceY = 95 - 88 * (Math.max(0, Math.min(100, level)) / 100)
  const letter = (fill: string) => <text x="50" y="51.5" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontSize="54" fontWeight="500" fill={fill}>M</text>
  const moving = (content: ReactNode, measured = false) => <g data-level={measured ? '' : undefined} className={`${id}-level`} style={{ transform: `translateY(${surfaceY}px)` }}><g className={`${id}-wave`}>{content}</g></g>

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="MIRIV" className="drop-shadow-[0_18px_28px_rgba(70,40,55,0.16)]">
      <defs>
        <clipPath id={`${id}-glass`}><circle cx="50" cy="50" r="43" /></clipPath>
        {/* A mask, not a clipPath: browsers apply the CSS transforms of the moving wave inside masks. */}
        <mask id={`${id}-wine`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">{moving(<path d={WAVE} fill="#ffffff" />)}</mask>
        <linearGradient id={`${id}-depth`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a2745" /><stop offset="1" stopColor="#5e1429" /></linearGradient>
      </defs>
      <style>{`
        @keyframes ${id}-sway { from { transform: translateX(-40px) } to { transform: translateX(0) } }
        .${id}-wave { animation: ${id}-sway 4.5s linear infinite }
        .${id}-level { transition: transform ${levelMs}ms cubic-bezier(0.22, 1, 0.36, 1) }
        @media (prefers-reduced-motion: reduce) { .${id}-wave { animation: none } .${id}-level { transition: none } }
      `}</style>

      <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#e2d2da" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="43" fill="#fbf7f9" stroke="#efe4ea" strokeWidth="0.6" />
      <g clipPath={`url(#${id}-glass)`}>
        {moving(<><path d={WAVE} fill={`url(#${id}-depth)`} /><path d={SURFACE} fill="none" stroke="#c0607f" strokeWidth="1.4" strokeOpacity="0.9" /></>, true)}
      </g>
      {letter('#6d4656')}
      <g clipPath={`url(#${id}-glass)`}><g mask={`url(#${id}-wine)`}>{letter('#fbf1f5')}</g></g>
      <path d="M21 36 A31 31 0 0 1 37 20" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.9" />
    </svg>
  )
}
