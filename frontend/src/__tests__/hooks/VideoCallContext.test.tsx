import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import { VideoCallProvider, useVideoCallContext } from '@/contexts/VideoCallContext'
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

type Handler = (payload?: unknown) => unknown
const mockHandlers: Record<string, Handler> = {}

jest.mock('@/lib/socket', () => ({
  socket: {
    id: 'me-socket',
    connected: false,
    auth: {},
    connect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Handler) => {
      mockHandlers[event] = handler
    }),
    off: jest.fn(),
  },
}))
jest.mock('@/lib/video/mediasoupClient')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

let mockUser: { id: number; token: string } | null = { id: 1, token: 'tok' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const mockedSocket = socket as unknown as {
  connected: boolean
  auth: Record<string, unknown>
  connect: jest.Mock
  emit: jest.Mock
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

const wrapper = ({ children }: { children: ReactNode }) => <VideoCallProvider>{children}</VideoCallProvider>
const renderContext = () => renderHook(() => useVideoCallContext(), { wrapper })

/** Joue la réponse d'acquittement du serveur à `call_initiate`. */
function answerCallInitiate(response: unknown) {
  const call = mockedSocket.emit.mock.calls.find(([event]) => event === 'call_initiate')
  act(() => call![2](response))
}

/** Appelant : lance l'appel puis simule l'acceptation par le destinataire. */
async function connectAsCaller(conversationId = 'c1') {
  const hook = renderContext()
  await act(() => hook.result.current.startCall(conversationId))
  await act(async () => {
    await mockHandlers.call_accepted({ conversation_id: conversationId })
  })
  return hook
}

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

describe('useVideoCallContext', () => {
  it('lance une erreur hors du provider', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useVideoCallContext())).toThrow(
      'useVideoCallContext must be used within a VideoCallProvider',
    )
    errorSpy.mockRestore()
  })
})

