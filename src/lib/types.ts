// F4-01: server-side pagination shape; reused by every paged endpoint.
export interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}