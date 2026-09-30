import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import toast from 'react-hot-toast'
import {
  useGroups,
  useGroup,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useJoinGroup,
  useToggleGroupMembership,
} from '@/hooks/useGroups'
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
} from '@/services/groupService'
import type { Group } from '@/interfaces/group'

jest.mock('@/services/groupService')
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}))

const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

const mockedGetGroups = getGroups as jest.MockedFunction<typeof getGroups>
const mockedGetGroupById = getGroupById as jest.MockedFunction<typeof getGroupById>
const mockedCreateGroup = createGroup as jest.MockedFunction<typeof createGroup>
const mockedUpdateGroup = updateGroup as jest.MockedFunction<typeof updateGroup>
const mockedDeleteGroup = deleteGroup as jest.MockedFunction<typeof deleteGroup>
const mockedJoinGroup = joinGroup as jest.MockedFunction<typeof joinGroup>
const mockedLeaveGroup = leaveGroup as jest.MockedFunction<typeof leaveGroup>

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 1,
    name: 'React',
    description: 'Groupe React',
    createdAt: '2026-01-01T00:00:00Z',
    joinedByUser: false,
    ...overrides,
  }
}

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

describe('useGroups', () => {
  it('renvoie la liste des groupes', async () => {
    const groups = [makeGroup()]
    mockedGetGroups.mockResolvedValueOnce(groups)
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useGroups(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.groups).toEqual(groups)
    expect(result.current.error).toBeNull()
  })
})

describe('useGroup', () => {
  it('charge le groupe par son id', async () => {
    mockedGetGroupById.mockResolvedValueOnce(makeGroup({ id: 3 }))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useGroup(3), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedGetGroupById).toHaveBeenCalledWith(3)
  })

  it("ne charge rien sans id ou si desactive", () => {
    const { wrapper } = createWrapper()

    renderHook(() => useGroup(0), { wrapper })
    renderHook(() => useGroup(3, { enabled: false }), { wrapper })

    expect(mockedGetGroupById).not.toHaveBeenCalled()
  })
})

describe.each([
  ['useCreateGroup', useCreateGroup, mockedCreateGroup, { name: 'n', description: 'd' }, 'Erreur lors de la création du groupe'],
  ['useUpdateGroup', useUpdateGroup, mockedUpdateGroup, { id: 1, name: 'n', description: 'd' }, 'Erreur lors de la mise à jour'],
  ['useDeleteGroup', useDeleteGroup, mockedDeleteGroup, 1, 'Erreur lors de la suppression'],
] as const)('%s', (_name, useHook, serviceMock, payload, errorMessage) => {
  it('appelle le service et invalide la liste des groupes', async () => {
    ;(serviceMock as jest.Mock).mockResolvedValueOnce(undefined)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => (useHook as () => { mutateAsync: (p: unknown) => Promise<unknown> })(), { wrapper })
    await act(() => result.current.mutateAsync(payload))

    expect(serviceMock).toHaveBeenCalledWith(payload)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] })
  })

  it('affiche un toast en cas d erreur', async () => {
    ;(serviceMock as jest.Mock).mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => (useHook as () => { mutate: (p: unknown) => void })(), { wrapper })
    act(() => result.current.mutate(payload))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(errorMessage))
  })
})

describe('useJoinGroup', () => {
  it('rejoint le groupe, invalide les caches et rafraichit la page', async () => {
    mockedJoinGroup.mockResolvedValueOnce(undefined as never)
    const { wrapper, queryClient } = createWrapper()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useJoinGroup(), { wrapper })
    await act(() => result.current.mutateAsync(5))

    expect(mockedJoinGroup).toHaveBeenCalledWith(5)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['group', 5] })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it('affiche un toast en cas d erreur', async () => {
    mockedJoinGroup.mockRejectedValueOnce(new Error('ko'))
    const { wrapper } = createWrapper()

    const { result } = renderHook(() => useJoinGroup(), { wrapper })
    act(() => result.current.mutate(5))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la tentative de rejoindre le groupe'),
    )
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

describe('useToggleGroupMembership', () => {
  function setup() {
    const { wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(['groups'], [makeGroup({ id: 1 }), makeGroup({ id: 2 })])
    queryClient.setQueryData(['group', 1], makeGroup({ id: 1 }))
    const { result } = renderHook(() => useToggleGroupMembership(), { wrapper })
    return { result, queryClient }
  }

  it('rejoint le groupe avec une mise a jour optimiste', async () => {
    let resolveJoin!: () => void
    mockedJoinGroup.mockReturnValueOnce(new Promise((r) => (resolveJoin = () => r(undefined as never))))
    const { result, queryClient } = setup()

    act(() => result.current.mutate({ groupId: 1, currentlyJoined: false }))

    await waitFor(() =>
      expect(queryClient.getQueryData<Group>(['group', 1])?.joinedByUser).toBe(true),
    )
    expect(queryClient.getQueryData<Group[]>(['groups'])?.map((g) => g.joinedByUser)).toEqual([true, false])

    await act(async () => resolveJoin())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(true)
    expect(mockedLeaveGroup).not.toHaveBeenCalled()
  })

  it('quitte le groupe si deja membre', async () => {
    mockedLeaveGroup.mockResolvedValueOnce(undefined as never)
    const { result } = setup()

    await act(() => result.current.mutateAsync({ groupId: 1, currentlyJoined: true }))

    expect(mockedLeaveGroup).toHaveBeenCalledWith(1)
    await waitFor(() => expect(result.current.data).toBe(false))
  })

  it('restaure les caches et affiche un toast en cas d erreur', async () => {
    mockedJoinGroup.mockRejectedValueOnce(new Error('ko'))
    const { result, queryClient } = setup()
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries')

    act(() => result.current.mutate({ groupId: 1, currentlyJoined: false }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Action impossible'))
    expect(queryClient.getQueryData<Group>(['group', 1])?.joinedByUser).toBe(false)
    expect(queryClient.getQueryData<Group[]>(['groups'])?.[0].joinedByUser).toBe(false)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user-groups'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['group', 1] })
  })

  it('fonctionne sans donnees en cache', async () => {
    mockedJoinGroup.mockRejectedValueOnce(new Error('ko'))
    const { wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useToggleGroupMembership(), { wrapper })

    act(() => result.current.mutate({ groupId: 9, currentlyJoined: false }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(['groups'])).toBeUndefined()
    expect(queryClient.getQueryData(['group', 9])).toBeUndefined()
  })
})
