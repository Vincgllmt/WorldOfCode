import { getAllSkills } from '@/services/skillService'
import { getCookie } from 'cookies-next'

jest.mock('cookies-next', () => ({
  getCookie: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

beforeEach(() => {
  jest.clearAllMocks()
  ;(getCookie as jest.Mock).mockReturnValue('jwt-token')
})

describe('skillService', () => {
  describe('getAllSkills', () => {
    it('retourne la liste des competences', async () => {
      const skills = [{ id: 1, name: 'TypeScript' }]
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(skills) })

      expect(await getAllSkills()).toEqual(skills)
      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/skills`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer jwt-token',
        },
      })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false })
      await expect(getAllSkills()).rejects.toThrow('Erreur lors du chargement des compétences')
    })
  })
})
