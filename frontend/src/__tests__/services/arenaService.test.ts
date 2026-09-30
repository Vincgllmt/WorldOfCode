import { getCookie } from 'cookies-next'
import {
  getArenaChallenges,
  getArenaChallenge,
  getArenaLeaderboard,
  getUserBadges,
  getChallenge,
  runCode,
  playGame,
  runTests,
  submitCode,
} from '@/services/arenaService'

jest.mock('cookies-next', () => ({ getCookie: jest.fn() }))
const mockedGetCookie = getCookie as jest.MockedFunction<typeof getCookie>

const mockedFetch = jest.fn()
global.fetch = mockedFetch as unknown as typeof fetch

const ARENA = 'http://localhost:8082'

const okResponse = (data: unknown) => ({ ok: true, json: () => Promise.resolve(data) } as Response)
const errorResponse = (data?: unknown) =>
  ({
    ok: false,
    json: data === undefined ? () => Promise.reject(new Error('no body')) : () => Promise.resolve(data),
  } as Response)

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetCookie.mockReturnValue('tok')
})

describe('arenaService', () => {
  describe.each([
    ['getArenaChallenges', () => getArenaChallenges(), '/api/arena/challenges', 'Erreur lors du chargement des défis'],
    ['getArenaChallenge', () => getArenaChallenge('maze'), '/api/arena/challenges/maze', 'Erreur lors du chargement du défi'],
    ['getArenaLeaderboard', () => getArenaLeaderboard(), '/api/arena/leaderboard', 'Erreur lors du chargement du classement'],
    ['getUserBadges', () => getUserBadges(7), '/api/arena/users/7/badges', 'Erreur lors du chargement des badges'],
    ['getChallenge', () => getChallenge('maze'), '/api/arena/challenges/maze', 'Défi introuvable ou service indisponible'],
  ])('%s', (_name, call, path, errorMessage) => {
    it('envoie une requete GET authentifiee et renvoie le JSON', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse([{ id: 1 }]))

      await expect(call()).resolves.toEqual([{ id: 1 }])
      expect(mockedFetch).toHaveBeenCalledWith(`${ARENA}${path}`, {
        headers: { Authorization: 'Bearer tok' },
      })
    })

    it("n'envoie pas d'en-tete Authorization sans token", async () => {
      mockedGetCookie.mockReturnValue(undefined)
      mockedFetch.mockResolvedValueOnce(okResponse([]))

      await call()
      expect(mockedFetch).toHaveBeenCalledWith(`${ARENA}${path}`, { headers: {} })
    })

    it('lance une erreur si la requete echoue', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse({}))
      await expect(call()).rejects.toThrow(errorMessage)
    })
  })

  describe.each([
    [
      'runCode',
      () => runCode('python', 'print(1)'),
      '/api/arena/run',
      { language: 'python', code: 'print(1)' },
      "Erreur lors de l'exécution du code",
    ],
    [
      'playGame',
      () => playGame('maze', 'python', 'x'),
      '/api/arena/challenges/maze/play',
      { language: 'python', code: 'x' },
      'Erreur lors de la partie',
    ],
    [
      'submitCode',
      () => submitCode('maze', 'python', 'x'),
      '/api/arena/challenges/maze/submit',
      { language: 'python', code: 'x' },
      'Erreur lors de la soumission',
    ],
  ])('%s', (_name, call, path, body, defaultError) => {
    it('envoie une requete POST authentifiee avec le code', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ verdict: 'passed' }))

      await expect(call()).resolves.toEqual({ verdict: 'passed' })
      expect(mockedFetch).toHaveBeenCalledWith(`${ARENA}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
        body: JSON.stringify(body),
      })
    })

    it("remonte le message d'erreur du serveur", async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse({ error: 'Langage non supporté' }))
      await expect(call()).rejects.toThrow('Langage non supporté')
    })

    it('utilise le message par defaut si le corps est illisible', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse())
      await expect(call()).rejects.toThrow(defaultError)
    })
  })

  describe('runCode', () => {
    it('transmet stdin lorsqu il est fourni', async () => {
      mockedGetCookie.mockReturnValue(undefined)
      mockedFetch.mockResolvedValueOnce(okResponse({ stdout: '1' }))

      await runCode('python', 'print(input())', '1')
      expect(mockedFetch).toHaveBeenCalledWith(`${ARENA}/api/arena/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'python', code: 'print(input())', stdin: '1' }),
      })
    })
  })

  describe('runTests', () => {
    it('renvoie les resultats de tous les cas', async () => {
      const results = [{ index: 0, verdict: 'passed' }]
      mockedFetch.mockResolvedValueOnce(okResponse({ results }))

      await expect(runTests('maze', 'python', 'x')).resolves.toEqual(results)
      expect(mockedFetch).toHaveBeenCalledWith(`${ARENA}/api/arena/challenges/maze/run-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' },
        body: JSON.stringify({ language: 'python', code: 'x' }),
      })
    })

    it('transmet testIndex lorsqu il est fourni (y compris 0)', async () => {
      mockedFetch.mockResolvedValueOnce(okResponse({ results: [] }))

      await runTests('maze', 'python', 'x', 0)
      expect(mockedFetch.mock.calls[0][1].body).toBe(
        JSON.stringify({ language: 'python', code: 'x', testIndex: 0 }),
      )
    })

    it("remonte le message d'erreur du serveur", async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse({ error: 'Timeout' }))
      await expect(runTests('maze', 'python', 'x')).rejects.toThrow('Timeout')
    })

    it('utilise le message par defaut si le corps est illisible', async () => {
      mockedFetch.mockResolvedValueOnce(errorResponse())
      await expect(runTests('maze', 'python', 'x')).rejects.toThrow("Erreur lors de l'exécution des tests")
    })
  })
})
