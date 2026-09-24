import { useId } from 'react'
import { wineColor } from '../deposit-badges'

// Winery tank in a 100 × 112 box: rounded shoulders, cylindrical body, sloped bottom to a centre outlet.
const OUTLINE = 'M14 26 C14 17 30 13 50 13 C70 13 86 17 86 26 V82 C86 85 84 86 82 87 L56 95 C52 96 48 96 44 95 L18 87 C16 86 14 85 14 82 Z'
const CUT_X = 50
const LEVEL_TOP = 17 // y of a 100 % full tank
const LEVEL_BOTTOM = 95 // y of an empty one
// One wave period is 32 units; the path is several periods wide and slides one period per loop.
export const WAVE = 'M-32 0 q8 -2.2 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 V140 H-32 Z'
const STROKE = '#8f7d86'
const STEEL = '#f3eef1'
const DIMPLES = Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 }, (_, col) => [18 + col * 6 + (row % 2) * 3, 38 + row * 5])).flat()

/**
 * A stainless winery tank cut in half: the left half is the outside (steel, dimpled cooling jacket, manway
 * door, level tube), the right half shows the inside with the wine at its real level, gently moving. Pure
 * SVG so it stays crisp at any size and matches the line icons of the app; motion stops for people who
 * prefer reduced motion.
 */
export function TankLevel({ percent, category, className = 'h-24 w-[86px]', still = false }: { percent: number; category?: string | null; className?: string; /** No wave: for many small tanks at once. */ still?: boolean }) {
  const id = useId().replace(/:/g, '')
  const level = Math.max(0, Math.min(100, percent))
  const liquid = wineColor(category)
  const surfaceY = LEVEL_BOTTOM - (LEVEL_BOTTOM - LEVEL_TOP) * (level / 100)
  const tubeY = Math.max(24, Math.min(80, surfaceY))

  return (
    <svg viewBox="0 0 100 112" className={className} role="img" aria-label={`Depósito al ${Math.round(level)} %`}>
      <defs>
        <clipPath id={`${id}-tank`}><path d={OUTLINE} /></clipPath>
        <clipPath id={`${id}-cut`}><rect x={CUT_X} y="0" width="50" height="112" /></clipPath>
        <clipPath id={`${id}-shell`}><rect x="0" y="0" width={CUT_X} height="112" /></clipPath>
      </defs>
      <style>{`
        @keyframes ${id}-wave { from { transform: translateX(-32px) } to { transform: translateX(0) } }
        .${id}-wave { animation: ${still ? 'none' : `${id}-wave 3.4s linear infinite`} }
        .${id}-level { transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1) }
        @media (prefers-reduced-motion: reduce) { .${id}-wave { animation: none } .${id}-level { transition: none } }
      `}</style>

      {/* Tapered legs and the outlet pipe with its valve */}
      <g fill={STEEL} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round">
        <path d="M19 86 L27 89 L25 106 H20 Z" />
        <path d="M81 86 L73 89 L75 106 H80 Z" />
        <path d="M46 95 H54 L53 108 H47 Z" />
      </g>
      <path d="M50 96 V99 Q50 102 54 102 H62" fill="none" stroke={STROKE} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="64" cy="102" r="2" fill={STEEL} stroke={STROKE} strokeWidth="1.3" />

      {/* Level tube on the side: glass with the wine at the same height */}
      <rect x="7" y="24" width="3.5" height="56" rx="1.75" fill="#fdfbfc" stroke={STROKE} strokeWidth="1.1" />
      <rect x="7.6" y={tubeY} width="2.3" height={Math.max(0, 79.4 - tubeY)} rx="1.1" fill={liquid} opacity="0.85" className={`${id}-level`} />
      <path d="M10.5 27 H14 M10.5 77 H14" stroke={STROKE} strokeWidth="1.1" />

      {/* Outside half: steel shell, dimpled cooling jacket, manway door, a highlight */}
      <g clipPath={`url(#${id}-shell)`}>
        <path d={OUTLINE} fill={STEEL} />
        <g clipPath={`url(#${id}-tank)`}>
          <rect x="0" y="34" width={CUT_X} height="22" fill="#e9e1e5" />
          <path d="M0 34 H50 M0 56 H50" stroke="#d6c9cf" strokeWidth="0.8" />
          {DIMPLES.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.9" fill="#cdbfc6" />)}
          <path d="M20 20 V80" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        </g>
        <rect x="24" y="63" width="17" height="12" rx="3.5" fill="#faf7f8" stroke={STROKE} strokeWidth="1.2" />
        <rect x="27" y="66" width="11" height="6" rx="2" fill="none" stroke="#b9a9b1" strokeWidth="0.9" />
      </g>

      {/* Inside half: wall, graduation and the wine */}
      <g clipPath={`url(#${id}-cut)`}>
        <path d={OUTLINE} fill="#fdfbfc" />
        <g clipPath={`url(#${id}-tank)`}>
          <g className={`${id}-level`} style={{ transform: `translateY(${surfaceY}px)` }}>
            <path className={`${id}-wave`} d={WAVE} fill={liquid} opacity="0.92" />
            <path className={`${id}-wave`} d={WAVE} fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" />
          </g>
          <path d={OUTLINE} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" />
        </g>
        <g stroke="#b9a9b1" strokeWidth="1" strokeLinecap="round">
          {[0.25, 0.5, 0.75].map((mark) => { const y = LEVEL_BOTTOM - (LEVEL_BOTTOM - LEVEL_TOP) * mark; return <path key={mark} d={`M80 ${y} H85`} /> })}
        </g>
      </g>

      {/* Top manway, outline and the section line of the cut */}
      <path d="M43 13 V9.5 Q43 8 44.5 8 H55.5 Q57 8 57 9.5 V13" fill={STEEL} stroke={STROKE} strokeWidth="1.3" strokeLinejoin="round" />
      <path d={OUTLINE} fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={`M${CUT_X} 13 V95.7`} stroke={STROKE} strokeWidth="1.3" />
    </svg>
  )
}
