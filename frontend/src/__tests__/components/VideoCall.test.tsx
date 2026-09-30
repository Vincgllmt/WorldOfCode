import { render, screen, fireEvent } from '@testing-library/react'
import { VideoCall } from '@/components/video/VideoCall'
import { useVideoCall } from '@/hooks/useVideoCall'

jest.mock('@/hooks/useVideoCall', () => ({
  useVideoCall: jest.fn(),
}))

const mockedUseVideoCall = useVideoCall as jest.Mock

const stream = (name: string) => ({ name }) as unknown as MediaStream

type Call = ReturnType<typeof makeCall>

function makeCall(overrides: Record<string, unknown> = {}) {
  return {
    callState: 'connected',
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    remoteStreams: new Map<string, MediaStream>(),
    localStream: null,
    screenStream: null,
    startCall: jest.fn(),
    endCall: jest.fn(),
    toggleMute: jest.fn(),
    toggleCamera: jest.fn(),
    toggleScreenShare: jest.fn(),
    ...overrides,
  }
}

function renderCall(overrides: Record<string, unknown> = {}, isOpen = true) {
  const call = makeCall(overrides)
  mockedUseVideoCall.mockReturnValue(call)
  const onClose = jest.fn()
  const utils = render(<VideoCall conversationId="c1" isOpen={isOpen} onClose={onClose} />)
  const update = (next: Partial<Call>, open = isOpen) => {
    mockedUseVideoCall.mockReturnValue({ ...call, ...next })
    utils.rerender(<VideoCall conversationId="c1" isOpen={open} onClose={onClose} />)
  }
  return { ...utils, call, onClose, update }
}

const producerIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('video[data-producer-id]')).map((v) => v.getAttribute('data-producer-id'))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('VideoCall', () => {
  it('transmet la conversation et le callback de fin au hook', () => {
    const { onClose } = renderCall()
    expect(mockedUseVideoCall).toHaveBeenCalledWith({ conversationId: 'c1', onCallEnded: onClose })
  })

  it("n'affiche rien et ne demarre pas l'appel quand ferme", () => {
    const { container, call } = renderCall({ callState: 'idle' }, false)

    expect(container).toBeEmptyDOMElement()
    expect(call.startCall).not.toHaveBeenCalled()
  })

  it("demarre l'appel a l'ouverture", () => {
    const { call } = renderCall({ callState: 'idle' })
    expect(call.startCall).toHaveBeenCalled()
  })

  it("affiche l'etat de connexion", () => {
    const { call } = renderCall({ callState: 'calling' })

    expect(screen.getByText('Connexion...')).toBeInTheDocument()
    expect(screen.getByText('Connexion en cours...')).toBeInTheDocument()
    expect(screen.queryByTitle('Minimiser')).not.toBeInTheDocument()
    expect(call.startCall).not.toHaveBeenCalled()
  })

  it("affiche l'etat termine", () => {
    renderCall({ callState: 'ended' })
    expect(screen.getByText('Appel terminé')).toBeInTheDocument()
  })

  it('termine l appel et ferme la fenetre', () => {
    const { call, onClose, container } = renderCall()

    expect(screen.getByText('En attente des autres participants...')).toBeInTheDocument()
    fireEvent.click(container.querySelector('button:not([title])')!)
    fireEvent.click(screen.getByTitle('Raccrocher'))

    expect(call.endCall).toHaveBeenCalledTimes(2)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('relaie les controles media', () => {
    const { call } = renderCall()

    fireEvent.click(screen.getByTitle('Couper le micro'))
    fireEvent.click(screen.getByTitle('Désactiver la caméra'))
    fireEvent.click(screen.getByTitle("Partager l'écran"))

    expect(call.toggleMute).toHaveBeenCalled()
    expect(call.toggleCamera).toHaveBeenCalled()
    expect(call.toggleScreenShare).toHaveBeenCalled()
  })

  it("desactive le partage d'ecran si un autre participant partage deja", () => {
    renderCall({ remoteStreams: new Map([['cam', stream('cam')], ['screen', stream('screen')]]) })
    expect(screen.getByTitle("Un partage d'écran est déjà en cours")).toBeDisabled()
  })

  it('bascule le flux principal au clic sur une vignette', () => {
    const { container } = renderCall({
      remoteStreams: new Map([['cam', stream('cam')], ['screen', stream('screen')]]),
    })

    expect(producerIds(container)).toEqual(['cam', 'screen'])
    fireEvent.click(screen.getByTitle('Cliquer pour agrandir'))
    expect(producerIds(container)).toEqual(['screen', 'cam'])
  })

  it("met en avant son propre partage d'ecran", () => {
    const screenStream = stream('myscreen')
    const { container } = renderCall({
      isScreenSharing: true,
      screenStream,
      remoteStreams: new Map([['cam', stream('cam')]]),
    })

    const preview = screen.getByText('Votre écran').closest('button')!
    expect((preview.querySelector('video') as HTMLVideoElement & { srcObject: unknown }).srcObject).toBe(screenStream)
    fireEvent.click(preview)

    expect(screen.queryByText('Votre écran')).not.toBeInTheDocument()
    expect(producerIds(container)).toEqual(['cam'])
    const mainVideo = container.querySelector('.absolute.inset-0.bg-black video') as HTMLVideoElement & { srcObject: unknown }
    expect(mainVideo.srcObject).toBe(screenStream)
  })

  describe('mode minimise', () => {
    it('se minimise, relaie les controles puis se reagrandit', () => {
      const local = stream('local')
      const { call, onClose, container } = renderCall({
        localStream: local,
        remoteStreams: new Map([['cam', stream('cam')]]),
      })

      fireEvent.click(screen.getByTitle('Minimiser'))

      expect(producerIds(container)).toEqual(['cam'])
      const localVideo = container.querySelector('video:not([data-producer-id])') as HTMLVideoElement & { srcObject: unknown }
      expect(localVideo.srcObject).toBe(local)

      fireEvent.click(screen.getByTitle('Couper caméra'))
      fireEvent.click(screen.getByTitle('Couper micro'))
      fireEvent.click(screen.getByTitle('Raccrocher'))
      expect(call.toggleCamera).toHaveBeenCalled()
      expect(call.toggleMute).toHaveBeenCalled()
      expect(call.endCall).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()

      fireEvent.click(screen.getByTitle('Agrandir'))
      expect(screen.getByTitle('Minimiser')).toBeInTheDocument()
    })

    it('affiche un avatar sans flux distant et les controles coupes', () => {
      const { container } = renderCall({ isCameraOff: true, isMuted: true, localStream: stream('local') })

      fireEvent.click(screen.getByTitle('Minimiser'))

      expect(container.querySelector('video')).toBeNull()
      expect(screen.getByTitle('Activer caméra')).toBeInTheDocument()
      expect(screen.getByTitle('Activer micro')).toBeInTheDocument()
    })

    it('revient en plein ecran a la reouverture', () => {
      const { update } = renderCall()
      fireEvent.click(screen.getByTitle('Minimiser'))

      update({}, false)
      update({}, true)

      expect(screen.getByTitle('Minimiser')).toBeInTheDocument()
    })
  })
})
