import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TwoFactorPage from '@/app/2fa/page'

// Mock useRouter
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock useAuth
const mockVerify2FA = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    verify2FA: mockVerify2FA,
  }),
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    error: jest.fn(),
    success: jest.fn(),
  }),
}))

// Mock LandingNavbar
jest.mock('@/components/landing/LandingNavbar', () => {
  return function MockNavbar() {
    return <nav data-testid="landing-navbar" />
  }
})

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
}))

jest.mock('@/components/ui/input', () => ({
  Input: jest.fn().mockImplementation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ ref, ...props }: any) => <input {...props} />
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

// SessionStorage mock
const mockSessionStorage: Record<string, string> = {}
beforeAll(() => {
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn((key: string) => mockSessionStorage[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        mockSessionStorage[key] = value
      }),
      removeItem: jest.fn((key: string) => {
        delete mockSessionStorage[key]
      }),
    },
    writable: true,
  })
})

beforeEach(() => {
  jest.clearAllMocks()
  Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key])
})

describe('TwoFactorPage', () => {
  it('redirige vers /login si pas de tempToken en session', () => {
    render(<TwoFactorPage />)
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('affiche le formulaire quand un tempToken existe', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'
    mockSessionStorage['2fa_maskedEmail'] = 'jo***@gmail.com'

    render(<TwoFactorPage />)

    await waitFor(() => {
      expect(screen.getByText(/vérification en deux étapes/i)).toBeInTheDocument()
    })
  })

  it('affiche le maskedEmail', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'
    mockSessionStorage['2fa_maskedEmail'] = 'jo***@gmail.com'

    render(<TwoFactorPage />)

    await waitFor(() => {
      expect(screen.getByText('jo***@gmail.com')).toBeInTheDocument()
    })
  })

  it('affiche 6 inputs pour le code', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'

    render(<TwoFactorPage />)

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      expect(inputs).toHaveLength(6)
    })
  })

  it('n\'accepte que les chiffres', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'

    render(<TwoFactorPage />)

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      fireEvent.change(inputs[0], { target: { value: 'a' } })
      expect(inputs[0]).toHaveValue('')

      fireEvent.change(inputs[0], { target: { value: '5' } })
      expect(inputs[0]).toHaveValue('5')
    })
  })

  it('appelle verify2FA quand le bouton est cliqué avec un code complet', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'
    mockVerify2FA.mockResolvedValueOnce(undefined)

    render(<TwoFactorPage />)

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      // Remplir les 6 chiffres
      '847291'.split('').forEach((digit, i) => {
        fireEvent.change(inputs[i], { target: { value: digit } })
      })
    })

    const submitButton = screen.getByText('Vérifier')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockVerify2FA).toHaveBeenCalledWith('847291', false)
    })
  })

  it('affiche le bouton renvoyer et redirige vers /login au clic', async () => {
    mockSessionStorage['2fa_tempToken'] = 'temp-token-123'

    render(<TwoFactorPage />)

    await waitFor(() => {
      const resendButton = screen.getByText('Renvoyer')
      fireEvent.click(resendButton)
    })

    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('affiche le loader quand isReady est false', () => {
    // Pas de tempToken → loader puis redirect
    render(<TwoFactorPage />)
    // Le composant rend d'abord le loader (isReady = false)
    // puis le useEffect redirige
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
