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
  reassignDeposit(code: string, deposit: string, reason: string): Promise<Sample>
}

export const laboratoryApi: LaboratoryApi = {
  getSamples() { return apiRequest<Sample[]>('/api/laboratory/samples') },
  async getSample(code) { try { return await apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  createSample(input) { return apiRequest<Sample>('/api/laboratory/samples', { method: 'POST', body: JSON.stringify(input) }) },
  saveResults(code, input) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/results`, { method: 'PUT', body: JSON.stringify(input) }) },
  validateSample(code, note) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/validate`, { method: 'POST', body: JSON.stringify({ note }) }) },
  correctResult(code, parameter, value, reason) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/results/${encodeURIComponent(parameter)}/correction`, { method: 'POST', body: JSON.stringify({ value, reason }) }) },
  invalidateSample(code, reason) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/invalidate`, { method: 'POST', body: JSON.stringify({ reason }) }) },
  reassignDeposit(code, deposit, reason) { return apiRequest<Sample>(`/api/laboratory/samples/${encodeURIComponent(code)}/deposit`, { method: 'POST', body: JSON.stringify({ deposit, reason }) }) },
}
