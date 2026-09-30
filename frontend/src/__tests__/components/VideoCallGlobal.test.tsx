import { render, screen, fireEvent, within } from '@testing-library/react'
import { VideoCallGlobal } from '@/components/video/VideoCallGlobal'
import { useVideoCallContext } from '@/contexts/VideoCallContext'

jest.mock('@/contexts/VideoCallContext', () => ({
  useVideoCallContext: jest.fn(),
}))
jest.mock('@/components/video/IncomingCallDialog', () => ({
  IncomingCallDialog: (props: { callerUsername: string; onAccept: () => void; onReject: () => void; onDismiss: () => void }) => (
    <div data-testid="incoming-call">
      {props.callerUsername}
      <button onClick={props.onAccept}>accept</button>
      <button onClick={props.onReject}>reject</button>
      <button onClick={props.onDismiss}>dismiss</button>
    </div>
  ),
}))

const mockedUseContext = useVideoCallContext as jest.Mock

const stream = (name: string) => ({ name }) as unknown as MediaStream

function makeContext(overrides: Record<string, unknown> = {}) {
  return {
    isCallActive: true,
    isMinimized: false,
    callState: 'connected',
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
    localStream: null,
    screenStream: null,
    remoteStreams: new Map<string, MediaStream>(),
    currentConversationId: 'c1',
    incomingCall: null,
    acceptIncomingCall: jest.fn(),
    rejectIncomingCall: jest.fn(),
    startCall: jest.fn(),
    endCall: jest.fn(),
    toggleMute: jest.fn(),
    toggleCamera: jest.fn(),
    toggleScreenShare: jest.fn(),
    setMinimized: jest.fn(),
    ...overrides,
  }
}

function renderWith(overrides: Record<string, unknown> = {}) {
  const ctx = makeContext(overrides)
  mockedUseContext.mockReturnValue(ctx)
  const utils = render(<VideoCallGlobal />)
  return { ...utils, ctx }
}

const producerIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('video[data-producer-id]')).map((v) => v.getAttribute('data-producer-id'))

