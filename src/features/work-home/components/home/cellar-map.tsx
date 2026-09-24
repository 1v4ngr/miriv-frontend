import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, defaultDropAnimationSideEffects, pointerWithin, rectIntersection,
  useDraggable, useDroppable, useSensor, useSensors, type Announcements, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent, type DropAnimation,
} from '@dnd-kit/core'
import { LayoutGroup, motion } from 'motion/react'
import { Move } from 'lucide-react'
import { useCan } from '../../../../hooks/use-permissions'
import { Toast, type ToastMessage } from '../../../../components/ui/toast'
import { TankLevel } from '../../../cellar/components/deposit-detail/tank-level'
import { LocationIcon, locationKey, locationOrder } from '../../../cellar/components/deposit-badges'
import { cellarApi } from '../../../cellar/services/cellar-api'
import type { Deposit } from '../../../cellar/types'
import { activeOccupation } from '../../../cellar/utils'
import { HomeCard } from './home-card'

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
/** Tanks per zone shown on phones before "+N" (the whole map is a long scroll on a small screen). */
const PHONE_PREVIEW = 12
const NO_ZONE = ''

// Overlay lands with a short ease; the tank left behind stays faint until then.
const dropAnimation: DropAnimation = {
  duration: 220,
  easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.25' } } }),
}

// The zone under the finger or cursor wins; overlap with the lifted tank only decides for the keyboard.
const collisionDetection: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length ? underPointer : rectIntersection(args)
}

function fillOf(deposit: Deposit) {
  const occupation = activeOccupation(deposit)
  return occupation ? Math.round(occupation.volumeLiters / deposit.capacityLiters * 100) : 0
}

/** The tank drawing with its code: the same look in the grid and floating under the finger. */
function TankFace({ deposit, lifted = false }: { deposit: Deposit; lifted?: boolean }) {
  const occupation = activeOccupation(deposit)
  return (
    <span className={`flex flex-col items-center rounded-xl py-1 ${lifted ? 'bg-white px-1.5 shadow-[0_14px_28px_rgba(46,38,42,0.22)] ring-1 ring-[#e3cdd8]' : ''}`}>
      <TankLevel percent={fillOf(deposit)} category={occupation?.category} still className="h-10 w-9" />
      <span className={`mt-0.5 max-w-full truncate font-mono text-[9.5px] ${lifted ? 'font-semibold text-plum' : 'text-muted group-hover:text-plum'}`}>{deposit.code}</span>
    </span>
  )
}

function DraggableTank({ deposit, canMove, justMoved, onOpen }: { deposit: Deposit; canMove: boolean; justMoved: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deposit.id, disabled: !canMove, data: { deposit } })
  const occupation = activeOccupation(deposit)
  return (
    // Neighbours glide to their new place when a tank leaves or arrives; a tank that just arrived pops in.
    <motion.div layout="position" transition={{ type: 'spring', stiffness: 500, damping: 38 }}
      initial={justMoved ? { scale: 0.5, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }}>
      <button ref={setNodeRef} type="button" onClick={onOpen} {...listeners} {...attributes}
        title={`${deposit.code} · ${occupation ? `${occupation.category ?? 'Sin categoría'} · ${fillOf(deposit)} %` : 'Vacío'}${canMove ? ' · arrastra para cambiar de zona' : ''}`}
        aria-roledescription={canMove ? 'depósito arrastrable' : undefined}
        className={`group w-full touch-manipulation select-none rounded-xl outline-none transition-[opacity,transform,background-color] duration-500 hover:bg-[#f7f1f4] focus-visible:ring-2 focus-visible:ring-[#e3cdd8] ${canMove ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'scale-95 opacity-25' : ''} ${justMoved ? 'bg-plum-soft' : ''}`}
        style={{ WebkitTouchCallout: 'none' }}>
        <TankFace deposit={deposit} />
      </button>
    </motion.div>
  )
}

