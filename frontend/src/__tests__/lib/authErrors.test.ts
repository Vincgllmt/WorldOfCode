import { parseAuthErrorResponse, parseNetworkError } from '@/lib/authErrors'

const jsonResponse = (status: number, body: unknown) =>
  ({ status, json: () => Promise.resolve(body) } as Response)

const nonJsonResponse = (status: number) =>
  ({ status, json: () => Promise.reject(new SyntaxError('Unexpected token')) } as unknown as Response)

describe('authErrors', () => {
  describe('parseAuthErrorResponse', () => {
    it('traduit un message backend connu (champ error)', async () => {
      const msg = await parseAuthErrorResponse(jsonResponse(401, { error: 'Invalid credentials' }))
      expect(msg).toBe('Identifiants invalides. Vérifiez votre nom d’utilisateur et mot de passe.')
    })

    it('traduit un message backend connu (champ message)', async () => {
      const msg = await parseAuthErrorResponse(jsonResponse(401, { message: 'Invalid or expired code' }))
      expect(msg).toBe('Code incorrect ou expiré. Veuillez réessayer.')
    })

    it('le message backend connu prime sur le statut HTTP', async () => {
      const msg = await parseAuthErrorResponse(jsonResponse(429, { error: 'Too many attempts. Please try again later.' }))
      expect(msg).toBe('Trop de tentatives. Veuillez patienter quelques minutes avant de réessayer.')
    })

    it('utilise le message lie au statut si le message backend est inconnu', async () => {
      const msg = await parseAuthErrorResponse(jsonResponse(403, { error: 'Something odd' }))
      expect(msg).toBe('Accès refusé.')
    })

    it('utilise le message lie au statut si la reponse n\'est pas du JSON', async () => {
      const msg = await parseAuthErrorResponse(nonJsonResponse(503))
      expect(msg).toBe('Service temporairement indisponible. Réessayez plus tard.')
    })

    it('retourne le message backend brut si statut et message sont inconnus', async () => {
      const msg = await parseAuthErrorResponse(jsonResponse(418, { error: 'I am a teapot' }))
      expect(msg).toBe('I am a teapot')
    })

    it('retourne le fallback par defaut sans aucune information', async () => {
      expect(await parseAuthErrorResponse(nonJsonResponse(418))).toBe('Une erreur est survenue.')
    })

    it('retourne un fallback personnalise', async () => {
      expect(await parseAuthErrorResponse(jsonResponse(418, {}), 'Oups')).toBe('Oups')
    })
  })

  describe('parseNetworkError', () => {
    const originalOnLine = Object.getOwnPropertyDescriptor(window.navigator, 'onLine')

    const setOnLine = (value: boolean) => {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value })
    }

    afterEach(() => {
      if (originalOnLine) {
        Object.defineProperty(window.navigator, 'onLine', originalOnLine)
      } else {
        delete (window.navigator as any).onLine
      }
    })

    it('signale une absence de connexion quand le navigateur est hors ligne', () => {
      setOnLine(false)
      expect(parseNetworkError(new TypeError('Failed to fetch'))).toBe(
        'Vous semblez hors ligne. Vérifiez votre connexion internet et réessayez.'
      )
    })

    it('signale un serveur injoignable quand le navigateur est en ligne', () => {
      setOnLine(true)
      expect(parseNetworkError(new TypeError('Failed to fetch'))).toBe(
        'Connexion au serveur impossible. Vérifiez votre connexion ou réessayez plus tard.'
      )
    })

    it('retourne le message d\'une Error classique', () => {
      expect(parseNetworkError(new Error('Boom'))).toBe('Boom')
    })

    it('retourne le fallback pour une Error sans message', () => {
      expect(parseNetworkError(new Error(''), 'Fallback')).toBe('Fallback')
    })

    it('retourne le fallback pour une valeur qui n\'est pas une erreur', () => {
      expect(parseNetworkError('oops')).toBe('Une erreur est survenue.')
    })
  })
})
