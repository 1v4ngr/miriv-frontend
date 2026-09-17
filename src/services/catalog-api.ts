import { apiRequest } from './api-client'

export interface CatalogItem {
  id: string
  code: string
  name: string
  description?: string
  active: boolean
}

export const catalogApi = {
  getInternalCategories() { return apiRequest<CatalogItem[]>('/api/catalogs/internal-categories') },
  getDestinations() { return apiRequest<CatalogItem[]>('/api/catalogs/destinations') },
  getVarieties() { return apiRequest<CatalogItem[]>('/api/catalogs/varieties') },
  getColors() { return apiRequest<CatalogItem[]>('/api/catalogs/colors') },
  getProductTypes() { return apiRequest<CatalogItem[]>('/api/catalogs/product-types') },
  createVariety(input: Pick<CatalogItem, 'code' | 'name'>) { return apiRequest<CatalogItem>('/api/catalogs/varieties', { method: 'POST', body: JSON.stringify(input) }) },
  createInternalCategory(input: Pick<CatalogItem, 'code' | 'name'>) { return apiRequest<CatalogItem>('/api/catalogs/internal-categories', { method: 'POST', body: JSON.stringify(input) }) },
  createProductType(input: Pick<CatalogItem, 'code' | 'name'>) { return apiRequest<CatalogItem>('/api/catalogs/product-types', { method: 'POST', body: JSON.stringify(input) }) },
}
