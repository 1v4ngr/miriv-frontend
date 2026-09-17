import { initialSamples } from '../data/mock-laboratory'
import type { NewSample, ResultsInput, Sample } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface LaboratoryApi {
  getSamples(): Promise<Sample[]>
  getSample(code: string): Promise<Sample | undefined>
  createSample(input: NewSample): Promise<Sample>
  saveResults(code: string, input: ResultsInput): Promise<Sample>
  validateSample(code: string, note: string): Promise<Sample>
  correctResult(code: string, parameter: string, value: string, reason: string): Promise<Sample>
  invalidateSample(code: string, reason: string): Promise<Sample>
}

const samples = structuredClone(initialSamples)
const wait = () => new Promise<void>((resolve) => window.setTimeout(resolve, 180))
const requiredForPanel = (panel: string) => panel === 'Ampliado' ? 8 : panel === 'Reducido' ? 3 : 5
const mockLaboratoryApi: LaboratoryApi = {
  async getSamples() { await wait(); return structuredClone(samples) },
  async getSample(code) { await wait(); return structuredClone(samples.find((item) => item.code === code)) },
  async createSample(input) {
    await wait()
    const code = input.code.trim().toUpperCase().replace(/\s+/g, '')
    if (!code || !input.originDeposit || !input.contentCode || !input.takenDate || !input.takenAt || !input.panel || !input.responsible.trim()) throw new Error('Completa todos los datos obligatorios de la muestra.')
    if (input.takenDate > new Date().toISOString().slice(0, 10)) throw new Error('La fecha de toma no puede ser futura.')
    if (samples.some((sample) => sample.code === code)) throw new Error('Ya existe una muestra con ese código.')
    const sample: Sample = { ...input, code, currentDeposit: input.originDeposit, age: 'ahora', completed: 0, required: requiredForPanel(input.panel), status: 'Borrador', results: [] }
    samples.unshift(sample)
    return structuredClone(sample)
  },
  async saveResults(code, input) {
    await wait()
    const sample = samples.find((item) => item.code === code)
    if (!sample) throw new Error('No se encuentra la muestra.')
    if (!input.processedAt || !input.laboratory || !input.method) throw new Error('Completa los datos de procesamiento.')
    if (input.results.some((result) => result.qualifier === 'Menor que límite' && !result.limit)) throw new Error('Indica el límite analítico de cada resultado “menor que límite”.')
    const resultMap = new Map(sample.results.map((result) => [result.parameter, result]))
    input.results.filter((result) => result.value || result.qualifier).forEach((result) => resultMap.set(result.parameter, { ...result, validity: input.status === 'Pendiente validar' ? 'Pendiente validar' : 'Borrador' }))
    sample.results = [...resultMap.values()]
    sample.completed = sample.results.length
    sample.status = input.status === 'Pendiente validar' && sample.completed >= sample.required ? 'Pendiente validar' : 'Borrador'
    sample.processedAt = input.processedAt; sample.laboratory = input.laboratory; sample.equipment = input.equipment; sample.method = input.method; sample.observations = input.observations
    return structuredClone(sample)
  },
  async validateSample(code, note) {
    await wait()
    const sample = samples.find((item) => item.code === code)
    if (!sample) throw new Error('No se encuentra la muestra.')
    if (sample.completed < sample.required) throw new Error(`Faltan ${sample.required - sample.completed} parámetros obligatorios antes de validar.`)
    sample.status = 'Validado'; sample.validationNote = note.trim() || 'Validado por laboratorio'
    sample.results = sample.results.map((result) => ({ ...result, validity: 'Validado' }))
    return structuredClone(sample)
  },
  async correctResult(code, parameter, value, reason) {
    await wait()
    const sample = samples.find((item) => item.code === code)
    const result = sample?.results.find((item) => item.parameter === parameter)
    if (!sample || !result) throw new Error('No se encuentra el resultado.')
    if (!value.trim() || !reason.trim()) throw new Error('Indica el nuevo valor y el motivo de corrección.')
    result.versions = [...(result.versions ?? []), { value: result.value, date: new Date().toLocaleDateString('es-ES'), author: 'Jordi Ferrer', reason }]
    result.value = value; result.validity = 'Pendiente validar'; sample.status = 'Pendiente validar'
    return structuredClone(sample)
  },
  async invalidateSample(code, reason) {
    await wait()
    const sample = samples.find((item) => item.code === code)
    if (!sample) throw new Error('No se encuentra la muestra.')
    if (!reason.trim()) throw new Error('Indica el motivo de invalidación.')
    sample.status = 'Invalidado'; sample.validationNote = reason; sample.results = sample.results.map((result) => ({ ...result, validity: 'Invalidado' }))
    return structuredClone(sample)
  },
}
const realLaboratoryApi: LaboratoryApi = {
  getSamples() { return apiRequest<Sample[]>('/api/laboratory/samples') },
  async getSample(code) { try { return await apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  createSample(input) { return apiRequest<Sample>('/api/laboratory/samples', { method: 'POST', body: JSON.stringify(input) }) },
  saveResults(code, input) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/results`, { method: 'PUT', body: JSON.stringify(input) }) },
  validateSample(code, note) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/validate`, { method: 'POST', body: JSON.stringify({ note }) }) },
  correctResult(code, parameter, value, reason) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/results/${encodeURIComponent(parameter)}/correction`, { method: 'POST', body: JSON.stringify({ value, reason }) }) },
  invalidateSample(code, reason) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/invalidate`, { method: 'POST', body: JSON.stringify({ reason }) }) },
}
export const laboratoryApi: LaboratoryApi = import.meta.env.VITE_API_MODE === 'mock' ? mockLaboratoryApi : realLaboratoryApi
