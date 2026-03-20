import { getGroups, getGroupById, createGroup, updateGroup, deleteGroup, joinGroup, leaveGroup } from '@/services/groupService'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('groupService', () => {
  describe('getGroups', () => {
    it('retourne la liste des groupes', async () => {
      const groups = [{ id: 1, name: 'Night City Devs' }, { id: 2, name: 'Arasaka Corp' }]
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(groups),
      } as Response)

      const result = await getGroups()
      expect(result).toEqual(groups)
      expect(mockedFetch).toHaveBeenCalledWith('/group')
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getGroups()).rejects.toThrow('Erreur lors du chargement des groupes')
    })
  })

  describe('getGroupById', () => {
    it('retourne un groupe par ID', async () => {
      const group = { id: 1, name: 'Night City Devs' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(group),
      } as Response)

      const result = await getGroupById(1)
      expect(result).toEqual(group)
      expect(mockedFetch).toHaveBeenCalledWith('/group/1')
    })

    it('lance une erreur si le groupe n\'existe pas', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getGroupById(999)).rejects.toThrow('Erreur lors de la récupération du groupe')
    })
  })

  describe('createGroup', () => {
    it('cree un groupe et retourne les donnees', async () => {
      const newGroup = { id: 3, name: 'Samurai' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(newGroup),
      } as Response)

      const result = await createGroup({ name: 'Samurai', description: 'Rock band' } as any)
      expect(result).toEqual(newGroup)
      expect(mockedFetch).toHaveBeenCalledWith('/group', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si la creation echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(createGroup({ name: 'Test' } as any)).rejects.toThrow('Erreur lors de la création du groupe')
    })
  })

  describe('updateGroup', () => {
    it('met a jour un groupe', async () => {
      const updated = { id: 1, name: 'NC Devs v2' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updated),
      } as Response)

      const result = await updateGroup({ id: 1, name: 'NC Devs v2', description: 'Updated' })
      expect(result).toEqual(updated)
      expect(mockedFetch).toHaveBeenCalledWith('/group/1', expect.objectContaining({ method: 'PUT' }))
    })

    it('lance une erreur si la mise a jour echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(updateGroup({ id: 1, name: 'Test', description: '' })).rejects.toThrow('Erreur lors de la mise à jour du groupe')
    })
  })

  describe('deleteGroup', () => {
    it('supprime un groupe', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(deleteGroup(1)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/group/1', expect.objectContaining({ method: 'DELETE' }))
    })

    it('lance une erreur si la suppression echoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(deleteGroup(1)).rejects.toThrow('Erreur lors de la suppression du groupe')
    })
  })

  describe('joinGroup', () => {
    it('rejoint un groupe', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(joinGroup(5)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/group/5/join', expect.objectContaining({ method: 'POST' }))
    })

    it('lance une erreur si impossible de rejoindre', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(joinGroup(5)).rejects.toThrow("Erreur lors de la demande d'adhésion au groupe")
    })
  })

  describe('leaveGroup', () => {
    it('quitte un groupe', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await expect(leaveGroup(5)).resolves.toBeUndefined()
      expect(mockedFetch).toHaveBeenCalledWith('/group/5/join', expect.objectContaining({ method: 'DELETE' }))
    })

    it('lance une erreur si impossible de quitter', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(leaveGroup(5)).rejects.toThrow('Erreur lors du départ du groupe')
    })
  })
})
