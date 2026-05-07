import {
  getSessionAppointments,
  createSessionAppointment,
  getSessionAppointment,
  confirmSessionAppointment,
  refuseSessionAppointment,
  deleteSessionAppointment,
} from '@/lib/api/mentoring/appointments'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

jest.mock('@/lib/fetchWithAuth')
const mockedFetch = fetchWithAuth as jest.MockedFunction<typeof fetchWithAuth>

beforeEach(() => {
  jest.clearAllMocks()
})

const fakeAppointment = {
  id: 1,
  scheduledAt: '2026-05-10T10:00:00Z',
  format: 'text',
  status: 'pending',
  proposedBy: 'mentor',
  createdAt: '2026-05-01T08:00:00Z',
}

describe('appointments API', () => {
  describe('getSessionAppointments', () => {
    it('retourne la liste des rendez-vous', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([fakeAppointment]),
      } as Response)

      const result = await getSessionAppointments(5)
      expect(result).toEqual([fakeAppointment])
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5/appointments')
    })

    it('lance une erreur si la requête échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSessionAppointments(5)).rejects.toThrow('Erreur chargement rendez-vous')
    })
  })

  describe('createSessionAppointment', () => {
    it('crée un rendez-vous et retourne les données', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeAppointment),
      } as Response)

      const result = await createSessionAppointment(5, {
        scheduledAt: '2026-05-10T10:00:00Z',
        format: 'text',
      })
      expect(result).toEqual(fakeAppointment)
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/appointments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ scheduledAt: '2026-05-10T10:00:00Z', format: 'text' }),
        }),
      )
    })

    it('lance une erreur si la création échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(createSessionAppointment(5, { scheduledAt: '2026-05-10T10:00:00Z' })).rejects.toThrow(
        'Erreur création rendez-vous',
      )
    })
  })

  describe('getSessionAppointment', () => {
    it('retourne un rendez-vous par ID', async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeAppointment),
      } as Response)

      const result = await getSessionAppointment(5, 1)
      expect(result).toEqual(fakeAppointment)
      expect(mockedFetch).toHaveBeenCalledWith('/mentoring/sessions/5/appointments/1')
    })

    it('lance une erreur si le rendez-vous est introuvable', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(getSessionAppointment(5, 999)).rejects.toThrow('Rendez-vous introuvable')
    })
  })

  describe('confirmSessionAppointment', () => {
    it('confirme un rendez-vous', async () => {
      const confirmed = { ...fakeAppointment, status: 'confirmed' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(confirmed),
      } as Response)

      const result = await confirmSessionAppointment(5, 1)
      expect(result.status).toBe('confirmed')
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/appointments/1/confirm',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('lance une erreur si la confirmation échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(confirmSessionAppointment(5, 1)).rejects.toThrow('Erreur confirmation rendez-vous')
    })
  })

  describe('refuseSessionAppointment', () => {
    it('refuse un rendez-vous', async () => {
      const refused = { ...fakeAppointment, status: 'refused' }
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(refused),
      } as Response)

      const result = await refuseSessionAppointment(5, 1)
      expect(result.status).toBe('refused')
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/appointments/1/refuse',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    it('lance une erreur si le refus échoue', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: false } as Response)
      await expect(refuseSessionAppointment(5, 1)).rejects.toThrow('Erreur refus rendez-vous')
    })
  })

  describe('deleteSessionAppointment', () => {
    it('envoie une requête DELETE sur la bonne URL', async () => {
      mockedFetch.mockResolvedValueOnce({ ok: true } as Response)
      await deleteSessionAppointment(5, 1)
      expect(mockedFetch).toHaveBeenCalledWith(
        '/mentoring/sessions/5/appointments/1',
        expect.objectContaining({ method: 'DELETE' }),
      )
    })
  })
})
