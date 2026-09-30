import { getMyMentorProfile, createMentorProfile, updateMentorProfile, toggleAvailability } from '@/lib/api/mentoring/profile'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const errorResponse = (status: number, body: unknown) =>
  ({ ok: false, status, json: () => Promise.resolve(body) } as Response)
const invalidJsonResponse = (status: number) =>
  ({ ok: false, status, json: () => Promise.reject(new Error('invalid json')) } as unknown as Response)

const fakeProfile = { id: 1, teachingStyle: 'guided', maxActiveMentees: 3 }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('mentor profile API', () => {
  describe('getMyMentorProfile', () => {
    it('retourne le profil mentor', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(fakeProfile))

      expect(await getMyMentorProfile()).toEqual(fakeProfile)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/profile')
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(404, { error: 'Profil introuvable' }))
      await expect(getMyMentorProfile()).rejects.toMatchObject({ message: 'Profil introuvable', status: 404 })
    })

    it('utilise un message par defaut si la reponse n\'est pas du JSON', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(getMyMentorProfile()).rejects.toMatchObject({ message: 'Erreur', status: 500 })
    })
  })

  describe('createMentorProfile', () => {
    const data = { specialties: [1, 2], teachingStyle: 'guided' }

    it('cree le profil via POST', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(fakeProfile))

      expect(await createMentorProfile(data)).toEqual(fakeProfile)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/profile', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(409, { error: 'Deja mentor' }))
      await expect(createMentorProfile(data)).rejects.toMatchObject({ message: 'Deja mentor', status: 409 })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(createMentorProfile(data)).rejects.toMatchObject({ message: 'Erreur création profil', status: 500 })
    })
  })

  describe('updateMentorProfile', () => {
    const data = { mentorBio: 'Dev senior' }

    it('met a jour le profil via PUT', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse(fakeProfile))

      expect(await updateMentorProfile(data)).toEqual(fakeProfile)
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(422, { error: 'Bio trop longue' }))
      await expect(updateMentorProfile(data)).rejects.toMatchObject({ message: 'Bio trop longue', status: 422 })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(updateMentorProfile(data)).rejects.toMatchObject({ message: 'Erreur mise à jour profil', status: 500 })
    })
  })

  describe('toggleAvailability', () => {
    it('change la disponibilite via PATCH', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ isAvailable: false, mode: 'pause' }))

      expect(await toggleAvailability(false)).toEqual({ isAvailable: false, mode: 'pause' })
      expect(mockedFetch).toHaveBeenCalledWith('/mentor/profile/availability', {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: false }),
      })
    })

    it('lance une erreur avec le statut HTTP', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse(403, { error: 'Pas mentor' }))
      await expect(toggleAvailability(true)).rejects.toMatchObject({ message: 'Pas mentor', status: 403 })
    })

    it('utilise un message par defaut', async () => {
      mockedFetch.mockResolvedValueOnce(invalidJsonResponse(500))
      await expect(toggleAvailability(true)).rejects.toMatchObject({ message: 'Erreur toggle disponibilité', status: 500 })
    })
  })
})
