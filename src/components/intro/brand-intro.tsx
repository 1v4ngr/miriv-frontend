import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue } from 'motion/react'
import { WineMark } from '../login/wine-mark'

/** Where the mark (and the name beside/under it) started, in viewport pixels. */
export interface MarkOrigin { x: number; y: number; size: number; /** Wine level it had there (%). */ level?: number; word?: { x: number; y: number; width: number } }

/** `in`: after signing in, login → app. `out`: after signing out, app → login. */
export type BrandDirection = 'in' | 'out'

const SIZE = 150
const TRAVEL_MS = 750
const EASE = [0.22, 1, 0.36, 1] as const
/** Filling (or draining) at the centre follows the mark's level transition; then a short hold before flying on. */
const LEVEL_MS = 1100
const HOLD_MS = 350
/** If the destination has not drawn its mark by then, the mark flies anyway. */
const MAX_WAIT_MS = 4000

// Where each direction lands, which class hides the real destination mark meanwhile, and the wine at each step.
const PLAN = {
  // Signing in keeps whatever the login form poured in on the way, and tops it up at the centre.
  in: { mark: '[data-brand-mark] svg', word: '[data-brand-wordmark]', hide: 'intro-active', travel: null, center: 100 },
  out: { mark: '[data-login-mark] svg', word: '[data-login-wordmark]', hide: 'outro-active', travel: 100, center: 0 },
} as const

function visibleRect(selector: string): DOMRect | null {
  const element = [...document.querySelectorAll<HTMLElement>(selector)].find((node) => node.getBoundingClientRect().width > 0)
  return element?.getBoundingClientRect() ?? null
}

/**
 * The brand hand-over between the login and the app, one piece (mark + name) travelling through the centre:
 *
 * - `in` (signing in): a veil covers the login, the mark leaves its place with the wine the form poured in
 *   (it rises as the credentials are typed), reaches the centre and is topped up there; once the app has drawn its header the veil fades, the mark flies full to the top bar and
 *   the page blocks rise in (`intro-reveal`).
 * - `out` (signing out): a veil covers the app, the full mark leaves the top bar, reaches the centre and
 *   empties there; once the login is drawn the veil fades and the empty mark flies to its place on the login
 *   (an empty glass: not signed in).
 *
 * The real destination mark stays hidden until the travelling one lands on the same pixel.
 */
export function BrandIntro({ from, direction = 'in', onDone }: { from: MarkOrigin | null; direction?: BrandDirection; onDone: () => void }) {
  const plan = PLAN[direction]
  const [level, setLevel] = useState(from?.level ?? (direction === 'in' ? 0 : 100))
  const [levelMs, setLevelMs] = useState(TRAVEL_MS)
  const [leaving, setLeaving] = useState(false)
  const [landed, setLanded] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  // The name travels with the mark: its own position and scale; it fades only if it has nowhere to land.
  const word = useRef<HTMLSpanElement>(null)
  const wordX = useMotionValue(0)
  const wordY = useMotionValue(0)
  const wordScale = useMotionValue(1)
  const wordOpacity = useMotionValue(1)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add(plan.hide)
    const centerX = window.innerWidth / 2 - SIZE / 2
    const centerY = window.innerHeight / 2 - SIZE / 2 - 24
    x.set(from ? from.x : centerX)
    y.set(from ? from.y : centerY)
    scale.set(from ? from.size / SIZE : 0.6)
    const wordWidth = word.current?.offsetWidth ?? 1
    const wordCenterX = window.innerWidth / 2 - wordWidth / 2
    const wordCenterY = centerY + SIZE + 14
    wordX.set(from?.word ? from.word.x : from ? from.x : wordCenterX)
    wordY.set(from?.word ? from.word.y : from ? from.y : wordCenterY)
    wordScale.set(from?.word ? from.word.width / wordWidth : 0.2)
    if (!from?.word) wordOpacity.set(0)

    let cancelled = false
    const travel = { duration: TRAVEL_MS / 1000, ease: EASE }
    const toCenter = [animate(x, centerX, travel), animate(y, centerY, travel), animate(scale, 1, travel),
      animate(wordX, wordCenterX, travel), animate(wordY, wordCenterY, travel), animate(wordScale, 1, travel), animate(wordOpacity, 1, travel)]
    if (plan.travel !== null) requestAnimationFrame(() => setLevel(plan.travel))
    const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
    const destination = async () => {
      const started = performance.now()
      while (!cancelled && !visibleRect(plan.mark) && performance.now() - started < MAX_WAIT_MS) await new Promise((resolve) => requestAnimationFrame(resolve))
      return visibleRect(plan.mark)
    }

    void (async () => {
      await Promise.all(toCenter)
      if (cancelled) return
      setLevelMs(LEVEL_MS)
      setLevel(plan.center)
      await pause(LEVEL_MS + HOLD_MS)
      const landing = await destination()
      if (cancelled) return
      setLeaving(true)
      if (direction === 'in') root.classList.add('intro-reveal')
      const fly = { duration: 0.8, ease: EASE }
      const wordLanding = visibleRect(plan.word)
      if (wordLanding) {
        animate(wordX, wordLanding.x, fly); animate(wordY, wordLanding.y, fly); animate(wordScale, wordLanding.width / wordWidth, fly)
      } else {
        // No name at the destination (the phone top bar): it melts into the mark on the way.
        animate(wordX, landing ? landing.x : centerX, fly); animate(wordY, landing ? landing.y : centerY, fly); animate(wordScale, 0.2, fly)
        animate(wordOpacity, 0, { duration: 0.45, ease: 'easeOut' })
      }
      const size = landing ? landing.width : SIZE * 0.2
      animate(scale, size / SIZE, fly)
      animate(x, landing ? landing.x : centerX + SIZE * 0.4, fly)
      await animate(y, landing ? landing.y : centerY + SIZE * 0.4, fly)
      if (cancelled) return
      root.classList.remove(plan.hide)
      setLanded(true)
      await pause(900)
      root.classList.remove('intro-reveal')
      onDone()
    })()

    return () => {
      cancelled = true
      toCenter.forEach((control) => control.stop())
      root.classList.remove(plan.hide, 'intro-reveal')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
      <motion.div className="absolute inset-0 bg-[linear-gradient(150deg,#f7f0f4_0%,#f2eef1_45%,#efe9f0_100%)]"
        initial={{ opacity: 0 }} animate={{ opacity: leaving ? 0 : 1 }} transition={{ duration: leaving ? 0.55 : 0.5, ease: 'easeOut' }} />
      <motion.div className="absolute left-0 top-0 origin-top-left" style={{ x, y, scale, width: SIZE, height: SIZE, opacity: landed ? 0 : 1 }}>
        <WineMark level={level} size={SIZE} levelMs={levelMs} />
      </motion.div>
      <motion.span ref={word} className="absolute left-0 top-0 inline-block origin-top-left whitespace-nowrap font-display text-[34px] font-medium leading-none tracking-[0.22em] text-[#3d2f36]"
        style={{ x: wordX, y: wordY, scale: wordScale, opacity: landed ? 0 : wordOpacity }}>
        MIRIV
      </motion.span>
    </div>
  )
}
