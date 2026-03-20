import { register } from '@/services/registerService'
import type { RegisterCredentials } from '@/interfaces/Authentification'

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  jest.clearAllMocks()
})

const validCredentials: RegisterCredentials = {
  firstname: 'John',
  lastname: 'Doe',
  email: 'john@test.com',
  username: 'johndoe',
  password: 'Pass1234',
}

describe('registerService', () => {
  describe('register', () => {
    it('retourne les données utilisateur après inscription réussie', async () => {
      const userData = {
        id: 1,
        username: 'johndoe',
        role: 'ROLE_USER',
        creationDate: '2026-03-20',
        updatedDate: '2026-03-20',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(userData),
      })

      const result = await register(validCredentials)
      expect(result).toEqual(userData)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/register'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(validCredentials),
        })
      )
    })

    it('lance une erreur avec le message du serveur si l\'inscription échoue', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Ce nom d\'utilisateur est déjà pris' }),
      })

      await expect(register(validCredentials))
        .rejects.toThrow('Ce nom d\'utilisateur est déjà pris')
    })

    it('lance une erreur par défaut si pas de message du serveur', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('parse')),
      })

      await expect(register(validCredentials))
        .rejects.toThrow('Erreur lors de la création du compte')
    })
  })
})
