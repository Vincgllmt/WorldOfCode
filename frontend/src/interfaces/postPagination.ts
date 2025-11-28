import type { Post } from './post'

export interface PaginatedPostsResponse {
  readonly items: readonly Post[]
  readonly page: number
  readonly totalPages: number
  readonly totalItems: number
  readonly limit: number
}

export interface FetchPostsPaginatedParams {
  readonly page: number
  readonly limit: number
}
