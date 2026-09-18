import { apiRequest } from './api-client'

export interface CatalogItem {
  id: string
  code: string
  name: string
  description?: string
  active: boolean
}

export interface CatalogItemInput {
  code: string
  name: string
  description?: string
}

export type CatalogResource =
  | 'product-types'
  | 'colors'
  | 'destinations'
  | 'internal-categories'
  | 'varieties'

export const catalogResources: Array<{
  path: CatalogResource
  label: string
  /** Whether the backend exposes physical DELETE for this resource. */
  deletable: boolean
  /** Whether the entry supports a free-text description. */
  hasDescription: boolean
}> = [
  { path: 'varieties', label: 'Variedades', deletable: false, hasDescription: false },
  { path: 'internal-categories', label: 'Categorías internas', deletable: false, hasDescription: true },
  { path: 'product-types', label: 'Tipos de producto', deletable: true, hasDescription: true },
  { path: 'colors', label: 'Colores', deletable: false, hasDescription: false },
  { path: 'destinations', label: 'Destinos', deletable: false, hasDescription: false },
]

export const catalogApi = {
  list(path: CatalogResource) {
    return apiRequest<CatalogItem[]>(`/api/catalogs/${path}`)
  },
  listLaboratories() {
    return apiRequest<CatalogItem[]>('/api/catalogs/laboratories')
  },
  create(path: CatalogResource, input: CatalogItemInput) {
    return apiRequest<CatalogItem>(`/api/catalogs/${path}`, { method: 'POST', body: JSON.stringify(input) })
  },
  setActive(path: CatalogResource, id: string, active: boolean) {
    return apiRequest<CatalogItem>(`/api/catalogs/${path}/${id}/active`, {
      method: 'PUT',
      body: JSON.stringify(active),
    })
  },
  remove(path: CatalogResource, id: string) {
    return apiRequest<void>(`/api/catalogs/${path}/${id}`, { method: 'DELETE' })
  },
  // Convenience getters — keep existing call sites working.
  getVarieties() { return catalogApi.list('varieties') },
  getInternalCategories() { return catalogApi.list('internal-categories') },
  getProductTypes() { return catalogApi.list('product-types') },
  getColors() { return catalogApi.list('colors') },
  getDestinations() { return catalogApi.list('destinations') },
  createVariety(input: Pick<CatalogItem, 'code' | 'name'>) { return catalogApi.create('varieties', input) },
  createInternalCategory(input: Pick<CatalogItem, 'code' | 'name'>) { return catalogApi.create('internal-categories', input) },
  createProductType(input: Pick<CatalogItem, 'code' | 'name'>) { return catalogApi.create('product-types', input) },
}
