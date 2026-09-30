type Prediction = { className: string; probability: number }

// Le service charge nsfwjs via `new Function('url', 'return import(url)')` :
// on remplace le constructeur global pour intercepter l'import dynamique.
const mockDynamicImport = jest.fn<Promise<Record<string, unknown>>, [string]>()
const OriginalFunction = global.Function

let service: typeof import('@/services/nsfwService')

const predictions = (scores: Partial<Record<'Porn' | 'Hentai' | 'Sexy' | 'Neutral', number>>): Prediction[] =>
  Object.entries(scores).map(([className, probability]) => ({ className, probability: probability as number }))

const makeFile = () => new File(['x'], 'photo.png', { type: 'image/png' })

let lastImage: { onload?: () => void; onerror?: (e: unknown) => void; src: string } | null = null
let imageShouldFail = false

beforeEach(async () => {
  jest.resetModules()
  jest.clearAllMocks()

  // Les autres usages (ex. instrumentation de couverture) gardent le vrai constructeur.
  global.Function = function (...args: string[]) {
    return args[1] === 'return import(url)' ? mockDynamicImport : OriginalFunction(...args)
  } as unknown as FunctionConstructor

  URL.createObjectURL = jest.fn(() => 'blob:photo')
  URL.revokeObjectURL = jest.fn()

  imageShouldFail = false
  class FakeImage {
    crossOrigin = ''
    onload?: () => void
    onerror?: (e: unknown) => void
    private _src = ''
    get src() {
      return this._src
    }
    set src(value: string) {
      this._src = value
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastImage = this
      queueMicrotask(() => (imageShouldFail ? this.onerror?.(new Error('bad image')) : this.onload?.()))
    }
  }
  window.Image = FakeImage as unknown as typeof window.Image

  service = await import('@/services/nsfwService')
})

afterEach(() => {
  global.Function = OriginalFunction
})

const mockModel = (preds: Prediction[]) => {
  const classify = jest.fn().mockResolvedValue(preds)
  const load = jest.fn().mockResolvedValue({ classify })
  return { classify, load }
}

