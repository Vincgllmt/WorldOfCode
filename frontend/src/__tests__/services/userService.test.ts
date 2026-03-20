import { getAllUsers, updateUser, deleteUser, getUserGroups, getUserById, changeUserPassword, updateUserProfile } from '@/services/userService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('userService', () => {
  describe('getAllUsers', () => {
    it('retourne la liste des utilisateurs', async () => {
      const users = [{ id: 1, username: 'V' }, { id: 2, username: 'Jackie' }]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(users),
      } as Response)

      const result = await getAllUsers()
      expect(result).toEqual(users)
      expect(mockedFetch).toHaveBeenCalledWith('/user')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(getAllUsers()).rejects.toThrow('Erreur lors du chargement des utilisateurs')
    })
  })

  describe('updateUser', () => {
    it('envoie un PUT avec les donnees sans l\'id dans le body', async () => {
      const userData = { id: 1, username: 'V_updated', role: 'ROLE_USER' as const, email: 'v@nc.com', firstname: 'V', lastname: null }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(userData),
      } as Response)

      const result = await updateUser(userData)
      expect(result).toEqual(userData)
      expect(mockedFetch).toHaveBeenCalledWith('/user/1', expect.objectContaining({
        method: 'PUT',
      }))
    })

    it('lance une erreur si la mise a jour echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(updateUser({ id: 1, username: 'V', role: 'ROLE_USER', email: 'v@nc.com', firstname: null, lastname: null }))
        .rejects.toThrow('Erreur lors de la mise à jour')
    })
  })

  describe('deleteUser', () => {
    it('envoie un DELETE pour l\'utilisateur', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)

      await expect(deleteUser(42)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/user/42', expect.objectContaining({
        method: 'DELETE',
      }))
    })

    it('lance une erreur si la suppression echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(deleteUser(42)).rejects.toThrow('Erreur lors de la suppression')
    })
  })

  describe('getUserGroups', () => {
    it('retourne les groupes de l\'utilisateur', async () => {
      const groups = [{ id: 1, name: 'Night City Devs' }]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(groups),
      } as Response)

      const result = await getUserGroups(1)
      expect(result).toEqual(groups)
      expect(mockedFetch).toHaveBeenCalledWith('/user/1/groups', expect.any(Object))
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(getUserGroups(1)).rejects.toThrow('Erreur lors de la récupération des groupes utilisateur')
    })
  })

  describe('getUserById', () => {
    it('retourne l\'utilisateur par ID', async () => {
      const user = { id: 5, username: 'Panam' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(user),
      } as Response)

      const result = await getUserById(5)
      expect(result).toEqual(user)
      expect(mockedFetch).toHaveBeenCalledWith('/user/5', expect.any(Object))
    })

    it('lance une erreur si l\'utilisateur n\'existe pas', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(getUserById(999)).rejects.toThrow('Erreur lors de la récupération de l\'utilisateur')
    })
  })

  describe('changeUserPassword', () => {
    it('envoie le changement de mot de passe', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Password changed' }),
      } as Response)

      const result = await changeUserPassword({
        id: 1,
        currentPassword: 'oldPass',
        newPassword: 'newPass2026!',
      })
      expect(result).toEqual({ message: 'Password changed' })
      expect(mockedFetch).toHaveBeenCalledWith('/user/1/password', expect.objectContaining({
        method: 'PUT',
      }))
    })

    it('lance une erreur avec le message du serveur', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Ancien mot de passe incorrect' }),
      } as Response)

      await expect(changeUserPassword({ id: 1, currentPassword: 'wrong', newPassword: 'new' }))
        .rejects.toThrow('Ancien mot de passe incorrect')
    })
  })

  describe('updateUserProfile', () => {
    it('met a jour le profil utilisateur', async () => {
      const profile = { id: 1, username: 'V', bio: 'Mercenaire a Night City' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(profile),
      } as Response)

      const result = await updateUserProfile(1, { bio: 'Mercenaire a Night City' })
      expect(result).toEqual(profile)
      expect(mockedFetch).toHaveBeenCalledWith('/user/1/profile', expect.objectContaining({
        method: 'PUT',
      }))
    })

    it('lance une erreur si la mise a jour echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)

      await expect(updateUserProfile(1, { bio: 'test' }))
        .rejects.toThrow('Erreur lors de la mise à jour du profil')
    })
  })
})
