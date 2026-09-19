/**
 * Swipe-down-to-close for the bottom sheets that every modal becomes on phones (CSS in index.css).
 *
 * Dragging starts on the top strip of a sheet (grab handle + header). Past a threshold, or on a fast flick, the sheet
 * slides out and the modal's own backdrop handler (mousedown on its wrapper) is triggered, so each modal
 * keeps closing through its normal `onClose`; otherwise it springs back.
 */
const PHONE = '(max-width: 767px)'
const DRAG_ZONE_PX = 72
const START_PX = 8
const CLOSE_DISTANCE_PX = 110
const CLOSE_VELOCITY = 0.6 // px per ms

interface Drag { sheet: HTMLElement; startY: number; startTime: number; dy: number; active: boolean }

const isSheet = (element: Element | null): element is HTMLElement => !!element && element.matches('[role="dialog"][aria-modal="true"]')

/** The full-screen wrapper that owns the backdrop (its mousedown closes the modal). */
function backdropOf(sheet: HTMLElement): HTMLElement | null {
  let node = sheet.parentElement
  while (node && node !== document.body) {
    if (node.className.toString().includes('inset-0')) return node
    node = node.parentElement
  }
  return sheet.parentElement
}

export function installMobileSheets(): void {
  if (typeof window === 'undefined') return
  const phone = window.matchMedia(PHONE)
  let drag: Drag | null = null

  document.addEventListener('touchstart', (event) => {
    if (!phone.matches || event.touches.length !== 1) { drag = null; return }
    const sheet = (event.target as Element).closest('[role="dialog"][aria-modal="true"]')
    if (!isSheet(sheet)) { drag = null; return }
    const touch = event.touches[0]
    if (touch.clientY - sheet.getBoundingClientRect().top > DRAG_ZONE_PX) { drag = null; return }
    drag = { sheet, startY: touch.clientY, startTime: event.timeStamp, dy: 0, active: false }
  }, { passive: true })

  document.addEventListener('touchmove', (event) => {
    if (!drag) return
    const dy = event.touches[0].clientY - drag.startY
    if (!drag.active) {
      if (dy < START_PX) return            // upwards or too small: let the sheet scroll normally
      drag.active = true
      drag.sheet.style.transition = 'none'
    }
    event.preventDefault()                  // the finger drives the sheet, not the page
    drag.dy = Math.max(0, dy)
    drag.sheet.style.transform = `translateY(${drag.dy}px)`
  }, { passive: false })

  const finish = (event: TouchEvent) => {
    if (!drag) return
    const { sheet, dy, active, startTime } = drag
    drag = null
    if (!active) return
    const velocity = dy / Math.max(1, event.timeStamp - startTime)
    sheet.style.transition = 'transform 0.2s ease-out'
    if (dy > CLOSE_DISTANCE_PX || velocity > CLOSE_VELOCITY) {
      sheet.style.transform = 'translateY(100%)'
      window.setTimeout(() => {
        backdropOf(sheet)?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
        // If the modal refused to close, put it back.
        window.setTimeout(() => { if (sheet.isConnected) { sheet.style.transform = ''; sheet.style.transition = '' } }, 250)
      }, 190)
    } else {
      sheet.style.transform = ''
      window.setTimeout(() => { sheet.style.transition = '' }, 220)
    }
  }
  document.addEventListener('touchend', finish)
  document.addEventListener('touchcancel', finish)
}
