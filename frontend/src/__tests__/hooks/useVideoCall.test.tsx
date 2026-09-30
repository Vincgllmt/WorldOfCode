import { renderHook, act } from '@testing-library/react'
import { useVideoCall } from '@/hooks/useVideoCall'
import { socket } from '@/lib/socket'
import {
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

type Handler = (payload: Record<string, unknown>) => unknown
const mockHandlers: Record<string, Handler> = {}

jest.mock('@/lib/socket', () => ({
  socket: {
    id: 'me-socket',
    connected: false,
    auth: {},
    connect: jest.fn(),
    on: jest.fn((event: string, handler: Handler) => {
      mockHandlers[event] = handler
    }),
    off: jest.fn(),
  },
}))
jest.mock('@/lib/video/mediasoupClient')

let mockUser: { id: number; token: string } | null = { id: 1, token: 'tok' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockedSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  connect: jest.Mock
  on: jest.Mock
  off: jest.Mock
}
const mockedJoinVideoRoom = joinVideoRoom as jest.Mock
const mockedLeaveVideoRoom = leaveVideoRoom as jest.Mock
const mockedCreateDevice = createDevice as jest.Mock
const mockedCreateTransport = createTransport as jest.Mock
const mockedProduceTrack = produceTrack as jest.Mock
const mockedConsumeProducer = consumeProducer as jest.Mock
const mockedCloseProducer = closeProducer as jest.Mock
const mockedGetLocalMediaStream = getLocalMediaStream as jest.Mock
const mockedGetScreenShareStream = getScreenShareStream as jest.Mock
const mockedCreateStreamFromTrack = createStreamFromTrack as jest.Mock

function makeTrack(kind: 'audio' | 'video') {
  return { kind, stop: jest.fn(), onended: null as null | (() => void) }
}

function makeStream(tracks: ReturnType<typeof makeTrack>[]) {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
  }
}

function makeClosable(extra: Record<string, unknown> = {}) {
  return { close: jest.fn(), pause: jest.fn(), resume: jest.fn(), ...extra }
}

let videoTrack: ReturnType<typeof makeTrack>
let audioTrack: ReturnType<typeof makeTrack>
let localStream: ReturnType<typeof makeStream>
let sendTransport: ReturnType<typeof makeClosable>
let recvTransport: ReturnType<typeof makeClosable>
let videoProducer: ReturnType<typeof makeClosable>
let audioProducer: ReturnType<typeof makeClosable>

beforeEach(() => {
  jest.clearAllMocks()
  Object.keys(mockHandlers).forEach((k) => delete mockHandlers[k])
  document.body.innerHTML = ''
  mockedSocket.connected = false
  mockedSocket.auth = {}
  mockUser = { id: 1, token: 'tok' }

  videoTrack = makeTrack('video')
  audioTrack = makeTrack('audio')
  localStream = makeStream([videoTrack, audioTrack])
  sendTransport = makeClosable()
  recvTransport = makeClosable()
  videoProducer = makeClosable({ id: 'vp' })
  audioProducer = makeClosable({ id: 'ap' })

  mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: { codecs: [] }, existingProducers: [] })
  mockedCreateDevice.mockResolvedValue({ device: true })
  mockedCreateTransport.mockImplementation((_d, _c, direction) =>
    Promise.resolve(direction === 'send' ? sendTransport : recvTransport),
  )
  mockedGetLocalMediaStream.mockResolvedValue(localStream)
  mockedProduceTrack.mockImplementation((_t, track) =>
    Promise.resolve(track.kind === 'video' ? videoProducer : audioProducer),
  )
  mockedCreateStreamFromTrack.mockImplementation((track) => ({ fromTrack: track }))
  mockedConsumeProducer.mockImplementation((_t, _d, _c, producerId: string) =>
    Promise.resolve(makeClosable({ kind: producerId.startsWith('a') ? 'audio' : 'video', track: { id: producerId } })),
  )
})

async function startConnectedCall(options: { onCallEnded?: () => void } = {}) {
  const hook = renderHook(() => useVideoCall({ conversationId: 'c1', ...options }))
  await act(() => hook.result.current.startCall())
  return hook
}