describe('VideoCallProvider', () => {
  it('est inactif au depart', () => {
    const { result } = renderContext()

    expect(result.current).toMatchObject({
      isCallActive: false,
      isMinimized: false,
      callState: 'idle',
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
      localStream: null,
      screenStream: null,
      currentConversationId: null,
      incomingCall: null,
    })
  })

  describe('connexion socket globale', () => {
    it("connecte le socket des qu'un utilisateur est authentifie", () => {
      renderContext()

      expect(mockedSocket.auth).toEqual({ token: 'tok', userId: 1 })
      expect(mockedSocket.connect).toHaveBeenCalled()
    })

    it('met a jour les credentials sans reconnecter un socket deja connecte', () => {
      mockedSocket.connected = true
      renderContext()

      expect(mockedSocket.auth).toEqual({ token: 'tok', userId: 1 })
      expect(mockedSocket.connect).not.toHaveBeenCalled()
    })

    it("n'ecoute pas la signalisation d'appel sans utilisateur", () => {
      mockUser = null
      renderContext()

      expect(mockedSocket.connect).not.toHaveBeenCalled()
      expect(mockHandlers.incoming_call).toBeUndefined()
      // L'écoute de la déconnexion est, elle, toujours active
      expect(mockHandlers.disconnect).toBeDefined()
    })

    it('se desabonne de tous les evenements au demontage', () => {
      const { unmount } = renderContext()
      const events = Object.keys(mockHandlers)

      unmount()

      for (const event of events) {
        expect(mockedSocket.off).toHaveBeenCalledWith(event, mockHandlers[event])
      }
    })
  })

  describe('startCall (appelant)', () => {
    it('ne fait rien sans utilisateur', async () => {
      mockUser = null
      const { result } = renderContext()

      await act(() => result.current.startCall('c1'))

      expect(mockedSocket.emit).not.toHaveBeenCalled()
    })

    it("emet call_initiate et passe en etat d'appel", async () => {
      const { result } = renderContext()

      await act(() => result.current.startCall('c1'))

      expect(mockedSocket.emit).toHaveBeenCalledWith('call_initiate', { conversation_id: 'c1' }, expect.any(Function))
      expect(result.current).toMatchObject({ isCallActive: true, callState: 'calling', currentConversationId: 'c1' })
    })

    it('ignore un second appel sur la meme conversation', async () => {
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      await act(() => result.current.startCall('c1'))

      expect(mockedSocket.emit.mock.calls.filter(([e]) => e === 'call_initiate')).toHaveLength(1)
    })

    it("quitte l'appel precedent si on appelle une autre conversation", async () => {
      const { result } = await connectAsCaller('c1')

      await act(() => result.current.startCall('c2'))

      expect(mockedLeaveVideoRoom).toHaveBeenCalledWith('c1')
      expect(videoProducer.close).toHaveBeenCalled()
      expect(result.current.currentConversationId).toBe('c2')
    })

    it('reste actif si le serveur accepte la demande', async () => {
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      answerCallInitiate({ success: true })

      expect(result.current.isCallActive).toBe(true)
      expect(toast.error).not.toHaveBeenCalled()
    })

    it.each([
      ['user_offline', "L'utilisateur est hors ligne"],
      ['busy', "Impossible de lancer l'appel"],
    ])('annule et affiche un toast si le serveur repond %s', async (error, message) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      answerCallInitiate({ error })

      expect(toast.error).toHaveBeenCalledWith(message)
      expect(result.current).toMatchObject({ isCallActive: false, callState: 'idle', currentConversationId: null })
      errorSpy.mockRestore()
    })

    it("se connecte a la room video quand l'appel est accepte", async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1', 'a1'] })

      const { result } = await connectAsCaller('c1')

      expect(mockedJoinVideoRoom).toHaveBeenCalledWith('c1')
      expect(mockedCreateTransport).toHaveBeenCalledWith({ device: true }, 'c1', 'send')
      expect(mockedCreateTransport).toHaveBeenCalledWith({ device: true }, 'c1', 'recv')
      expect(mockedProduceTrack).toHaveBeenCalledWith(sendTransport, videoTrack)
      expect(mockedProduceTrack).toHaveBeenCalledWith(sendTransport, audioTrack)
      expect(result.current.callState).toBe('connected')
      expect(result.current.localStream).toBe(localStream)
      expect([...result.current.remoteStreams.keys()]).toEqual(['v1'])
      expect(document.getElementById('remote-audio-a1')).not.toBeNull()
    })

    it('gere un flux local sans pistes et un producer non consommable', async () => {
      mockedSocket.connected = true
      mockedGetLocalMediaStream.mockResolvedValue(makeStream([]))
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1'] })
      mockedConsumeProducer.mockResolvedValue(null)

      const { result } = await connectAsCaller('c1')

      expect(mockedProduceTrack).not.toHaveBeenCalled()
      expect(result.current.remoteStreams.size).toBe(0)
      expect(result.current.callState).toBe('connected')
    })

    it('affiche une erreur et reinitialise si la connexion a la room echoue', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockedJoinVideoRoom.mockRejectedValue(new Error('ko'))

      const { result } = await connectAsCaller('c1')

      expect(toast.error).toHaveBeenCalledWith("Erreur de connexion à l'appel")
      expect(result.current).toMatchObject({ isCallActive: false, callState: 'idle', currentConversationId: null })
      errorSpy.mockRestore()
    })

    it.each([
      ['call_rejected', "L'appel a été refusé"],
      ['call_timeout', 'Pas de réponse'],
    ])('reinitialise et affiche un toast sur %s', async (event, message) => {
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      act(() => {
        mockHandlers[event]()
      })

      expect(toast.error).toHaveBeenCalledWith(message)
      expect(result.current).toMatchObject({ isCallActive: false, callState: 'idle', currentConversationId: null })
    })
  })

  describe('appel entrant (destinataire)', () => {
    const incoming = { conversation_id: 'c9', callerId: 2, callerUsername: 'bob' }

    it("affiche l'appel entrant", () => {
      const { result } = renderContext()

      act(() => {
        mockHandlers.incoming_call(incoming)
      })

      expect(result.current.incomingCall).toEqual({ conversationId: 'c9', callerId: 2, callerUsername: 'bob' })
    })

    it('refuse automatiquement un appel entrant pendant un appel en cours', async () => {
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      act(() => {
        mockHandlers.incoming_call(incoming)
      })

      expect(mockedSocket.emit).toHaveBeenCalledWith('call_reject', { conversation_id: 'c9' })
      expect(result.current.incomingCall).toBeNull()
    })

    it("accepte l'appel et se connecte a la room", async () => {
      const { result } = renderContext()
      act(() => {
        mockHandlers.incoming_call(incoming)
      })

      await act(async () => result.current.acceptIncomingCall())

      expect(mockedSocket.emit).toHaveBeenCalledWith('call_accept', { conversation_id: 'c9' })
      expect(mockedJoinVideoRoom).toHaveBeenCalledWith('c9')
      expect(result.current.incomingCall).toBeNull()
      expect(result.current.callState).toBe('connected')
    })

    it("refuse l'appel", () => {
      const { result } = renderContext()
      act(() => {
        mockHandlers.incoming_call(incoming)
      })

      act(() => result.current.rejectIncomingCall())

      expect(mockedSocket.emit).toHaveBeenCalledWith('call_reject', { conversation_id: 'c9' })
      expect(result.current.incomingCall).toBeNull()
    })

    it('accepter ou refuser sans appel entrant ne fait rien', () => {
      const { result } = renderContext()

      act(() => result.current.acceptIncomingCall())
      act(() => result.current.rejectIncomingCall())

      expect(mockedSocket.emit).not.toHaveBeenCalled()
    })

    it("masque l'appel entrant si l'appelant annule cette conversation uniquement", () => {
      const { result } = renderContext()
      act(() => {
        mockHandlers.incoming_call(incoming)
      })

      act(() => {
        mockHandlers.call_cancelled({ conversation_id: 'other' })
      })
      expect(result.current.incomingCall).not.toBeNull()

      act(() => {
        mockHandlers.call_cancelled({ conversation_id: 'c9' })
      })
      expect(result.current.incomingCall).toBeNull()
    })

    it("ne se connecte pas si l'utilisateur s'est deconnecte entre-temps", async () => {
      const { result, rerender } = renderContext()
      act(() => {
        mockHandlers.incoming_call(incoming)
      })
      mockUser = null
      rerender()

      await act(async () => result.current.acceptIncomingCall())

      expect(mockedJoinVideoRoom).not.toHaveBeenCalled()
    })
  })

  describe('endCall', () => {
    it("annule l'appel s'il est encore en sonnerie", async () => {
      const { result } = renderContext()
      await act(() => result.current.startCall('c1'))

      act(() => result.current.endCall())

      expect(mockedSocket.emit).toHaveBeenCalledWith('call_cancel', { conversation_id: 'c1' })
      expect(mockedLeaveVideoRoom).toHaveBeenCalledWith('c1')
      expect(result.current).toMatchObject({ isCallActive: false, callState: 'idle', currentConversationId: null })
    })

    it('libere toutes les ressources media d un appel connecte', async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['a1'] })
      const { result } = await connectAsCaller('c1')
      act(() => result.current.setMinimized(true))

      act(() => result.current.endCall())

      expect(mockedSocket.emit).not.toHaveBeenCalledWith('call_cancel', expect.anything())
      expect(videoProducer.close).toHaveBeenCalled()
      expect(audioProducer.close).toHaveBeenCalled()
      expect(sendTransport.close).toHaveBeenCalled()
      expect(recvTransport.close).toHaveBeenCalled()
      expect(videoTrack.stop).toHaveBeenCalled()
      expect(document.getElementById('remote-audio-a1')).toBeNull()
      expect(result.current).toMatchObject({ isMinimized: false, localStream: null, callState: 'idle' })
    })

    it('ne quitte aucune room sans appel en cours', () => {
      const { result } = renderContext()

      act(() => result.current.endCall())

      expect(mockedLeaveVideoRoom).not.toHaveBeenCalled()
    })
  })

  describe('controles media', () => {
    it('coupe et reactive le micro et la camera', async () => {
      const { result } = await connectAsCaller('c1')

      act(() => result.current.toggleMute())
      act(() => result.current.toggleCamera())
      expect(audioProducer.pause).toHaveBeenCalled()
      expect(videoProducer.pause).toHaveBeenCalled()
      expect(result.current).toMatchObject({ isMuted: true, isCameraOff: true })

      act(() => result.current.toggleMute())
      act(() => result.current.toggleCamera())
      expect(audioProducer.resume).toHaveBeenCalled()
      expect(videoProducer.resume).toHaveBeenCalled()
      expect(result.current).toMatchObject({ isMuted: false, isCameraOff: false })
    })

    it('ne change rien sans producers', async () => {
      const { result } = renderContext()

      act(() => result.current.toggleMute())
      act(() => result.current.toggleCamera())
      await act(async () => result.current.toggleScreenShare())

      expect(result.current).toMatchObject({ isMuted: false, isCameraOff: false, isScreenSharing: false })
      expect(mockedGetScreenShareStream).not.toHaveBeenCalled()
    })

    it("demarre puis arrete le partage d'ecran", async () => {
      const screenTrack = makeTrack('video')
      const screenStream = makeStream([screenTrack])
      const screenProducer = makeClosable({ id: 'sp' })
      mockedGetScreenShareStream.mockResolvedValue(screenStream)
      const { result } = await connectAsCaller('c1')
      mockedProduceTrack.mockResolvedValueOnce(screenProducer)

      await act(async () => result.current.toggleScreenShare())
      expect(result.current).toMatchObject({ isScreenSharing: true, screenStream })

      await act(async () => result.current.toggleScreenShare())
      expect(screenTrack.stop).toHaveBeenCalled()
      expect(mockedCloseProducer).toHaveBeenCalledWith('c1', screenProducer)
      expect(result.current).toMatchObject({ isScreenSharing: false, screenStream: null })
    })

    it("arrete le partage quand la piste d'ecran se termine", async () => {
      const screenTrack = makeTrack('video')
      const screenProducer = makeClosable({ id: 'sp' })
      mockedGetScreenShareStream.mockResolvedValue(makeStream([screenTrack]))
      const { result } = await connectAsCaller('c1')
      mockedProduceTrack.mockResolvedValueOnce(screenProducer)
      await act(async () => result.current.toggleScreenShare())

      act(() => screenTrack.onended?.())
      act(() => screenTrack.onended?.())

      expect(mockedCloseProducer).toHaveBeenCalledTimes(1)
      expect(result.current.isScreenSharing).toBe(false)
    })

    it("ignore l'annulation du selecteur d'ecran", async () => {
      mockedGetScreenShareStream.mockRejectedValue(new Error('annule'))
      const { result } = await connectAsCaller('c1')

      await act(async () => result.current.toggleScreenShare())

      expect(result.current.isScreenSharing).toBe(false)
    })

    it('met a jour l etat minimise', () => {
      const { result } = renderContext()

      act(() => result.current.setMinimized(true))

      expect(result.current.isMinimized).toBe(true)
    })
  })

  describe('producers distants', () => {
    it("n'ecoute les producers qu'une fois une conversation en cours", async () => {
      const { result } = renderContext()
      expect(mockHandlers.new_producer).toBeUndefined()

      await act(() => result.current.startCall('c1'))

      expect(mockHandlers.new_producer).toBeDefined()
      expect(mockHandlers.producer_closed).toBeDefined()
    })

    it('consomme immediatement un nouveau producer distant, sauf le sien', async () => {
      const { result } = await connectAsCaller('c1')

      await act(async () => {
        await mockHandlers.new_producer({ producerId: 'mine', peerId: 'me-socket' })
        await mockHandlers.new_producer({ producerId: 'v2', peerId: 'other' })
      })

      expect(mockedConsumeProducer).toHaveBeenCalledTimes(1)
      expect(result.current.remoteStreams.has('v2')).toBe(true)
    })

    it("journalise l'echec de consommation d'un producer", async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      await connectAsCaller('c1')
      mockedConsumeProducer.mockRejectedValueOnce(new Error('ko'))

      await act(async () => {
        await mockHandlers.new_producer({ producerId: 'v2', peerId: 'other' })
      })

      expect(errorSpy).toHaveBeenCalledWith('Failed to consume producer:', 'v2', expect.any(Error))
      errorSpy.mockRestore()
    })

    it('met en file les producers recus avant que les transports soient prets', async () => {
      jest.useFakeTimers()
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      try {
        let resolveJoin!: (value: unknown) => void
        mockedJoinVideoRoom.mockReturnValue(new Promise((r) => (resolveJoin = r)))
        mockedConsumeProducer.mockImplementation((_t, _d, _c, producerId: string) =>
          producerId === 'bad'
            ? Promise.reject(new Error('ko'))
            : Promise.resolve(makeClosable({ kind: 'video', track: { id: producerId } })),
        )
        const { result } = renderContext()
        await act(() => result.current.startCall('c1'))
        await act(async () => {
          void mockHandlers.call_accepted({ conversation_id: 'c1' })
        })

        // Transports pas encore créés : les producers sont mis en attente
        await act(async () => {
          await mockHandlers.new_producer({ producerId: 'bad', peerId: 'other' })
          await mockHandlers.new_producer({ producerId: 'v3', peerId: 'other' })
        })
        expect(mockedConsumeProducer).not.toHaveBeenCalled()

        // La connexion aboutit, puis la file est retraitée 500 ms plus tard
        await act(async () => resolveJoin({ rtpCapabilities: {}, existingProducers: [] }))
        await act(() => jest.advanceTimersByTimeAsync(500))

        expect(mockedConsumeProducer).toHaveBeenCalledWith(recvTransport, { device: true }, 'c1', 'bad')
        expect(mockedConsumeProducer).toHaveBeenCalledWith(recvTransport, { device: true }, 'c1', 'v3')
        expect(errorSpy).toHaveBeenCalledWith('Failed to consume producer:', 'bad', expect.any(Error))
        expect(result.current.remoteStreams.has('v3')).toBe(true)
      } finally {
        errorSpy.mockRestore()
        jest.useRealTimers()
      }
    })

    it('retire le stream et l element audio quand un producer distant se ferme', async () => {
      mockedJoinVideoRoom.mockResolvedValue({ rtpCapabilities: {}, existingProducers: ['v1', 'a1'] })
      const { result } = await connectAsCaller('c1')
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

  describe('deconnexion du socket', () => {
    it("libere l'appel en cours mais garde l'appel entrant sur une coupure reseau", async () => {
      const { result } = await connectAsCaller('c1')
      act(() => {
        mockHandlers.incoming_call({ conversation_id: 'c9', callerId: 2, callerUsername: 'bob' })
      })

      act(() => {
        mockHandlers.connect()
        mockHandlers.disconnect('transport close')
      })

      expect(videoProducer.close).toHaveBeenCalled()
      expect(result.current).toMatchObject({ isCallActive: false, callState: 'idle', currentConversationId: null })
    })

    it("efface l'appel entrant sur une deconnexion volontaire", () => {
      const { result } = renderContext()
      act(() => {
        mockHandlers.incoming_call({ conversation_id: 'c9', callerId: 2, callerUsername: 'bob' })
      })

      act(() => {
        mockHandlers.disconnect('transport close')
      })
      expect(result.current.incomingCall).not.toBeNull()

      act(() => {
        mockHandlers.disconnect('io client disconnect')
      })
      expect(result.current.incomingCall).toBeNull()
      expect(videoProducer.close).not.toHaveBeenCalled()
    })
  })
})
