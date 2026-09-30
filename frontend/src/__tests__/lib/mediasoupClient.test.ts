import { Device } from 'mediasoup-client'
import { socket } from '@/lib/socket'
import { iceServers, getIceServers } from '@/lib/video/iceServers'
import {
  emit,
  joinVideoRoom,
  leaveVideoRoom,
  createDevice,
  createTransport,
  produceTrack,
  consumeProducer,
  closeProducer,
  getLocalMediaStream,
  getScreenShareStream,
  createStreamFromTrack,
} from '@/lib/video/mediasoupClient'

jest.mock('mediasoup-client', () => ({ Device: jest.fn() }))
jest.mock('@/lib/socket', () => ({ socket: { emit: jest.fn() } }))

type AckHandler = (response?: unknown) => void
type TransportHandler = (params: Record<string, unknown>, callback: jest.Mock, errback: jest.Mock) => Promise<void>

const mockedSocketEmit = socket.emit as jest.Mock
const MockedDevice = Device as unknown as jest.Mock

/** Fait répondre le serveur (callback d'acquittement) selon l'événement émis. */
function mockServer(responses: Record<string, unknown>) {
  mockedSocketEmit.mockImplementation((event: string, _data: unknown, ack?: AckHandler) => {
    ack?.(responses[event])
  })
}

