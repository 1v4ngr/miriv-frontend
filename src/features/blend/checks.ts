import { STALE_READING_DAYS } from './rules'
import type { Addition, BlendResult, WineComponent } from './types'

export type CheckLevel = 'INFO' | 'WARN' | 'BLOCK'
export interface BlendCheck { code: string; level: CheckLevel; message: string; reference?: string }

export interface Destination {
  depositCode: string
  usefulCapacityLiters: number | null
  status: string                       // DepositStatus: 'occupied' | 'available' | …
  occupiedByContent: string | null
  occupiedLiters: number | null
}

const CATEGORY_NAME: Record<string, string> = { RED: 'tinto', WHITE: 'blanco', ROSE: 'rosado' }
const liters = (value: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
const list = (items: string[]) => items.join(', ')

/** Reg. (UE) 2019/934, annex I B: general limits of total SO₂ (mg/L) by colour and reducing sugars. */
export function so2Limit(categoryCode: string | null, sugarGramsPerLiter: number | null): number | null {
  const highSugar = sugarGramsPerLiter !== null && sugarGramsPerLiter > 5
  if (categoryCode === 'RED') return highSugar ? 200 : 150
  if (categoryCode === 'WHITE' || categoryCode === 'ROSE') return highSugar ? 250 : 200
  return null
}

/**
 * Warnings about the cellar and the law for a simulated blend. Only three things block converting it into
 * a task: not enough wine, not fitting the destination, and water (see blocksConversion).
 */
export function checkBlend(components: WineComponent[], additions: Addition[], destination: Destination | null, result: BlendResult): BlendCheck[] {
  const checks: BlendCheck[] = []
  const wine = components.filter((component) => component.volumeLiters > 0)

  if (result.totalLiters === 0) checks.push({ code: 'EMPTY', level: 'BLOCK', message: 'Añade al menos un depósito con litros.' })

  for (const component of wine) {
    if (component.availableLiters !== null && component.volumeLiters > component.availableLiters) {
      checks.push({ code: 'VOLUME_EXCEEDS', level: 'BLOCK', message: `${component.label}: pides ${liters(component.volumeLiters)} L pero hay ${liters(component.availableLiters)} L.` })
    }
  }

  if (!destination) {
    checks.push({ code: 'NO_DESTINATION', level: 'INFO', message: 'Elige el depósito destino para comprobar capacidad y poder convertir la simulación.' })
  } else {
    const asComponent = components.find((component) => component.depositCode === destination.depositCode)
    if (asComponent) {
      checks.push({ code: 'DEST_IS_COMPONENT', level: 'INFO', message: `La mezcla se hará en ${destination.depositCode}: se usará todo su contenido (${liters(asComponent.availableLiters ?? asComponent.volumeLiters)} L).` })
    } else if (destination.occupiedByContent) {
      checks.push({ code: 'DEST_OCCUPIED', level: 'BLOCK', message: `${destination.depositCode} tiene otro vino (${destination.occupiedByContent}). Elige un depósito vacío o uno de los que mezclas.` })
    }
    if (destination.usefulCapacityLiters !== null && result.totalLiters > destination.usefulCapacityLiters) {
      checks.push({ code: 'CAPACITY_EXCEEDED', level: 'BLOCK', message: `La mezcla (${liters(result.totalLiters)} L) no cabe en ${destination.depositCode} (capacidad útil ${liters(destination.usefulCapacityLiters)} L).` })
    }
  }

  const categories = new Set(wine.map((component) => component.categoryCode))
  if (categories.has('RED') && categories.has('WHITE')) {
    checks.push({ code: 'RED_WHITE', level: 'WARN', reference: 'Reg. (UE) 2019/934, art. 8', message: 'Mezclar tinto y blanco no puede dar un rosado salvo DOP/IGP que lo permita o cuvée para espumoso.' })
  }

  const lots = new Set(wine.map((component) => component.lotCode))
  if (lots.size > 1) checks.push({ code: 'MIX', level: 'INFO', message: `Será una mezcla (MIX) de ${lots.size} lotes: la trazabilidad conservará todos los orígenes.` })

  if (additions.some((addition) => addition.type === 'WATER' && addition.amount > 0)) {
    checks.push({ code: 'WATER', level: 'WARN', reference: 'Reg. (UE) 1308/2013, anexo VIII, parte II', message: 'Añadir agua al vino solo está permitido por necesidad técnica específica. Esta simulación no se podrá convertir en tarea.' })
  }

  const so2 = result.parameters.find((item) => item.parameter.code === 'TOTAL_SO2')
  if (so2 && so2.status === 'OK' && so2.value !== null) {
    const dominant = [...wine].sort((a, b) => b.volumeLiters - a.volumeLiters)[0]
    const sugar = result.parameters.find((item) => item.parameter.code === 'REDUCING_SUGARS') ?? result.parameters.find((item) => item.parameter.code === 'GLUCOSE_FRUCTOSE')
    const limit = so2Limit(dominant?.categoryCode ?? null, sugar?.status === 'OK' ? sugar.value : null)
    if (limit !== null && so2.value > limit) {
      checks.push({ code: 'SO2_LIMIT', level: 'WARN', reference: 'Reg. (UE) 2019/934, anexo I B', message: `SO₂ total estimado ${Math.round(so2.value)} mg/L supera el límite general de ${limit} mg/L para ${CATEGORY_NAME[dominant.categoryCode ?? ''] ?? 'este vino'}.` })
    }
  }

  const stale = wine.filter((component) => Object.values(component.readings).some((reading) => reading.daysAgo > STALE_READING_DAYS)).map((component) => component.label)
  if (stale.length) checks.push({ code: 'STALE', level: 'WARN', message: `Hay analíticas de hace más de ${STALE_READING_DAYS} días en ${list(stale)}: el resultado puede no reflejar el vino actual.` })

  const unvalidated = wine.filter((component) => Object.values(component.readings).some((reading) => !reading.validated)).map((component) => component.label)
  if (unvalidated.length) checks.push({ code: 'UNVALIDATED', level: 'INFO', message: `Hay resultados sin validar en ${list(unvalidated)}.` })

  if (result.parameters.length > 0) {
    checks.push({ code: 'ESTIMATES', level: 'INFO', message: 'pH, SO₂ libre y SO₂ molecular son estimaciones: confirma con una prueba de banco antes de mover vino.' })
  }
  return checks
}

/** A simulation with water, or with any blocking check, cannot become a task. */
export const blocksConversion = (checks: BlendCheck[]): boolean => checks.some((check) => check.level === 'BLOCK' || check.code === 'WATER')