describe('useVideoCall', () => {
  it('est inactif au depart', () => {
    const { result } = renderHook(() => useVideoCall({ conversationId: 'c1' }))

    expect(result.current).toMatchObject({
      callState: 'idle',
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      localStream: null,
      screenStream: null,
    })
    expect(result.current.remoteStreams.size).toBe(0)
  })

  describe('startCall', () => {
    it('ne fait rien sans utilisateur', async () => {
      mockUser = null
      const { result } = renderHook(() => useVideoCall({ conversationId: 'c1' }))

      await act(() => result.current.startCall())

      expect(mockedJoinVideoRoom).not.toHaveBeenCalled()
      expect(result.current.callState).toBe('idle')
    })

    it('connecte le socket, cree device/transports, produit audio et video', async () => {
      const { result } = await startConnectedCall()

      expect(mockedSocket.auth).toEqual({ token: 'tok', userId: 1 })
      expect(mockedSocket.connect).toHaveBeenCalled()
      expect(mockedJoinVideoRoom).toHaveBeenCalledWith('c1')
      expect(mockedCreateDevice).toHaveBeenCalledWith({ codecs: [] })
      expect(mockedCreateTransport).toHaveBeenCalledWith({ device: true }, 'c1', 'send')
      expect(mockedCreateTransport).toHaveBeenCalledWith({ device: true }, 'c1', 'recv')
      expect(mockedProduceTrack).toHaveBeenCalledWith(sendTransport, videoTrack)
      expect(mockedProduceTrack).toHaveBeenCalledWith(sendTransport, audioTrack)
      expect(result.current.localStream).toBe(localStream)
      expect(result.current.callState).toBe('connected')
    })

    it('ne reconnecte pas un socket deja connecte et gere un flux sans pistes', async () => {
      mockedSocket.connected = true
      mockedGetLocalMediaStream.mockResolvedValue(makeStream([]))

      const { result } = await startConnectedCall()

      expect(mockedSocket.connect).not.toHaveBeenCalled()
      expect(mockedProduceTrack).not.toHaveBeenCalled()
      expect(result.current.callState).toBe('connected')
    })

    it('consomme les producers existants (video en stream distant, audio en element <audio>)', async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1', 'a1', 'v1'] })

      const { result } = await startConnectedCall()

      expect(mockedConsumeProducer).toHaveBeenCalledTimes(2)
      expect(mockedConsumeProducer).toHaveBeenCalledWith(recvTransport, { device: true }, 'c1', 'v1')
      expect([...result.current.remoteStreams.keys()]).toEqual(['v1'])
      const audio = document.getElementById('remote-audio-a1') as HTMLAudioElement
      expect(audio).not.toBeNull()
      expect(audio.autoplay).toBe(true)
      expect((audio as unknown as { srcObject: unknown }).srcObject).toEqual({ fromTrack: { id: 'a1' } })
    })

    it('ignore un producer que le serveur refuse de consommer', async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1'] })
      mockedConsumeProducer.mockResolvedValue(null)

      const { result } = await startConnectedCall()

      expect(result.current.remoteStreams.size).toBe(0)
      expect(result.current.callState).toBe('connected')
    })

    it("revient a l'etat idle si la connexion echoue", async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockedGetLocalMediaStream.mockRejectedValue(new Error('permission denied'))

      const { result } = await startConnectedCall()

      expect(result.current.callState).toBe('idle')
      expect(errorSpy).toHaveBeenCalledWith('Failed to start call:', expect.any(Error))
      errorSpy.mockRestore()
    })
  })

  describe('endCall', () => {
    it('libere toutes les ressources, quitte la room et previent le parent', async () => {
      const onCallEnded = jest.fn()
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1', 'a1'] })
      const { result } = await startConnectedCall({ onCallEnded })
      act(() => result.current.toggleMute())

      act(() => result.current.endCall())

      expect(videoProducer.close).toHaveBeenCalled()
      expect(audioProducer.close).toHaveBeenCalled()
      expect(sendTransport.close).toHaveBeenCalled()
      expect(recvTransport.close).toHaveBeenCalled()
      expect(videoTrack.stop).toHaveBeenCalled()
      expect(audioTrack.stop).toHaveBeenCalled()
      expect(document.getElementById('remote-audio-a1')).toBeNull()
      expect(mockedLeaveVideoRoom).toHaveBeenCalledWith('c1')
      expect(onCallEnded).toHaveBeenCalled()
      expect(result.current).toMatchObject({
        callState: 'idle',
        isMuted: false,
        localStream: null,
      })
      expect(result.current.remoteStreams.size).toBe(0)
    })

    it('fonctionne meme sans appel en cours', () => {
      const { result } = renderHook(() => useVideoCall({ conversationId: 'c1' }))

      act(() => result.current.endCall())

      expect(mockedLeaveVideoRoom).toHaveBeenCalledWith('c1')
    })
  })

  describe('toggleMute / toggleCamera', () => {
    it('met en pause puis reprend le micro', async () => {
      const { result } = await startConnectedCall()

      act(() => result.current.toggleMute())
      expect(audioProducer.pause).toHaveBeenCalled()
      expect(result.current.isMuted).toBe(true)

      act(() => result.current.toggleMute())
      expect(audioProducer.resume).toHaveBeenCalled()
      expect(result.current.isMuted).toBe(false)
    })

    it('met en pause puis reprend la camera', async () => {
      const { result } = await startConnectedCall()

      act(() => result.current.toggleCamera())
      expect(videoProducer.pause).toHaveBeenCalled()
      expect(result.current.isCameraOff).toBe(true)

      act(() => result.current.toggleCamera())
      expect(videoProducer.resume).toHaveBeenCalled()
      expect(result.current.isCameraOff).toBe(false)
    })

    it('ne change rien sans producer', () => {
      const { result } = renderHook(() => useVideoCall({ conversationId: 'c1' }))

      act(() => result.current.toggleMute())
      act(() => result.current.toggleCamera())

      expect(result.current.isMuted).toBe(false)
      expect(result.current.isCameraOff).toBe(false)
    })
  })

  describe('toggleScreenShare', () => {
    it('ne fait rien sans transport d envoi', async () => {
      const { result } = renderHook(() => useVideoCall({ conversationId: 'c1' }))

      await act(() => result.current.toggleScreenShare())

      expect(mockedGetScreenShareStream).not.toHaveBeenCalled()
    })

    it("demarre puis arrete le partage d'ecran", async () => {
      const screenTrack = makeTrack('video')
      const screenStream = makeStream([screenTrack])
      const screenProducer = makeClosable({ id: 'sp' })
      mockedGetScreenShareStream.mockResolvedValue(screenStream)
      const { result } = await startConnectedCall()
      mockedProduceTrack.mockResolvedValueOnce(screenProducer)

      await act(() => result.current.toggleScreenShare())

      expect(mockedProduceTrack).toHaveBeenLastCalledWith(sendTransport, screenTrack)
      expect(result.current.isScreenSharing).toBe(true)
      expect(result.current.screenStream).toBe(screenStream)

      await act(() => result.current.toggleScreenShare())

      expect(screenTrack.stop).toHaveBeenCalled()
      expect(mockedCloseProducer).toHaveBeenCalledWith('c1', screenProducer)
      expect(result.current.isScreenSharing).toBe(false)
      expect(result.current.screenStream).toBeNull()
    })

    it("arrete le partage quand l'utilisateur le coupe depuis le navigateur", async () => {
      const screenTrack = makeTrack('video')
      const screenProducer = makeClosable({ id: 'sp' })
      mockedGetScreenShareStream.mockResolvedValue(makeStream([screenTrack]))
      const { result } = await startConnectedCall()
      mockedProduceTrack.mockResolvedValueOnce(screenProducer)
      await act(() => result.current.toggleScreenShare())

      act(() => screenTrack.onended?.())

      expect(mockedCloseProducer).toHaveBeenCalledWith('c1', screenProducer)
      expect(result.current.isScreenSharing).toBe(false)

      // Un second "ended" ne referme pas un producer deja libere
      act(() => screenTrack.onended?.())
      expect(mockedCloseProducer).toHaveBeenCalledTimes(1)
    })

    it('reste inchange si l utilisateur annule le selecteur', async () => {
      mockedGetScreenShareStream.mockRejectedValue(new DOMException('annule'))
      const { result } = await startConnectedCall()

      await act(() => result.current.toggleScreenShare())

      expect(result.current.isScreenSharing).toBe(false)
    })
  })

  describe('evenements socket', () => {
    it("n'ecoute les producers qu'une fois connecte, et se desabonne ensuite", async () => {
      const { result, unmount } = renderHook(() => useVideoCall({ conversationId: 'c1' }))
      expect(mockedSocket.on).not.toHaveBeenCalled()

      await act(() => result.current.startCall())
      expect(Object.keys(mockHandlers).sort()).toEqual(['new_producer', 'producer_closed'])

      unmount()
      expect(mockedSocket.off).toHaveBeenCalledWith('new_producer', mockHandlers.new_producer)
      expect(mockedSocket.off).toHaveBeenCalledWith('producer_closed', mockHandlers.producer_closed)
    })

    it('consomme un nouveau producer distant mais ignore les siens', async () => {
      const { result } = await startConnectedCall()

      await act(async () => {
        await mockHandlers.new_producer({ producerId: 'mine', peerId: 'me-socket' })
      })
      expect(mockedConsumeProducer).not.toHaveBeenCalled()

      await act(async () => {
        await mockHandlers.new_producer({ producerId: 'v2', peerId: 'other' })
      })
      expect(mockedConsumeProducer).toHaveBeenCalledWith(recvTransport, { device: true }, 'c1', 'v2')
      expect(result.current.remoteStreams.has('v2')).toBe(true)
    })

    it('retire le stream et l element audio quand un producer distant se ferme', async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1', 'a1'] })
      const { result } = await startConnectedCall()
      const videoConsumer = await mockedConsumeProducer.mock.results[0].value

      act(() => {
        mockHandlers.producer_closed({ producerId: 'v1' })
        mockHandlers.producer_closed({ producerId: 'a1' })
        mockHandlers.producer_closed({ producerId: 'unknown' })
      })

      expect(videoConsumer.close).toHaveBeenCalled()
      expect(result.current.remoteStreams.size).toBe(0)
      expect(document.getElementById('remote-audio-a1')).toBeNull()
    })
  })
})
