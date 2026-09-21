import { apiRequest } from '../../../services/api-client'

/** Administración → Plantillas de análisis: parameters and the templates (panels) built from them. */
export interface ParameterView {
  code: string
  name: string
  unit: string
  decimals: number
  plausibilityMin: number | null
  plausibilityMax: number | null
  description: string | null
  active: boolean
  /** How many templates use it. */
  panels: number
}

export interface ParameterInput {
  code?: string
  name: string
  unit: string
  decimals: number
  plausibilityMin: number | null
  plausibilityMax: number | null
  description: string | null
  active: boolean
}

export interface PanelParameter { code: string; name: string; unit: string; required: boolean }
export interface PanelCategory { code: string; name: string; isDefault: boolean }

export interface PanelView {
  code: string
  name: string
  description: string | null
  active: boolean
  parameters: PanelParameter[]
  categories: PanelCategory[]
  /** Analyses already recorded with it. */
  samples: number
}

export interface PanelUpdate {
  name: string
  description: string | null
  active: boolean
  parameters: { code: string; required: boolean }[]
  categories: { code: string; isDefault: boolean }[]
}

export const panelsApi = {
  parameters() { return apiRequest<ParameterView[]>('/api/catalogs/parameters') },
  createParameter(input: ParameterInput) {
    return apiRequest<ParameterView>('/api/catalogs/parameters', { method: 'POST', body: JSON.stringify(input) })
  },
  updateParameter(code: string, input: ParameterInput) {
    return apiRequest<ParameterView>(`/api/catalogs/parameters/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(input) })
  },
  /** Hard delete: refuses (409) if any analysis result still references the parameter. */
  deleteParameter(code: string) {
    return apiRequest<void>(`/api/catalogs/parameters/${encodeURIComponent(code)}`, { method: 'DELETE' })
  },
  /** Every template, or — with a category — the active ones it offers, the default first. */
  panels(category?: string) {
    return apiRequest<PanelView[]>(`/api/catalogs/panels${category ? `?category=${encodeURIComponent(category)}` : ''}`)
  },
  createPanel(input: { code: string; name: string; description: string | null }) {
    return apiRequest<PanelView>('/api/catalogs/panels', { method: 'POST', body: JSON.stringify(input) })
  },
  updatePanel(code: string, input: PanelUpdate) {
    return apiRequest<PanelView>(`/api/catalogs/panels/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(input) })
  },
  /** Hard delete: refuses (409) if any analysis has been registered against the template. */
  deletePanel(code: string) {
    return apiRequest<void>(`/api/catalogs/panels/${encodeURIComponent(code)}`, { method: 'DELETE' })
  },
}