describe('VideoCallGlobal', () => {
  it("n'affiche rien sans appel actif ni entrant", () => {
    const { container } = renderWith({ isCallActive: false })
    expect(container).toBeEmptyDOMElement()
  })

  describe('appel entrant', () => {
    const incomingCall = { conversationId: 'c9', callerId: 2, callerUsername: 'bob' }

    it('affiche la notification et relaie accepter/refuser', () => {
      const { ctx } = renderWith({ isCallActive: false, incomingCall })

      expect(screen.getByTestId('incoming-call')).toHaveTextContent('bob')
      fireEvent.click(screen.getByText('accept'))
      fireEvent.click(screen.getByText('reject'))
      expect(ctx.acceptIncomingCall).toHaveBeenCalled()
      expect(ctx.rejectIncomingCall).toHaveBeenCalled()
    })

    it('masque la notification puis la reaffiche pour un nouvel appel', () => {
      const { container, rerender } = renderWith({ isCallActive: false, incomingCall })

      fireEvent.click(screen.getByText('dismiss'))
      expect(container).toBeEmptyDOMElement()

      mockedUseContext.mockReturnValue(makeContext({ isCallActive: false, incomingCall: { ...incomingCall, conversationId: 'c10' } }))
      rerender(<VideoCallGlobal />)
      expect(screen.getByTestId('incoming-call')).toBeInTheDocument()
    })
  })

  describe('plein ecran', () => {
    it("affiche l'etat de connexion et permet d'annuler", () => {
      const { ctx } = renderWith({ callState: 'calling' })

      expect(screen.getAllByText('Connexion en cours...')).toHaveLength(2)
      expect(screen.getByText('En attente de réponse')).toBeInTheDocument()
      expect(screen.queryByTitle('Minimiser')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /Annuler/ }))
      expect(ctx.endCall).toHaveBeenCalled()
    })

    it("affiche l'etat termine", () => {
      renderWith({ callState: 'ended' })
      expect(screen.getByText('Appel terminé')).toBeInTheDocument()
    })

    it('attend les participants quand aucun flux distant', () => {
      renderWith()

      expect(screen.getByText('Appel en cours')).toBeInTheDocument()
      expect(screen.getByText('En attente des autres participants...')).toBeInTheDocument()
    })

    it('relaie minimiser, fermer et les controles', () => {
      const { ctx } = renderWith()

      fireEvent.click(screen.getByTitle('Minimiser'))
      fireEvent.click(screen.getByTitle('Fermer'))
      fireEvent.click(screen.getByTitle('Couper le micro'))
      fireEvent.click(screen.getByTitle('Désactiver la caméra'))
      fireEvent.click(screen.getByTitle("Partager l'écran"))
      fireEvent.click(screen.getByTitle('Raccrocher'))

      expect(ctx.setMinimized).toHaveBeenCalledWith(true)
      expect(ctx.endCall).toHaveBeenCalledTimes(2)
      expect(ctx.toggleMute).toHaveBeenCalled()
      expect(ctx.toggleCamera).toHaveBeenCalled()
      expect(ctx.toggleScreenShare).toHaveBeenCalled()
    })

    it('affiche les controles dans leur etat actif', () => {
      renderWith({ isMuted: true, isCameraOff: true, isScreenSharing: true, localStream: stream('local') })

      expect(screen.getByTitle('Activer le micro')).toBeInTheDocument()
      expect(screen.getByTitle('Activer la caméra')).toBeInTheDocument()
      expect(screen.getByTitle('Arrêter le partage')).toBeInTheDocument()
      expect(screen.getByText('👤')).toBeInTheDocument()
    })

    it("desactive le partage d'ecran si un autre participant partage deja", () => {
      renderWith({
        remoteStreams: new Map([
          ['cam', stream('cam')],
          ['screen', stream('screen')],
        ]),
      })

      expect(screen.getByTitle("Un partage d'écran est déjà en cours")).toBeDisabled()
    })

    it('affiche le premier flux distant en grand et bascule sur un flux secondaire au clic', () => {
      const { container } = renderWith({
        remoteStreams: new Map([
          ['cam', stream('cam')],
          ['screen', stream('screen')],
        ]),
      })

      expect(producerIds(container)).toEqual(['cam', 'screen'])
      // Contenu d'écran présent : le flux principal est en "contain"
      expect(container.querySelector('video[data-producer-id="cam"]')).toHaveClass('object-contain')

      fireEvent.click(screen.getByTitle('Cliquer pour agrandir'))

      expect(producerIds(container)).toEqual(['screen', 'cam'])
    })

    it("met en avant son propre partage d'ecran au clic sur l'apercu", () => {
      const screenStream = stream('myscreen')
      const { container } = renderWith({
        screenStream,
        isScreenSharing: true,
        remoteStreams: new Map([['cam', stream('cam')]]),
      })

      const preview = screen.getByText('Votre écran').closest('button')!
      expect((within(preview).getByText('Votre écran').previousSibling as HTMLVideoElement & { srcObject: unknown }).srcObject).toBe(
        screenStream,
      )
      fireEvent.click(preview)

      expect(screen.queryByText('Votre écran')).not.toBeInTheDocument()
      // Le flux distant passe en vignette secondaire
      expect(producerIds(container)).toEqual(['cam'])
      expect(screen.getByTitle('Cliquer pour agrandir')).toBeInTheDocument()
      const mainVideo = container.querySelector('.absolute.inset-0.bg-black video') as HTMLVideoElement & { srcObject: unknown }
      expect(mainVideo.srcObject).toBe(screenStream)
    })

    it('attache le flux local et distant aux elements video', () => {
      const local = stream('local')
      const remote = stream('remote')
      const { container } = renderWith({ localStream: local, remoteStreams: new Map([['cam', remote]]) })

      const videos = container.querySelectorAll('video') as NodeListOf<HTMLVideoElement & { srcObject: unknown }>
      const sources = Array.from(videos).map((v) => v.srcObject)
      expect(sources).toContain(local)
      expect(sources).toContain(remote)
      expect(container.querySelector('video[data-producer-id="cam"]')).toHaveClass('object-cover')
    })
  })

  describe('mode minimise', () => {
    it("affiche le premier flux distant et la mini video locale", () => {
      const local = stream('local')
      const { container } = renderWith({
        isMinimized: true,
        localStream: local,
        remoteStreams: new Map([['cam', stream('cam')]]),
      })

      expect(producerIds(container)).toEqual(['cam'])
      const localVideo = container.querySelector('video:not([data-producer-id])') as HTMLVideoElement & { srcObject: unknown }
      expect(localVideo.srcObject).toBe(local)
      expect(screen.getByTitle('Couper caméra')).toBeInTheDocument()
      expect(screen.getByTitle('Couper micro')).toBeInTheDocument()
    })

    it('affiche un avatar sans flux distant et masque la video locale camera coupee', () => {
      const { container } = renderWith({
        isMinimized: true,
        isCameraOff: true,
        isMuted: true,
        localStream: stream('local'),
      })

      expect(container.querySelector('video')).toBeNull()
      expect(screen.getByTitle('Activer caméra')).toBeInTheDocument()
      expect(screen.getByTitle('Activer micro')).toBeInTheDocument()
    })

    it('relaie les actions des controles minimises', () => {
      const { ctx } = renderWith({ isMinimized: true })

      fireEvent.click(screen.getByTitle('Couper caméra'))
      fireEvent.click(screen.getByTitle('Couper micro'))
      fireEvent.click(screen.getByTitle('Raccrocher'))
      fireEvent.click(screen.getByTitle('Agrandir'))

      expect(ctx.toggleCamera).toHaveBeenCalled()
      expect(ctx.toggleMute).toHaveBeenCalled()
      expect(ctx.endCall).toHaveBeenCalled()
      expect(ctx.setMinimized).toHaveBeenCalledWith(false)
    })
  })
})