function ZoneDrop({ zone, items, dragging, fromZone, expanded, onExpand, children }: { zone: string; items: number; dragging: boolean; fromZone: string | null; expanded: boolean; onExpand: () => void; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `zone:${zone}`, data: { zone } })
  const target = dragging && fromZone !== zone
  return (
    // Each zone asks for room in proportion to its tanks: a big zone spans the row, small ones share it.
    <motion.section layout="position" ref={setNodeRef} aria-label={`Zona ${zone || 'sin zona'}`} style={{ flex: `1 1 ${Math.max(240, items * 50 + 40)}px` }}
      className={`relative min-w-0 rounded-2xl border p-2.5 transition-[background-color,border-color,box-shadow] duration-200 sm:p-3 ${
        isOver && target ? 'border-plum/50 bg-plum-soft/70 shadow-[inset_0_0_0_1px_rgba(109,70,86,0.25)]' : target ? 'border-dashed border-[#d6c1cc] bg-[#fdfbfc]' : 'border-transparent'}`}>
      <p className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-muted"><LocationIcon zone={zone} />{zone || 'Sin zona'}<span className="font-mono font-normal">{items}</span>
        {isOver && target && <span className="ml-auto text-[10.5px] font-semibold text-plum">Soltar en {zone || 'sin zona'}</span>}
      </p>
      {items === 0
        ? <div className={`flex h-16 items-center justify-center rounded-xl border border-dashed text-[11.5px] transition-colors ${isOver && target ? 'border-plum/50 text-plum' : 'border-[#e0d2d9] text-muted'}`}>{dragging ? 'Suelta aquí' : 'Sin depósitos'}</div>
        : children}
      {/* Stays while dragging: nothing may change size under the finger. */}
      {!expanded && items > PHONE_PREVIEW && <button type="button" onClick={onExpand} className="mt-2 h-9 w-full rounded-xl border border-border text-[12px] font-semibold text-plum sm:hidden">Ver los {items}</button>}
    </motion.section>
  )
}

/**
 * Every tank of the cellar, grouped by zone (every zone of the center, empty ones included). With
 * DEPOSIT_MANAGE a tank can be dragged to another zone: mouse after a small move (a click still opens the
 * deposit), touch after a short press (so the page still scrolls), keyboard with Space and the arrows.
 * The move is saved at once and can be undone from the message that follows.
 */
