import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  useSkills,
  useUpdateProfile,
  useUpdateSkills,
  useCreateLink,
  useUpdateLink,
  useDeleteLink,
  useSyncLinks,
} from '@/hooks/useOnboarding'
import {
  updateUserProfile,
  updateUserSkills,
  createUserLink,
  updateUserLink,
  deleteUserLink,
} from '@/services/userService'
import { getAllSkills } from '@/services/skillService'
import type { UserLink } from '@/interfaces/user'

jest.mock('@/services/userService')
jest.mock('@/services/skillService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 7 } }),
}))

const mockedGetAllSkills = getAllSkills as jest.MockedFunction<typeof getAllSkills>
const mockedUpdateUserProfile = updateUserProfile as jest.MockedFunction<typeof updateUserProfile>
const mockedUpdateUserSkills = updateUserSkills as jest.MockedFunction<typeof updateUserSkills>
const mockedCreateUserLink = createUserLink as jest.MockedFunction<typeof createUserLink>
const mockedUpdateUserLink = updateUserLink as jest.MockedFunction<typeof updateUserLink>
const mockedDeleteUserLink = deleteUserLink as jest.MockedFunction<typeof deleteUserLink>

const PROFILE_KEY = ['user', 7, 'profile-onboarding']

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

describe('useSkills', () => {
  it('charge toutes les competences', async () => {
    const skills = [{ id: 1, name: 'React' }]
    mockedGetAllSkills.mockResolvedValueOnce(skills as never)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSkills(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(skills)
  })
})

describe.each([
  [
    'useUpdateProfile',
    useUpdateProfile,
    mockedUpdateUserProfile,
    { bio: 'hello' },
    [7, { bio: 'hello' }],
    'Erreur lors de la sauvegarde du profil',
  ],
  ['useUpdateSkills', useUpdateSkills, mockedUpdateUserSkills, [1, 2], [7, [1, 2]], 'Erreur lors de la sauvegarde des compétences'],
  [
    'useCreateLink',
    useCreateLink,
    mockedCreateUserLink,
    { type: 'github', url: 'https://github.com/a' },
    [7, { type: 'github', url: 'https://github.com/a' }],
    'Erreur lors de la sauvegarde du lien',
  ],
  [
    'useUpdateLink',
    useUpdateLink,
    mockedUpdateUserLink,
    { linkId: 3, data: { type: 'github', url: 'https://github.com/b' } },
    [7, 3, { type: 'github', url: 'https://github.com/b' }],
    'Erreur lors de la mise à jour du lien',
  ],
  ['useDeleteLink', useDeleteLink, mockedDeleteUserLink, 3, [7, 3], 'Erreur lors de la suppression du lien'],
] as const)('%s', (_name, useHook, serviceMock, payload, expectedArgs, errorMessage) => {
  it('appelle le service pour l utilisateur courant et invalide son profil', async () => {
    ;(serviceMock as jest.Mock).mockResolvedValueOnce(undefined)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => (useHook as () => { mutateAsync: (p: unknown) => Promise<unknown> })(), { wrapper })
    await act(() => result.current.mutateAsync(payload))

    expect(serviceMock).toHaveBeenCalledWith(...expectedArgs)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: PROFILE_KEY })
  })

  it('affiche un toast en cas d erreur', async () => {
    ;(serviceMock as jest.Mock).mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => (useHook as () => { mutate: (p: unknown) => void })(), { wrapper })
    act(() => result.current.mutate(payload))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(errorMessage))
  })
})

describe('useSyncLinks', () => {
  const existing: UserLink[] = [
    { id: 1, type: 'github', url: 'https://github.com/a' },
    { id: 2, type: 'linkedin', url: 'https://linkedin.com/in/a' },
    { id: 3, type: 'portfolio', url: 'https://a.dev' },
  ]

  it('supprime les liens retires, met a jour les modifies et cree les nouveaux', async () => {
    mockedDeleteUserLink.mockResolvedValue(undefined as never)
    mockedUpdateUserLink.mockResolvedValue(undefined as never)
    mockedCreateUserLink.mockResolvedValue(undefined as never)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useSyncLinks(), { wrapper })
    expect(result.current.isPending).toBe(false)

    await act(() =>
      result.current.syncLinks(existing, [
        { id: 1, type: 'github', url: 'https://github.com/a' },
        { id: 2, type: 'linkedin', url: 'https://linkedin.com/in/b' },
        { type: 'gitlab', url: 'https://gitlab.com/a' },
      ]),
    )

    expect(mockedDeleteUserLink).toHaveBeenCalledTimes(1)
    expect(mockedDeleteUserLink).toHaveBeenCalledWith(7, 3)
    expect(mockedUpdateUserLink).toHaveBeenCalledTimes(1)
    expect(mockedUpdateUserLink).toHaveBeenCalledWith(7, 2, { type: 'linkedin', url: 'https://linkedin.com/in/b' })
    expect(mockedCreateUserLink).toHaveBeenCalledTimes(1)
    expect(mockedCreateUserLink).toHaveBeenCalledWith(7, { type: 'gitlab', url: 'https://gitlab.com/a' })
  })

  it('ignore un lien du formulaire dont l id est inconnu en base', async () => {
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useSyncLinks(), { wrapper })

    await act(() => result.current.syncLinks([], [{ id: 99, type: 'other', url: 'https://x.io' }]))

    expect(mockedUpdateUserLink).not.toHaveBeenCalled()
    expect(mockedCreateUserLink).not.toHaveBeenCalled()
    expect(mockedDeleteUserLink).not.toHaveBeenCalled()
  })
})
