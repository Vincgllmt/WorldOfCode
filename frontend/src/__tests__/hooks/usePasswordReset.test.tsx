import { renderHook, waitFor } from '@testing-library/react'
import { useForgotPassword, useResetPassword } from '@/hooks/useAuth'
import { requestPasswordReset, resetPassword } from '@/services/authService'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '@/contexts/AuthContext'
import type { AuthContextType } from '@/interfaces/AuthContext'
import type { ReactNode } from 'react'

// Mock services
jest.mock('@/services/authService')
const mockedRequestReset = requestPasswordReset as jest.MockedFunction<typeof requestPasswordReset>
const mockedResetPassword = resetPassword as jest.MockedFunction<typeof resetPassword>

// Mock next/navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock react-hot-toast
const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}))

const mockAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: jest.fn(),
  loginSilent: jest.fn(),
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

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useForgotPassword', () => {
  it('affiche un toast succes quand la demande reussit', async () => {
    mockedRequestReset.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() })

    result.current.mutate('jackie@nightcity.com')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedRequestReset).toHaveBeenCalledWith('jackie@nightcity.com', expect.anything())
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('lien de réinitialisation')
    )
  })

  it('affiche un toast erreur si la demande echoue', async () => {
    mockedRequestReset.mockRejectedValueOnce(new Error('Erreur serveur'))

    const { result } = renderHook(() => useForgotPassword(), { wrapper: createWrapper() })

    result.current.mutate('bad@email.com')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastError).toHaveBeenCalled()
  })
})

describe('useResetPassword', () => {
  it('affiche un toast succes et redirige vers /login', async () => {
    mockedResetPassword.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() })

    result.current.mutate({ token: 'reset-token-abc', password: 'NewPass2026!' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedResetPassword).toHaveBeenCalledWith('reset-token-abc', 'NewPass2026!')
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('réinitialisé avec succès')
    )
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('affiche un toast erreur si le reset echoue', async () => {
    mockedResetPassword.mockRejectedValueOnce(new Error('Token expiré'))

    const { result } = renderHook(() => useResetPassword(), { wrapper: createWrapper() })

    result.current.mutate({ token: 'bad-token', password: 'pass' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(mockToastError).toHaveBeenCalledWith('Token expiré')
  })
})
