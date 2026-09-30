import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSuggestedUsers, useSwipeSuggestions } from '@/hooks/useSuggestions'
import { getSuggestedUsers } from '@/services/suggestionService'
import type { SuggestedUser } from '@/interfaces/suggestion'

jest.mock('@/services/suggestionService')
const mockedGetSuggestedUsers = getSuggestedUsers as jest.MockedFunction<typeof getSuggestedUsers>

function makeUser(id: number): SuggestedUser {
  return {
    id,
    username: `user${id}`,
    firstname: null,
    lastname: null,
    avatarUrl: null,
    bio: null,
    location: null,
    score: 1,
    sharedSkills: [],
    sharedGroups: [],
    mutualFollowsCount: 0,
  }
}

const users = (...ids: number[]) => ids.map(makeUser)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper }
}

beforeEach(() => {
  mockedGetSuggestedUsers.mockReset()
})

describe('useSuggestedUsers', () => {
  it('renvoie les suggestions avec la limite demandee', async () => {
    mockedGetSuggestedUsers.mockResolvedValueOnce(users(1, 2))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSuggestedUsers(2), { wrapper })

    expect(result.current.suggestedUsers).toEqual([])
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.suggestedUsers).toEqual(users(1, 2))
    expect(mockedGetSuggestedUsers).toHaveBeenCalledWith(2, 0)
  })

  it('utilise une limite de 5 par defaut', async () => {
    mockedGetSuggestedUsers.mockResolvedValueOnce([])
    const { wrapper } = createWrapper()

    renderHook(() => useSuggestedUsers(), { wrapper })

    await waitFor(() => expect(mockedGetSuggestedUsers).toHaveBeenCalledWith(5, 0))
  })
})

describe('useSwipeSuggestions', () => {
  it('affiche au plus 3 cartes et avance sans recharger tant qu il en reste assez', async () => {
    mockedGetSuggestedUsers.mockResolvedValueOnce(users(1, 2, 3, 4, 5, 6))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSwipeSuggestions(6), { wrapper })

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.hasCards).toBe(true))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.visibleCards.map((u) => u.id)).toEqual([1, 2, 3])

    act(() => result.current.advance())

    expect(result.current.visibleCards.map((u) => u.id)).toEqual([2, 3, 4])
    expect(mockedGetSuggestedUsers).toHaveBeenCalledTimes(1)
  })

  it('precharge le lot suivant quand il reste 2 cartes et ignore les doublons', async () => {
    mockedGetSuggestedUsers
      .mockResolvedValueOnce(users(1, 2, 3))
      .mockResolvedValueOnce(users(3, 4, 5))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSwipeSuggestions(3), { wrapper })
    await waitFor(() => expect(result.current.hasCards).toBe(true))

    act(() => result.current.advance())

    await waitFor(() => expect(mockedGetSuggestedUsers).toHaveBeenCalledWith(3, 3))
    await waitFor(() => expect(result.current.visibleCards.map((u) => u.id)).toEqual([2, 3, 4]))

    act(() => result.current.advance())
    act(() => result.current.advance())
    act(() => result.current.advance())
    expect(result.current.visibleCards.map((u) => u.id)).toEqual([5])
  })

  it('reboucle au debut quand il n y a plus de resultats', async () => {
    mockedGetSuggestedUsers
      .mockResolvedValueOnce(users(1, 2))
      .mockResolvedValueOnce([])
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSwipeSuggestions(2), { wrapper })
    await waitFor(() => expect(result.current.hasCards).toBe(true))

    act(() => result.current.advance())
    await waitFor(() => expect(mockedGetSuggestedUsers).toHaveBeenCalledWith(2, 2))

    // Offset remis a 0 : le premier lot (en cache) redevient disponible
    await waitFor(() => expect(result.current.visibleCards.map((u) => u.id)).toEqual([1, 2]))
  })

  it('ne renvoie aucune carte si le premier lot est vide', async () => {
    mockedGetSuggestedUsers.mockResolvedValueOnce([])
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSwipeSuggestions(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasCards).toBe(false)
    expect(mockedGetSuggestedUsers).toHaveBeenCalledWith(5, 0)
  })
})
