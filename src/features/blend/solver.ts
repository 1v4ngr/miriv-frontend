import { solve, type Model } from 'yalps'
import { formatNumber } from '../../lib/format'
import { simulateBlend } from './engine'
import { ruleOf } from './rules'
import type { ParameterMeta, WineComponent } from './types'

export interface Target { parameter: string; min: number | null; max: number | null }
export type Goal = { kind: 'MAX_VOLUME' } | { kind: 'MAX_COMPONENT'; componentId: string } | { kind: 'MIN_COMPONENT'; componentId: string }

export interface SolveInput {
  components: WineComponent[]            // id, availableLiters and readings are used; volumeLiters is ignored
  targets: Target[]
  totalMin: number | null
  totalMax: number | null                // e.g. useful capacity of the destination
  goal: Goal
  /** Catalog for names and decimals in messages. */
  parameters: ParameterMeta[]
}

export type SolveOutput =
  | { ok: true; volumes: Record<string, number>; rounded: Record<string, number>; total: number; warnings: string[] }
  | { ok: false; reason: string }

const LINEAR_RULES = new Set(['LINEAR', 'LINEAR_APPROX', 'UPPER_BOUND'])
const EPSILON = 1e-6

/** [low, high] of a component's reading: a "< L" result is anywhere between 0 and L. Null when there is no usable value. */
function bounds(component: WineComponent, code: string): { low: number; high: number } | null {
  const reading = component.readings[code]
  if (!reading || reading.qualifier === 'NOT_MEASURED') return null
  if (reading.qualifier === 'NONE') return reading.value === null ? null : { low: reading.value, high: reading.value }
  return { low: 0, high: reading.limit ?? 0 }
}

/**
 * Finds litres of each tank that satisfy every target range for the linear parameters. pH and other
 * non-linear parameters are not part of the model: check them afterwards with simulateBlend.
 * Each target [lo, hi] on parameter p becomes Σ Vi·(xip − lo) ≥ 0 and Σ Vi·(xip − hi) ≤ 0.
 */
export function solveBlend(input: SolveInput): SolveOutput {
  const { components, targets, goal, parameters } = input
  const meta = (code: string) => parameters.find((item) => item.code === code) ?? { code, name: code, unit: null, decimals: 2 }

  if (components.length === 0) return { ok: false, reason: 'Añade depósitos para buscar proporciones.' }
  if (targets.length === 0) return { ok: false, reason: 'Define al menos un objetivo.' }
  for (const target of targets) {
    if (!LINEAR_RULES.has(ruleOf(target.parameter))) {
      return { ok: false, reason: `${meta(target.parameter).name} no se puede usar como objetivo porque no se mezcla de forma lineal; se comprobará después.` }
    }
  }
  for (const target of targets) {
    for (const component of components) {
      if (!bounds(component, target.parameter)) return { ok: false, reason: `Falta ${meta(target.parameter).name} en ${component.label}: analízalo o quita ese objetivo.` }
    }
  }
  if (goal.kind === 'MIN_COMPONENT' && input.totalMin === null) {
    return { ok: false, reason: 'Para usar lo mínimo de un depósito, fija un volumen total mínimo.' }
  }

  const available = components.map((component) => component.availableLiters)
  const capacity = available.every((value): value is number => value !== null) ? available.reduce((sum, value) => sum + value, 0) : null
  const constraints: Record<string, { min?: number; max?: number }> = {
    // At least 1 L: with no minimum, "nothing" would trivially satisfy every target.
    total: { min: Math.max(input.totalMin ?? 0, 1), ...(input.totalMax !== null ? { max: input.totalMax } : capacity !== null ? { max: capacity } : {}) },
  }
  const variables: Record<string, Record<string, number>> = {}
  const names = new Map<string, WineComponent>()

  components.forEach((component, index) => {
    const name = `v${index}`
    names.set(name, component)
    const coefficients: Record<string, number> = { total: 1 }
    if (component.availableLiters !== null) {
      constraints[`cap_${name}`] = { max: component.availableLiters }
      coefficients[`cap_${name}`] = 1
    }
    targets.forEach((target, t) => {
      const range = bounds(component, target.parameter)!
      if (target.min !== null) { constraints[`t${t}_lo`] = { min: 0 }; coefficients[`t${t}_lo`] = range.low - target.min }
      if (target.max !== null) { constraints[`t${t}_hi`] = { max: 0 }; coefficients[`t${t}_hi`] = range.high - target.max }
    })
    coefficients.obj = goal.kind === 'MAX_VOLUME' ? 1 : goal.componentId === component.id ? 1 : 0
    variables[name] = coefficients
  })

  const model: Model = { direction: goal.kind === 'MIN_COMPONENT' ? 'minimize' : 'maximize', objective: 'obj', constraints, variables }
  const solution = solve(model)

  if (solution.status === 'infeasible') return { ok: false, reason: explainInfeasible(input, capacity, meta) }
  if (solution.status !== 'optimal') {
    return { ok: false, reason: solution.status === 'unbounded' ? 'Falta un límite de volumen: indica el volumen total máximo.' : `No se ha encontrado solución (${solution.status}).` }
  }

  const volumes: Record<string, number> = {}
  const rounded: Record<string, number> = {}
  for (const [name, component] of names) {
    const value = solution.variables.find(([key]) => key === name)?.[1] ?? 0
    volumes[component.id] = value < EPSILON ? 0 : value
    rounded[component.id] = Math.floor(volumes[component.id] + EPSILON)
  }
  const total = Object.values(volumes).reduce((sum, value) => sum + value, 0)

  const warnings: string[] = []
  const check = simulateBlend(components.map((component) => ({ ...component, volumeLiters: rounded[component.id] })), [], parameters)
  for (const target of targets) {
    const result = check.parameters.find((item) => item.parameter.code === target.parameter)
    if (!result || result.status !== 'OK' || result.value === null) continue
    const outside = (target.min !== null && result.value < target.min - EPSILON) || (target.max !== null && result.value > target.max + EPSILON)
    if (outside) warnings.push(`Tras redondear a litros enteros, ${meta(target.parameter).name} queda en ${formatNumber(result.value, meta(target.parameter).decimals)}.`)
  }
  warnings.push('El pH resultante es orientativo: revísalo en la tabla.')
  return { ok: true, volumes, rounded, total, warnings }
}

/** Says why there is no solution: an unreachable target, not enough wine, or a mix of goals that clash. */
function explainInfeasible(input: SolveInput, capacity: number | null, meta: (code: string) => ParameterMeta): string {
  const usable = input.components.filter((component) => component.availableLiters === null || component.availableLiters > 0)
  for (const target of input.targets) {
    const all = usable.map((component) => bounds(component, target.parameter)).filter((range): range is { low: number; high: number } => range !== null)
    if (all.length === 0) continue
    const lowest = Math.min(...all.map((range) => range.low))
    const highest = Math.max(...all.map((range) => range.high))
    if ((target.min !== null && target.min > highest + EPSILON) || (target.max !== null && target.max < lowest - EPSILON)) {
      const decimals = meta(target.parameter).decimals
      return `Con estos depósitos, ${meta(target.parameter).name} solo puede ir de ${formatNumber(lowest, decimals)} a ${formatNumber(highest, decimals)}.`
    }
  }
  if (capacity !== null && input.totalMin !== null && input.totalMin > capacity) {
    return `No hay volumen suficiente: como mucho ${formatNumber(capacity, 0)} L.`
  }
  return 'Los objetivos no se pueden cumplir a la vez con estos depósitos. Prueba a relajar alguno o añade otro depósito.'
}
