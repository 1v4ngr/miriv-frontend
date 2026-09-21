import type { WorkHomeData } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface WorkHomeApi {
  getWorkHome(): Promise<WorkHomeData>
}

export const workHomeApi: WorkHomeApi = {
  getWorkHome() { return apiRequest<WorkHomeData>('/api/work-home') },
}