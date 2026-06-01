import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('cookies-next', () => ({
  getCookie: vi.fn(() => 'test-token'),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

const {
  getAdminReportsPaginated,
  getAdminReportedPosts,
  claimReportsByPost,
  claimReport,
  resolveReport,
  rejectReport,
} = await import('./reportService')

// ─── Helpers ──────────────────────────────────────────────────────────────────

function okJson(data: unknown) {
  return { ok: true, json: () => Promise.resolve(data) }
}

function errorJson(data: unknown, status = 400) {
  return { ok: false, status, json: () => Promise.resolve(data) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('reportService', () => {
  beforeEach(() => { mockFetch.mockReset() })

  // ── getAdminReportsPaginated() ───────────────────────────────────────────────

  describe('getAdminReportsPaginated()', () => {
    const empty = { items: [], total: 0, page: 1, limit: 20 }

    it('construit la query string avec page et limit', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 3, limit: 10 })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page=3')
      expect(url).toContain('limit=10')
    })

    it('ajoute le filtre status quand fourni', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20, status: 'PENDING' })

      expect(mockFetch.mock.calls[0][0]).toContain('status=PENDING')
    })

    it('ajoute claimedByMe=true quand actif', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20, claimedByMe: true })

      expect(mockFetch.mock.calls[0][0]).toContain('claimedByMe=true')
    })

    it('ajoute le filtre postId quand fourni', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20, postId: 42 })

      expect(mockFetch.mock.calls[0][0]).toContain('postId=42')
    })

    it('convertit sortDir en majuscules', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20, sortDir: 'asc' })

      expect(mockFetch.mock.calls[0][0]).toContain('sortDir=ASC')
    })

    it('envoie le header Authorization', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20 })

      const options = mockFetch.mock.calls[0][1] as RequestInit
      expect((options.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token')
    })

    it('cible l\'endpoint /api/admin/reports', async () => {
      mockFetch.mockResolvedValue(okJson(empty))

      await getAdminReportsPaginated({ page: 1, limit: 20 })

      expect(mockFetch.mock.calls[0][0]).toContain('/api/admin/reports')
    })

    it('lève une erreur sur réponse non-ok', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(getAdminReportsPaginated({ page: 1, limit: 20 })).rejects.toThrow()
    })
  })

  // ── getAdminReportedPosts() ──────────────────────────────────────────────────

  describe('getAdminReportedPosts()', () => {
    it('cible /api/admin/reports/posts', async () => {
      mockFetch.mockResolvedValue(okJson({ items: [], total: 0, page: 1, limit: 20 }))

      await getAdminReportedPosts({ page: 1, limit: 20 })

      expect(mockFetch.mock.calls[0][0]).toContain('/api/admin/reports/posts')
    })

    it('passe page et limit dans la query', async () => {
      mockFetch.mockResolvedValue(okJson({ items: [], total: 0, page: 2, limit: 5 }))

      await getAdminReportedPosts({ page: 2, limit: 5 })

      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain('page=2')
      expect(url).toContain('limit=5')
    })

    it('lève une erreur sur réponse non-ok', async () => {
      mockFetch.mockResolvedValue({ ok: false })

      await expect(getAdminReportedPosts({ page: 1, limit: 20 })).rejects.toThrow('Erreur lors du chargement des posts signalés')
    })
  })

  // ── claimReportsByPost() ─────────────────────────────────────────────────────

  describe('claimReportsByPost()', () => {
    it('envoie PATCH sur /posts/{id}/claim', async () => {
      mockFetch.mockResolvedValue(okJson({ claimed: 3 }))

      await claimReportsByPost(42)

      expect(mockFetch.mock.calls[0][0]).toContain('/posts/42/claim')
      expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe('PATCH')
    })

    it('renvoie le nombre de reports pris en charge', async () => {
      mockFetch.mockResolvedValue(okJson({ claimed: 5 }))

      const result = await claimReportsByPost(1)

      expect(result).toEqual({ claimed: 5 })
    })

    it('lève avec le message d\'erreur du serveur', async () => {
      mockFetch.mockResolvedValue(errorJson({ error: 'Aucun report PENDING pour ce post' }))

      await expect(claimReportsByPost(99)).rejects.toThrow('Aucun report PENDING pour ce post')
    })
  })

  // ── claimReport() ────────────────────────────────────────────────────────────

  describe('claimReport()', () => {
    it('envoie PATCH sur /reports/{id}/claim', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 7, status: 'IN_PROGRESS' }))

      await claimReport(7)

      expect(mockFetch.mock.calls[0][0]).toContain('/reports/7/claim')
      expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe('PATCH')
    })

    it('lève avec le message serveur en cas d\'erreur 409', async () => {
      mockFetch.mockResolvedValue(errorJson({ error: 'Report déjà pris en charge' }, 409))

      await expect(claimReport(7)).rejects.toThrow('Report déjà pris en charge')
    })
  })

  // ── resolveReport() ──────────────────────────────────────────────────────────

  describe('resolveReport()', () => {
    it('envoie PATCH sur /reports/{id}/resolve', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 7, status: 'RESOLVED' }))

      await resolveReport(7, 'Post supprimé')

      expect(mockFetch.mock.calls[0][0]).toContain('/reports/7/resolve')
      expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe('PATCH')
    })

    it('inclut resolutionNote dans le body', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 7 }))

      await resolveReport(7, 'Contenu inapproprié')

      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.resolutionNote).toBe('Contenu inapproprié')
    })

    it('peut résoudre sans note', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 7 }))

      await expect(resolveReport(7)).resolves.toBeDefined()
    })

    it('lève sur erreur serveur', async () => {
      mockFetch.mockResolvedValue(errorJson({ error: 'Interdit' }, 403))

      await expect(resolveReport(7)).rejects.toThrow('Interdit')
    })
  })

  // ── rejectReport() ───────────────────────────────────────────────────────────

  describe('rejectReport()', () => {
    it('envoie PATCH sur /reports/{id}/reject', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 8, status: 'REJECTED' }))

      await rejectReport(8, 'Contenu conforme')

      expect(mockFetch.mock.calls[0][0]).toContain('/reports/8/reject')
      expect((mockFetch.mock.calls[0][1] as RequestInit).method).toBe('PATCH')
    })

    it('inclut resolutionNote dans le body', async () => {
      mockFetch.mockResolvedValue(okJson({ id: 8 }))

      await rejectReport(8, 'Report non justifié')

      const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
      expect(body.resolutionNote).toBe('Report non justifié')
    })

    it('lève avec le message serveur sur erreur', async () => {
      mockFetch.mockResolvedValue(errorJson({ error: 'Note obligatoire' }))

      await expect(rejectReport(8, '')).rejects.toThrow('Note obligatoire')
    })
  })
})