function makeTransport(id = 't1') {
  const handlers: Record<string, TransportHandler> = {}
  return {
    id,
    handlers,
    on: jest.fn((event: string, handler: TransportHandler) => {
      handlers[event] = handler
    }),
    produce: jest.fn(),
    consume: jest.fn(),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('iceServers', () => {
  it('expose les serveurs STUN Google', () => {
    expect(getIceServers()).toBe(iceServers)
    expect(iceServers).toHaveLength(3)
    expect(iceServers[0]).toEqual({ urls: 'stun:stun.l.google.com:19302' })
  })
})

describe('mediasoupClient', () => {
  describe('emit', () => {
    it("resout la promesse avec la reponse d'acquittement du serveur", async () => {
      mockServer({ ping: { pong: true } })

      await expect(emit('ping', { a: 1 })).resolves.toEqual({ pong: true })
      expect(mockedSocketEmit).toHaveBeenCalledWith('ping', { a: 1 }, expect.any(Function))
    })
  })

  describe('joinVideoRoom / leaveVideoRoom', () => {
    it('rejoint la room video de la conversation', async () => {
      const response = { rtpCapabilities: {}, existingProducers: ['p1'] }
      mockServer({ join_video: response })

      await expect(joinVideoRoom('c1')).resolves.toBe(response)
      expect(mockedSocketEmit).toHaveBeenCalledWith('join_video', { conversation_id: 'c1' }, expect.any(Function))
    })

    it('quitte la room video sans attendre de reponse', () => {
      leaveVideoRoom('c1')
      expect(mockedSocketEmit).toHaveBeenCalledWith('leave_video', { conversation_id: 'c1' })
    })
  })

  describe('createDevice', () => {
    it('cree et charge un Device avec les capacites du routeur', async () => {
      const load = jest.fn().mockResolvedValue(undefined)
      MockedDevice.mockImplementation(() => ({ load }))
      const caps = { codecs: [] }

      const device = await createDevice(caps as never)

      expect(device).toEqual({ load })
      expect(load).toHaveBeenCalledWith({ routerRtpCapabilities: caps })
    })
  })

  describe('createTransport', () => {
    const transportData = { id: 't1', iceParameters: {}, iceCandidates: [], dtlsParameters: {} }

    function makeDevice(transport: ReturnType<typeof makeTransport>) {
      return {
        createSendTransport: jest.fn(() => transport),
        createRecvTransport: jest.fn(() => transport),
      }
    }

    it('cree un transport d envoi avec les serveurs ICE et gere connect/produce', async () => {
      const transport = makeTransport()
      const device = makeDevice(transport)
      mockServer({ create_transport: transportData, connect_transport: undefined, produce: { id: 'prod-1' } })

      const result = await createTransport(device as never, 'c1', 'send')

      expect(result).toBe(transport)
      expect(mockedSocketEmit).toHaveBeenCalledWith(
        'create_transport',
        { conversation_id: 'c1', direction: 'send' },
        expect.any(Function),
      )
      expect(device.createSendTransport).toHaveBeenCalledWith({ ...transportData, iceServers })
      expect(device.createRecvTransport).not.toHaveBeenCalled()

      const connectCb = jest.fn()
      await transport.handlers.connect({ dtlsParameters: { role: 'client' } }, connectCb, jest.fn())
      expect(mockedSocketEmit).toHaveBeenCalledWith(
        'connect_transport',
        { conversation_id: 'c1', transportId: 't1', dtlsParameters: { role: 'client' } },
        expect.any(Function),
      )
      expect(connectCb).toHaveBeenCalled()

      const produceCb = jest.fn()
      await transport.handlers.produce({ kind: 'video', rtpParameters: { x: 1 } }, produceCb, jest.fn())
      expect(mockedSocketEmit).toHaveBeenCalledWith(
        'produce',
        { conversation_id: 'c1', transportId: 't1', kind: 'video', rtpParameters: { x: 1 } },
        expect.any(Function),
      )
      expect(produceCb).toHaveBeenCalledWith({ id: 'prod-1' })
    })

    it('cree un transport de reception sans gestionnaire produce', async () => {
      const transport = makeTransport()
      const device = makeDevice(transport)
      mockServer({ create_transport: transportData })

      await createTransport(device as never, 'c1', 'recv')

      expect(device.createRecvTransport).toHaveBeenCalledWith({ ...transportData, iceServers })
      expect(Object.keys(transport.handlers)).toEqual(['connect'])
    })

    it('appelle errback si la signalisation echoue', async () => {
      const transport = makeTransport()
      const device = makeDevice(transport)
      mockServer({ create_transport: transportData })
      await createTransport(device as never, 'c1', 'send')

      const failure = new Error('socket ko')
      mockedSocketEmit.mockImplementation(() => {
        throw failure
      })

      const connectErr = jest.fn()
      await transport.handlers.connect({ dtlsParameters: {} }, jest.fn(), connectErr)
      expect(connectErr).toHaveBeenCalledWith(failure)

      const produceCb = jest.fn()
      const produceErr = jest.fn()
      await transport.handlers.produce({ kind: 'audio', rtpParameters: {} }, produceCb, produceErr)
      expect(produceErr).toHaveBeenCalledWith(failure)
      expect(produceCb).not.toHaveBeenCalled()
    })
  })

  describe('produceTrack', () => {
    it('produit le track sur le transport', async () => {
      const transport = makeTransport()
      transport.produce.mockResolvedValue({ id: 'prod' })
      const track = { kind: 'video' }

      await expect(produceTrack(transport as never, track as never)).resolves.toEqual({ id: 'prod' })
      expect(transport.produce).toHaveBeenCalledWith({ track })
    })
  })

  describe('consumeProducer', () => {
    const device = { rtpCapabilities: { codecs: [] } }

    it('consomme le producer distant et le reprend', async () => {
      const consumerData = { id: 'cons', producerId: 'p1', kind: 'video', rtpParameters: {} }
      mockServer({ consume: consumerData })
      const consumer = { resume: jest.fn().mockResolvedValue(undefined) }
      const transport = makeTransport()
      transport.consume.mockResolvedValue(consumer)

      const result = await consumeProducer(transport as never, device as never, 'c1', 'p1')

      expect(result).toBe(consumer)
      expect(mockedSocketEmit).toHaveBeenCalledWith(
        'consume',
        { conversation_id: 'c1', producerId: 'p1', rtpCapabilities: device.rtpCapabilities },
        expect.any(Function),
      )
      expect(transport.consume).toHaveBeenCalledWith(consumerData)
      expect(consumer.resume).toHaveBeenCalled()
    })

    it('ignore une erreur de reprise du consumer', async () => {
      mockServer({ consume: { id: 'cons' } })
      const consumer = { resume: jest.fn().mockRejectedValue(new Error('ko')) }
      const transport = makeTransport()
      transport.consume.mockResolvedValue(consumer)

      await expect(consumeProducer(transport as never, device as never, 'c1', 'p1')).resolves.toBe(consumer)
    })

    it('renvoie null si le serveur refuse la consommation', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockServer({ consume: { error: 'cannot consume' } })
      const transport = makeTransport()

      await expect(consumeProducer(transport as never, device as never, 'c1', 'p1')).resolves.toBeNull()
      expect(transport.consume).not.toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalledWith('Cannot consume producer:', 'cannot consume')
      errorSpy.mockRestore()
    })
  })

  describe('closeProducer', () => {
    it('notifie le serveur puis ferme le producer', () => {
      const producer = { id: 'prod', close: jest.fn() }

      closeProducer('c1', producer as never)

      expect(mockedSocketEmit).toHaveBeenCalledWith('close_producer', { conversation_id: 'c1', producerId: 'prod' })
      expect(producer.close).toHaveBeenCalled()
    })
  })

  describe('flux media', () => {
    const originalMediaDevices = navigator.mediaDevices
    const getUserMedia = jest.fn()
    const getDisplayMedia = jest.fn()

    beforeAll(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia, getDisplayMedia },
        configurable: true,
      })
    })

    afterAll(() => {
      Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    })

    it('demande la camera en 720p/24fps et le micro', async () => {
      getUserMedia.mockResolvedValue('stream')

      await expect(getLocalMediaStream()).resolves.toBe('stream')
      expect(getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280, max: 1280 },
          height: { ideal: 720, max: 720 },
          frameRate: { ideal: 24, max: 24 },
        },
        audio: true,
      })
    })

    it("demande le partage d'ecran sans audio", async () => {
      getDisplayMedia.mockResolvedValue('screen')

      await expect(getScreenShareStream()).resolves.toBe('screen')
      expect(getDisplayMedia).toHaveBeenCalledWith({
        video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 5 } },
        audio: false,
      })
    })
  })

  describe('createStreamFromTrack', () => {
    const originalMediaStream = global.MediaStream

    afterEach(() => {
      global.MediaStream = originalMediaStream
    })

    it('cree un MediaStream contenant le track', () => {
      const addTrack = jest.fn()
      global.MediaStream = jest.fn(() => ({ addTrack })) as unknown as typeof MediaStream
      const track = { kind: 'audio' }

      const stream = createStreamFromTrack(track as never)

      expect(stream).toEqual({ addTrack })
      expect(addTrack).toHaveBeenCalledWith(track)
    })
  })
})
