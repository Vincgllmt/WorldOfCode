import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import { getPostsPaginated } from '@/services/postService'
import type { PaginatedPostsResponse } from '@/interfaces/postPagination'

type UseInfinitePostsOptions = {
  readonly limit?: number
  readonly enabled?: boolean
}

const DEFAULT_PAGE_SIZE = 10

export const useInfinitePosts = (
  { limit = DEFAULT_PAGE_SIZE, enabled = true }: UseInfinitePostsOptions = {}
): UseInfiniteQueryResult<InfiniteData<PaginatedPostsResponse>, Error> => {
  const queryKey: QueryKey = ['posts', 'infinite', limit]

  return useInfiniteQuery<
    PaginatedPostsResponse,
    Error,
    InfiniteData<PaginatedPostsResponse>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: number }) => getPostsPaginated({ page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedPostsResponse) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    enabled,
  })
}