describe('nsfwService', () => {
  describe('checkImageNSFW', () => {
    it('laisse passer une image neutre', async () => {
      const preds = predictions({ Neutral: 0.9, Porn: 0.01, Hentai: 0.01, Sexy: 0.05 })
      const { load, classify } = mockModel(preds)
      mockDynamicImport.mockResolvedValueOnce({ load })

      const result = await service.checkImageNSFW(makeFile())

      expect(result).toEqual({ blocked: false, predictions: preds })
      expect(mockDynamicImport).toHaveBeenCalledWith('https://esm.sh/nsfwjs@4.3.0')
      expect(classify).toHaveBeenCalledWith(lastImage)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
    })

    it.each([
      ['Porn', { Porn: 0.5 }, 0.5],
      ['Hentai', { Porn: 0.1, Hentai: 0.45 }, 0.45],
      ['Sexy', { Sexy: 0.65 }, 0.65],
    ])('bloque une image %s au-dessus du seuil', async (reason, scores, score) => {
      const { load } = mockModel(predictions(scores))
      mockDynamicImport.mockResolvedValueOnce({ load })

      const result = await service.checkImageNSFW(makeFile())
      expect(result).toMatchObject({ blocked: true, reason, score })
    })

    it.each([
      ['Porn', { Porn: 0.35, Hentai: 0.1, Sexy: 0.3 }, 0.35],
      ['Hentai', { Porn: 0.1, Hentai: 0.35, Sexy: 0.3 }, 0.35],
      ['Sexy', { Porn: 0.2, Hentai: 0.1, Sexy: 0.5 }, 0.5],
    ])('bloque sur le score combine avec la raison majoritaire %s', async (reason, scores, score) => {
      const { load } = mockModel(predictions(scores))
      mockDynamicImport.mockResolvedValueOnce({ load })

      const result = await service.checkImageNSFW(makeFile())
      expect(result).toMatchObject({ blocked: true, reason, score })
    })

    it('trouve load sur l export default et reutilise le modele en cache', async () => {
      const { load, classify } = mockModel(predictions({ Neutral: 1 }))
      mockDynamicImport.mockResolvedValueOnce({ default: { load } })

      await service.checkImageNSFW(makeFile())
      await service.checkImageNSFW(makeFile())

      expect(mockDynamicImport).toHaveBeenCalledTimes(1)
      expect(load).toHaveBeenCalledTimes(1)
      expect(classify).toHaveBeenCalledTimes(2)
    })

    it('bascule sur le CDN suivant quand le precedent echoue', async () => {
      const { load } = mockModel(predictions({ Porn: 0.9 }))
      mockDynamicImport
        .mockRejectedValueOnce(new Error('esm.sh down'))
        .mockResolvedValueOnce({ notLoad: true })
        .mockResolvedValueOnce({ load })

      const result = await service.checkImageNSFW(makeFile())

      expect(result.blocked).toBe(true)
      expect(mockDynamicImport.mock.calls.map(([url]) => url)).toEqual([
        'https://esm.sh/nsfwjs@4.3.0',
        'https://cdn.jsdelivr.net/npm/nsfwjs@4.3.0/+esm',
        'https://ga.jspm.io/npm:nsfwjs@4.3.0/dist/esm/index.js',
      ])
    })

    it('laisse passer l image si tous les CDN echouent, puis retente au prochain appel', async () => {
      mockDynamicImport.mockRejectedValue('indisponible')

      await expect(service.checkImageNSFW(makeFile())).resolves.toEqual({ blocked: false, predictions: [] })
      expect(mockDynamicImport).toHaveBeenCalledTimes(3)

      const { load } = mockModel(predictions({ Neutral: 1 }))
      mockDynamicImport.mockReset().mockResolvedValueOnce({ load })
      await service.checkImageNSFW(makeFile())
      expect(load).toHaveBeenCalledTimes(1)
    })

    it('abandonne une source qui ne repond pas avant le timeout', async () => {
      jest.useFakeTimers()
      try {
        const { load } = mockModel(predictions({ Neutral: 1 }))
        mockDynamicImport.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce({ load })

        const promise = service.checkImageNSFW(makeFile())
        await jest.advanceTimersByTimeAsync(8000)

        await expect(promise).resolves.toMatchObject({ blocked: false })
        expect(mockDynamicImport).toHaveBeenCalledTimes(2)
      } finally {
        jest.useRealTimers()
      }
    })

    it('laisse passer l image si elle ne peut pas etre decodee', async () => {
      const { load, classify } = mockModel([])
      mockDynamicImport.mockResolvedValueOnce({ load })
      imageShouldFail = true

      await expect(service.checkImageNSFW(makeFile())).resolves.toEqual({ blocked: false, predictions: [] })
      expect(classify).not.toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
    })
  })

  describe('preloadNsfwModel', () => {
    it('precharge le modele pour les verifications suivantes', async () => {
      const { load } = mockModel(predictions({ Neutral: 1 }))
      mockDynamicImport.mockResolvedValueOnce({ load })

      service.preloadNsfwModel()
      await service.checkImageNSFW(makeFile())

      expect(mockDynamicImport).toHaveBeenCalledTimes(1)
    })

    it('ignore silencieusement un echec de prechargement', async () => {
      mockDynamicImport.mockRejectedValue(new Error('down'))

      service.preloadNsfwModel()
      await new Promise((r) => setTimeout(r, 0))

      expect(mockDynamicImport).toHaveBeenCalledTimes(3)
    })
  })

  describe('getNsfwBlockMessage', () => {
    it('renvoie une chaine vide si l image n est pas bloquee', () => {
      expect(service.getNsfwBlockMessage({ blocked: false, predictions: [] })).toBe('')
    })

    it.each([
      ['Porn', 'Image refusée : contenu pornographique détecté.'],
      ['Hentai', 'Image refusée : contenu sexualisé détecté.'],
      ['Sexy', 'Image refusée : contenu suggestif détecté.'],
      [undefined, 'Image refusée : contenu inapproprié détecté.'],
    ] as const)('renvoie le message adapte a la raison %s', (reason, message) => {
      expect(service.getNsfwBlockMessage({ blocked: true, reason, predictions: [] })).toBe(message)
    })
  })
})
