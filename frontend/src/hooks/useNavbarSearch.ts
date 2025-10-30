import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchGroups, searchUsers } from '@/services/searchService'
import type { GroupPreview, SearchGroupsParams, SearchUsersParams, UserPreview } from '@/interfaces/search'

type UseNavbarSearchArgs = {
  query: string
  limit?: number
}

type UseNavbarSearchResult = {
  users: UserPreview[] | undefined
  groups: GroupPreview[] | undefined
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

  const usersQuery = useQuery<UserPreview[], Error>({
    queryKey: ['search-users', debouncedQuery, limit],
    queryFn: () => searchUsers({ q: debouncedQuery, limit } satisfies SearchUsersParams),
    enabled,
    staleTime: 30_000,
  })

  const groupsQuery = useQuery<GroupPreview[], Error>({
    queryKey: ['search-groups', debouncedQuery, limit],
    queryFn: () => searchGroups({ q: debouncedQuery, limit } satisfies SearchGroupsParams),
    enabled,
    staleTime: 30_000,
  })

  const error = useMemo<Error | undefined>(() => {
    return usersQuery.error ?? groupsQuery.error ?? undefined
  }, [usersQuery.error, groupsQuery.error])

  return {
    users: usersQuery.data,
    groups: groupsQuery.data,
    isLoading: usersQuery.isLoading || groupsQuery.isLoading,
    isFetching: usersQuery.isFetching || groupsQuery.isFetching,
    error,
    debouncedQuery,
  }
}
