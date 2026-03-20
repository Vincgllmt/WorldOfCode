import { renderHook, waitFor } from '@testing-library/react'
import { useRegister } from '@/hooks/useRegister'
import { register } from '@/services/registerService'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/contexts/AuthContext'
import type { AuthContextType } from '@/interfaces/AuthContext'
import type { ReactNode } from 'react'

// Mock services
jest.mock('@/services/registerService')
const mockedRegister = register as jest.MockedFunction<typeof register>

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock react-hot-toast
const mockToastError = jest.fn()
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    error: (...args: unknown[]) => mockToastError(...args),
    success: jest.fn(),
  }),
}))

// SessionStorage mock
const sessionStore: Record<string, string> = {}
beforeAll(() => {
  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: jest.fn((key: string) => sessionStore[key] ?? null),
      setItem: jest.fn((key: string, val: string) => { sessionStore[key] = val }),
      removeItem: jest.fn((key: string) => { delete sessionStore[key] }),
    },
    writable: true,
  })
})

const mockLoginSilent = jest.fn()
const mockAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  loginSilent: mockLoginSilent,
  verify2FA: jest.fn(),
  logout: jest.fn(),
  setUserTheme: jest.fn(),
  setUserAvatar: jest.fn(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

const validCredentials = {
  firstname: 'Jackie',
  lastname: 'Welles',
  email: 'jackie@nightcity.com',
  username: 'jackiewelles',
  password: 'SamuraiForever77',
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.keys(sessionStore).forEach((k) => delete sessionStore[k])
})

describe('useRegister', () => {
  it('appelle register puis loginSilent et redirige vers /onboarding', async () => {
    const registerData = { id: 1, username: 'jackiewelles', role: 'ROLE_USER' as const, creationDate: '', updatedDate: '' }
    mockedRegister.mockResolvedValueOnce(registerData as any)
    mockLoginSilent.mockResolvedValueOnce({ id: 1, username: 'jackiewelles', token: 'jwt' })

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    result.current.mutate(validCredentials)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedRegister).toHaveBeenCalledWith(validCredentials, expect.anything())
    expect(mockLoginSilent).toHaveBeenCalledWith({
      username: 'jackiewelles',
      password: 'SamuraiForever77',
    })
    expect(mockPush).toHaveBeenCalledWith('/onboarding')
  })

  it('gere la redirection 2FA apres inscription', async () => {
    const registerData = { id: 1, username: 'jackiewelles', role: 'ROLE_USER' as const, creationDate: '', updatedDate: '' }
    mockedRegister.mockResolvedValueOnce(registerData as any)
    mockLoginSilent.mockRejectedValueOnce(new Error('2FA required'))

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    result.current.mutate(validCredentials)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(sessionStore['2fa_redirect']).toBe('/onboarding')
    // Pas de toast erreur pour le 2FA
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it('redirige vers /login si loginSilent echoue pour autre raison', async () => {
    const registerData = { id: 1, username: 'jackiewelles', role: 'ROLE_USER' as const, creationDate: '', updatedDate: '' }
    mockedRegister.mockResolvedValueOnce(registerData as any)
    mockLoginSilent.mockRejectedValueOnce(new Error('Server error'))

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    result.current.mutate(validCredentials)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockToastError).toHaveBeenCalledWith('Compte créé. Veuillez vous connecter.')
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('affiche un toast erreur si l\'inscription echoue', async () => {
    mockedRegister.mockRejectedValueOnce(new Error('Username deja pris'))

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() })

    result.current.mutate(validCredentials)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastError).toHaveBeenCalledWith('Username deja pris')
  })
})
