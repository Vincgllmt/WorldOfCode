import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import { getFeed, type FeedResponse } from '@/services/feedService'

type UseInfiniteFeedOptions = {
  readonly limit?: number
  readonly enabled?: boolean
}

const DEFAULT_PAGE_SIZE = 10

export const useInfiniteFeed = (
  { limit = DEFAULT_PAGE_SIZE, enabled = true }: UseInfiniteFeedOptions = {}
): UseInfiniteQueryResult<InfiniteData<FeedResponse>, Error> => {
  const queryKey: QueryKey = ['feed', 'infinite', limit]

  return useInfiniteQuery<
    FeedResponse,
    Error,
    InfiniteData<FeedResponse>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: ({ pageParam }: { pageParam: number }) => getFeed(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage: FeedResponse) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1
      }
      return undefined
    },
    enabled,
  })
}
