import { render, screen, fireEvent, act } from '@testing-library/react'
import { IncomingCallDialog } from '@/components/video/IncomingCallDialog'

// Web Audio API factice : on vérifie que la sonnerie démarre, se répète et s'arrête.
function makeParam() {
  return {
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  }
}

function makeNode() {
  return {
    type: '',
    frequency: makeParam(),
    gain: makeParam(),
    Q: makeParam(),
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  }
}

let contexts: { createOscillator: jest.Mock; close: jest.Mock }[] = []
const OriginalAudioContext = global.AudioContext

beforeEach(() => {
  jest.useFakeTimers()
  contexts = []
  global.AudioContext = jest.fn(() => {
    const ctx = {
      currentTime: 0,
      destination: {},
      createOscillator: jest.fn(makeNode),
      createGain: jest.fn(makeNode),
      createBiquadFilter: jest.fn(makeNode),
      close: jest.fn().mockResolvedValue(undefined),
    }
    contexts.push(ctx)
    return ctx
  }) as unknown as typeof AudioContext
})

afterEach(() => {
  jest.useRealTimers()
  global.AudioContext = OriginalAudioContext
})

function renderDialog() {
  const props = {
    callerUsername: 'bobby',
    conversationId: 'c1',
    onAccept: jest.fn(),
    onReject: jest.fn(),
    onDismiss: jest.fn(),
  }
  const utils = render(<IncomingCallDialog {...props} />)
  return { ...utils, props }
}

describe('IncomingCallDialog', () => {
  it("affiche l'appelant et ses initiales", () => {
    renderDialog()

    expect(screen.getByText('bobby')).toBeInTheDocument()
    expect(screen.getByText('BO')).toBeInTheDocument()
    expect(screen.getByText('Appel vidéo entrant...')).toBeInTheDocument()
  })

  it('joue la sonnerie au montage puis toutes les 2,5 s', () => {
    renderDialog()

    expect(contexts).toHaveLength(1)
    // Une pulsation = 4 oscillateurs (2 sweeps, sub-bass, harmonique)
    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(4)

    act(() => {
      jest.advanceTimersByTime(2500)
    })
    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(8)
  })

  it.each([
    ['Accepter', 'onAccept'],
    ['Refuser', 'onReject'],
  ] as const)('coupe la sonnerie et appelle %s', (label, callback) => {
    const { props } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(label) }))

    expect(props[callback]).toHaveBeenCalled()
    expect(contexts[0].close).toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(contexts[0].createOscillator).toHaveBeenCalledTimes(4)
  })

  it('masque la notification sans refuser l appel', () => {
    const { props } = renderDialog()

    fireEvent.click(screen.getByTitle('Fermer la notification'))

    expect(props.onDismiss).toHaveBeenCalled()
    expect(props.onReject).not.toHaveBeenCalled()
    expect(contexts[0].close).toHaveBeenCalled()
  })

  it('arrete la sonnerie au demontage, meme si la fermeture du contexte echoue', () => {
    const { unmount } = renderDialog()
    contexts[0].close.mockRejectedValueOnce(new Error('deja ferme'))

    unmount()

    expect(contexts[0].close).toHaveBeenCalled()
  })

  it("reste fonctionnel si l'API Web Audio n'est pas supportee", () => {
    global.AudioContext = jest.fn(() => {
      throw new Error('unsupported')
    }) as unknown as typeof AudioContext
    const { props } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: /Accepter/ }))

    expect(props.onAccept).toHaveBeenCalled()
  })
})
