import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { search } from '@/services/searchService'
import type { SearchResponse } from '@/interfaces/search'

type UseNavbarSearchArgs = {
  query: string
  limit?: number
}

type UseNavbarSearchResult = {
  users: SearchResponse['users'] | undefined
  groups: SearchResponse['groups'] | undefined
  isLoading: boolean
  isFetching: boolean
  error?: Error
  debouncedQuery: string
}

const DEFAULT_LIMIT = 5
const DEBOUNCE_DELAY = 200

export function useNavbarSearch({ query, limit = DEFAULT_LIMIT }: UseNavbarSearchArgs): UseNavbarSearchResult {
  const [debouncedQuery, setDebouncedQuery] = useState<string>(query.trim())

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_DELAY)

    return () => {
      window.clearTimeout(handler)
    }
  }, [query])

  const enabled = debouncedQuery.length >= 1

  const searchQuery = useQuery<SearchResponse, Error>({
    queryKey: ['search', debouncedQuery, limit],
    queryFn: () => search({ q: debouncedQuery, limit }),
    enabled,
    staleTime: 30_000,
  })

  return {
    users: searchQuery.data?.users,
    groups: searchQuery.data?.groups,
    isLoading: searchQuery.isLoading,
    isFetching: searchQuery.isFetching,
    error: searchQuery.error ?? undefined,
    debouncedQuery,
  }
}
