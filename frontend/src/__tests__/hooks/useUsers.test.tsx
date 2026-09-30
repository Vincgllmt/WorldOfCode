import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  useUsers,
  useUpdateUser,
  useDeleteUser,
  useUserGroups,
  useUser,
  useUpdateAvatar,
  useChangePassword,
} from '@/hooks/useUsers'
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getUserGroups,
  getUserById,
  changeUserPassword,
  updateUserProfile,
} from '@/services/userService'

jest.mock('@/services/userService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

const mockLogout = jest.fn()
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}))

const mockedGetAllUsers = getAllUsers as jest.MockedFunction<typeof getAllUsers>
const mockedUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>
const mockedDeleteUser = deleteUser as jest.MockedFunction<typeof deleteUser>
const mockedGetUserGroups = getUserGroups as jest.MockedFunction<typeof getUserGroups>
const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>
const mockedChangeUserPassword = changeUserPassword as jest.MockedFunction<typeof changeUserPassword>
const mockedUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { wrapper, queryClient }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useUsers', () => {
  it('renvoie la liste des utilisateurs', async () => {
    const users = [{ id: 1, username: 'alice' }]
    mockedGetAllUsers.mockResolvedValueOnce(users as never)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUsers(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.users).toEqual(users)
    expect(result.current.error).toBeNull()
  })
})

describe.each([
  ['useUpdateUser', useUpdateUser, mockedUpdateUser, { id: 1, username: 'a' }, 'Erreur lors de la mise à jour'],
  ['useDeleteUser', useDeleteUser, mockedDeleteUser, 1, 'Erreur lors de la suppression'],
] as const)('%s', (_name, useHook, serviceMock, payload, errorMessage) => {
  it('appelle le service et invalide la liste des utilisateurs', async () => {
    ;(serviceMock as jest.Mock).mockResolvedValueOnce(undefined)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => (useHook as () => { mutateAsync: (p: unknown) => Promise<unknown> })(), { wrapper })
    await act(() => result.current.mutateAsync(payload))

    expect(serviceMock).toHaveBeenCalledWith(payload)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['users'] })
  })

  it('affiche un toast en cas d erreur', async () => {
    ;(serviceMock as jest.Mock).mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => (useHook as () => { mutate: (p: unknown) => void })(), { wrapper })
    act(() => result.current.mutate(payload))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(errorMessage))
  })
})

describe('useUserGroups', () => {
  it('charge les groupes de l utilisateur', async () => {
    mockedGetUserGroups.mockResolvedValueOnce([])
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUserGroups(4), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetUserGroups).toHaveBeenCalledWith(4)
  })

  it('ne charge rien sans userId', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useUserGroups(undefined), { wrapper })
    expect(mockedGetUserGroups).not.toHaveBeenCalled()
  })
})

describe('useUser', () => {
  it('charge l utilisateur par son id', async () => {
    mockedGetUserById.mockResolvedValueOnce({ id: 4, username: 'bob' } as never)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUser(4), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ id: 4, username: 'bob' })
  })

  it('ne charge rien sans id ou si desactive', () => {
    const { wrapper } = createWrapper()
    renderHook(() => useUser(undefined), { wrapper })
    renderHook(() => useUser(4, { enabled: false }), { wrapper })
    expect(mockedGetUserById).not.toHaveBeenCalled()
  })
})

describe('useUpdateAvatar', () => {
  it('met a jour l avatar et invalide le profil et les posts', async () => {
    mockedUpdateUserProfile.mockResolvedValueOnce(undefined as never)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })
    await act(() => result.current.mutateAsync({ userId: 4, avatarUrl: 'https://img/a.png' }))

    expect(mockedUpdateUserProfile).toHaveBeenCalledWith(4, { avatarUrl: 'https://img/a.png' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user', 4] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user-posts', 4] })
  })

  it('affiche un toast en cas d erreur', async () => {
    mockedUpdateUserProfile.mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateAvatar(), { wrapper })
    act(() => result.current.mutate({ userId: 4, avatarUrl: null }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la mise à jour de l'avatar"),
    )
  })
})

describe('useChangePassword', () => {
  const payload = { currentPassword: 'old', newPassword: 'new' } as never

  it('change le mot de passe puis deconnecte l utilisateur', async () => {
    mockedChangeUserPassword.mockResolvedValueOnce(undefined as never)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useChangePassword(), { wrapper })
    await act(() => result.current.mutateAsync(payload))

    expect(mockedChangeUserPassword).toHaveBeenCalledWith(payload)
    expect(toast.success).toHaveBeenCalledWith('Mot de passe mis à jour. Merci de vous reconnecter.')
    expect(mockLogout).toHaveBeenCalled()
  })

  it('affiche un toast en cas d erreur sans deconnecter', async () => {
    mockedChangeUserPassword.mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useChangePassword(), { wrapper })
    act(() => result.current.mutate(payload))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la mise à jour du mot de passe'),
    )
    expect(mockLogout).not.toHaveBeenCalled()
  })
})