export function CellarMap({ deposits, zones: centerZones = [], onOpenDeposit }: { deposits: Deposit[]; zones?: string[]; onOpenDeposit: (code: string) => void }) {
  const canMove = useCan('DEPOSIT_MANAGE')
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [activeId, setActiveId] = useState<string | null>(null)
  // Over another zone the overlay just vanishes on drop (the tank pops in at its new place); elsewhere it glides back.
  const [overOtherZone, setOverOtherZone] = useState(false)
  const [justMoved, setJustMoved] = useState<string | null>(null)
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const dismiss = useCallback(() => setToast(null), [])
  // The tint on a tank that just arrived fades after a moment.
  useEffect(() => { if (!justMoved) return; const timer = window.setTimeout(() => setJustMoved(null), 1500); return () => window.clearTimeout(timer) }, [justMoved])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  )

  const placed = useMemo(() => deposits.map((deposit) => (deposit.id in overrides ? { ...deposit, zone: overrides[deposit.id] } : deposit)), [deposits, overrides])
  const zones = useMemo(() => {
    const names = new Set<string>([...centerZones, ...placed.map((deposit) => deposit.zone ?? NO_ZONE)])
    const order = (zone: string) => { const index = locationOrder.indexOf(locationKey(zone)); return zone === NO_ZONE ? 99 : index === -1 ? locationOrder.length : index }
    return [...names].sort((a, b) => order(a) - order(b) || collator.compare(a, b))
      .map((zone) => ({ zone, items: placed.filter((deposit) => (deposit.zone ?? NO_ZONE) === zone).sort((a, b) => collator.compare(a.code, b.code)) }))
  }, [placed, centerZones])

  const active = activeId ? placed.find((deposit) => deposit.id === activeId) : undefined
  const fromZone = active ? active.zone ?? NO_ZONE : null

  const save = async (deposit: Deposit, zone: string, previous: string, undo = false) => {
    setOverrides((current) => ({ ...current, [deposit.id]: zone }))
    setJustMoved(deposit.id)
    try {
      await cellarApi.updateDeposit(deposit.code, { zone, position: deposit.position, capacityLiters: deposit.capacityLiters, material: deposit.material, refrigerated: deposit.refrigerated })
      setToast({ id: Date.now(), text: undo ? <><b className="font-mono">{deposit.code}</b> vuelve a {zone}</> : <><b className="font-mono">{deposit.code}</b> → {zone}</>,
        action: undo ? undefined : { label: 'Deshacer', onClick: () => void save(deposit, previous, zone, true) } })
    } catch (cause) {
      setOverrides((current) => ({ ...current, [deposit.id]: previous }))
      setToast({ id: Date.now(), tone: 'error', text: cause instanceof Error ? cause.message : `No se ha podido mover ${deposit.code}.` })
    }
  }

  const onDragStart = ({ active: dragged }: DragStartEvent) => {
    setActiveId(String(dragged.id))
    setJustMoved(null)
    navigator.vibrate?.(8)
  }
  const onDragOver = ({ active: dragged, over }: DragOverEvent) => {
    const deposit = placed.find((item) => item.id === dragged.id)
    const zone = over?.data.current?.zone as string | undefined
    setOverOtherZone(Boolean(deposit && zone !== undefined && zone !== NO_ZONE && zone !== (deposit.zone ?? NO_ZONE)))
  }
  const onDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    setActiveId(null)
    setOverOtherZone(false)
    const deposit = placed.find((item) => item.id === dragged.id)
    const zone = over?.data.current?.zone as string | undefined
    if (!deposit || zone === undefined || zone === NO_ZONE || zone === (deposit.zone ?? NO_ZONE)) return
    void save(deposit, zone, deposit.zone ?? NO_ZONE)
  }

  const announcements: Announcements = {
    onDragStart: ({ active: dragged }) => `Depósito ${placed.find((item) => item.id === dragged.id)?.code} levantado.`,
    onDragOver: ({ over }) => (over ? `Sobre la zona ${over.data.current?.zone || 'sin zona'}.` : 'Fuera de las zonas.'),
    onDragEnd: ({ over }) => (over ? `Soltado en ${over.data.current?.zone || 'sin zona'}.` : 'Soltado fuera: no se mueve.'),
    onDragCancel: () => 'Movimiento cancelado.',
  }

  const hint = canMove && <span className="flex items-center gap-1 text-[11px] text-muted"><Move className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Arrastra un depósito para cambiarlo de zona</span><span className="sm:hidden">Mantén pulsado para mover</span></span>

  return (
    <HomeCard id="mapa-bodega" title="Mapa de bodega" aside={hint || <span className="text-[11.5px] text-muted">{deposits.length} depósitos</span>}>
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setOverOtherZone(false) }} accessibility={{ announcements, screenReaderInstructions: { draggable: 'Pulsa Espacio para levantar el depósito, las flechas para moverlo y Espacio para soltarlo en otra zona. Escape cancela.' } }}>
        <LayoutGroup>
          <div className="flex flex-wrap gap-2">
            {zones.map(({ zone, items }) => {
              const expanded = expandedZones.has(zone)
              return (
                <ZoneDrop key={zone || 'none'} zone={zone} items={items.length} dragging={Boolean(active)} fromZone={fromZone} expanded={expanded}
                  onExpand={() => setExpandedZones((current) => new Set(current).add(zone))}>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(46px,1fr))] gap-x-1 gap-y-1.5">
                    {items.map((deposit, index) => (
                      <div key={deposit.id} className={!expanded && index >= PHONE_PREVIEW ? 'max-sm:hidden' : ''}>
                        <DraggableTank deposit={deposit} canMove={canMove} justMoved={justMoved === deposit.id} onOpen={() => onOpenDeposit(deposit.code)} />
                      </div>
                    ))}
                  </div>
                </ZoneDrop>
              )
            })}
          </div>
        </LayoutGroup>
        <DragOverlay dropAnimation={overOtherZone ? null : dropAnimation} zIndex={60}>
          {active && <motion.div initial={{ scale: 1, rotate: 0 }} animate={{ scale: 1.12, rotate: -3 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }} className="cursor-grabbing"><TankFace deposit={active} lifted /></motion.div>}
        </DragOverlay>
      </DndContext>
      <Toast message={toast} onDismiss={dismiss} />
    </HomeCard>
  )
}
