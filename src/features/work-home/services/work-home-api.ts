import { mockWorkHomeData } from '../data/mock-work-home'
import type { WorkHomeData } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface WorkHomeApi {
  getWorkHome(options?: { retryTasks?: boolean }): Promise<WorkHomeData>
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

const mockWorkHomeApi: WorkHomeApi = {
  async getWorkHome({ retryTasks = false } = {}) {
    await wait(retryTasks ? 450 : 500)

    if (!retryTasks) return mockWorkHomeData

    return {
      ...mockWorkHomeData,
      ownTasks: {
        status: 'available',
        count: 2,
        detail: '2 para hoy',
      },
    }
  },
}

const realWorkHomeApi: WorkHomeApi = {
  getWorkHome() { return apiRequest<WorkHomeData>('/api/work-home') },
}

const useMockApi = import.meta.env.VITE_API_MODE === 'mock'

export const workHomeApi: WorkHomeApi = useMockApi ? mockWorkHomeApi : realWorkHomeApi
