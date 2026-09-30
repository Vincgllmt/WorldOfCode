import { followUser, unfollowUser, getFollowers, getFollowing } from '@/services/followService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)

beforeEach(() => {
  jest.clearAllMocks()
})

describe('followService', () => {
  describe('followUser', () => {
    it('suit un utilisateur via POST', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ following: true }))

      const result = await followUser(42)
      expect(result).toEqual({ following: true })
      expect(mockedFetch).toHaveBeenCalledWith('/follow/42', { method: 'POST' })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(followUser(42)).rejects.toThrow("Erreur lors du suivi de l'utilisateur")
    })
  })

  describe('unfollowUser', () => {
    it('se desabonne via DELETE', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ following: false }))

      const result = await unfollowUser(42)
      expect(result).toEqual({ following: false })
      expect(mockedFetch).toHaveBeenCalledWith('/follow/42', { method: 'DELETE' })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(unfollowUser(42)).rejects.toThrow("Erreur lors du désabonnement de l'utilisateur")
    })
  })

  describe('getFollowers', () => {
    it('retourne les followers', async () => {
      const followers = [{ id: 1, username: 'Judy' }]
      mockedFetch.mockResolvedValueOnce(okResponse(followers))

      expect(await getFollowers(7)).toEqual(followers)
      expect(mockedFetch).toHaveBeenCalledWith('/follow/7/followers')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getFollowers(7)).rejects.toThrow('Erreur lors du chargement des followers')
    })
  })

  describe('getFollowing', () => {
    it('retourne les utilisateurs suivis', async () => {
      const following = [{ id: 2, username: 'Panam' }]
      mockedFetch.mockResolvedValueOnce(okResponse(following))

      expect(await getFollowing(7)).toEqual(following)
      expect(mockedFetch).toHaveBeenCalledWith('/follow/7/following')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getFollowing(7)).rejects.toThrow('Erreur lors du chargement des utilisateurs suivis')
    })
  })
})
