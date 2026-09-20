import { apiRequest } from '../../../services/api-client'

export interface ImportRowInput {
  reference: number
  deposit: string
  /** ISO local date-time in the cellar's timezone, e.g. 2026-09-20T09:31:04 */
  takenAt: string
  values: Record<string, string>
  observations?: string
}

export interface ImportRowResult {
  reference: number
  status: 'OK' | 'ERROR' | 'DUPLICATE'
  message?: string
  sampleCode?: string
  contentCode?: string
  parameters: number
}

export interface ImportResponse {
  imported: number
  skipped: number
  rows: ImportRowResult[]
}

export interface TemplateColumn { header: string; target: string }

export interface ImportTemplate {
  name: string
  columns: TemplateColumn[]
  author: string
  updatedAt: string
}

export const importApi = {
  /** Same checks as the import but without writing: powers the live warnings of the grid. */
  preview(rows: ImportRowInput[]) {
    return apiRequest<ImportResponse>('/api/laboratory/imports/analyses/preview', {
      method: 'POST', body: JSON.stringify({ rows }),
    })
  },
  execute(rows: ImportRowInput[]) {
    return apiRequest<ImportResponse>('/api/laboratory/imports/analyses', {
      method: 'POST', body: JSON.stringify({ rows }),
    })
  },
  templates() { return apiRequest<ImportTemplate[]>('/api/laboratory/imports/analyses/templates') },
  saveTemplate(name: string, columns: TemplateColumn[]) {
    return apiRequest<ImportTemplate>('/api/laboratory/imports/analyses/templates', {
      method: 'PUT', body: JSON.stringify({ name, columns }),
    })
  },
  deleteTemplate(name: string) {
    return apiRequest<void>(`/api/laboratory/imports/analyses/templates/${encodeURIComponent(name)}`, { method: 'DELETE' })
  },
}
