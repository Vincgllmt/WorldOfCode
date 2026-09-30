import { search, searchUsers, searchGroups } from '@/services/searchService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const results = {
  users: [{ id: 1, username: 'V' }],
  groups: [{ id: 2, name: 'Netrunners' }],
  posts: [],
}
const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('searchService', () => {
  describe('search', () => {
    it('retourne un resultat vide sans appel reseau si la requete est vide', async () => {
      expect(await search({ q: '   ' })).toEqual({ users: [], groups: [], posts: [] })
      expect(mockedFetch).not.toHaveBeenCalled()
    })

    it('trim et encode la requete avec la limite par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(results))

      expect(await search({ q: '  c++ dev ' })).toEqual(results)
      expect(mockedFetch).toHaveBeenCalledWith(
        `/search?q=${encodeURIComponent('c++ dev')}&limit=5`,
        { credentials: 'include' }
      )
    })

    it('transmet une limite personnalisee', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(results))

      await search({ q: 'react', limit: 12 })
      expect(mockedFetch).toHaveBeenCalledWith('/search?q=react&limit=12', { credentials: 'include' })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false, status: 503 } as Response)
      await expect(search({ q: 'react' })).rejects.toThrow('Search failed: 503')
    })
  })

  it('searchUsers retourne uniquement les utilisateurs', async () => {
    mockedFetch.mockResolvedValueOnce(okResponse(results))
    expect(await searchUsers({ q: 'v' })).toEqual(results.users)
  })

  it('searchGroups retourne uniquement les groupes', async () => {
    mockedFetch.mockResolvedValueOnce(okResponse(results))
    expect(await searchGroups({ q: 'net' })).toEqual(results.groups)
  })
})
