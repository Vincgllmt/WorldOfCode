import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GroupJoinToggle from '@/components/group/GroupJoinToggle'
import { useToggleGroupMembership } from '@/hooks/useGroups'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { Group } from '@/interfaces/group'

jest.mock('@/hooks/useGroups', () => ({
  useToggleGroupMembership: jest.fn(),
}))

jest.mock('@/hooks/useUsers', () => ({
  useUserGroups: jest.fn(),
}))

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const mockedUseToggleGroupMembership = useToggleGroupMembership as jest.Mock
const mockedUseUserGroups = useUserGroups as jest.Mock
const mockedUseAuth = useAuth as jest.Mock

const mockMutate = jest.fn()

const makeGroup = (overrides: Partial<Group> = {}): Group =>
  ({ id: 10, name: 'React FR', ...overrides }) as Group

beforeEach(() => {
  jest.clearAllMocks()
  mockMutate.mockReset()
  mockedUseAuth.mockReturnValue({ user: { id: 1 } })
  mockedUseToggleGroupMembership.mockReturnValue({ mutate: mockMutate, isPending: false })
  mockedUseUserGroups.mockReturnValue({ data: [] })
})

describe('GroupJoinToggle', () => {
  it('affiche "S\'abonner" quand l\'utilisateur n\'est pas membre', () => {
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} />)

    const button = screen.getByRole('button', { name: "S'abonner" })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('title', 'Rejoindre ce groupe')
  })

  it('affiche "Se désabonner" quand l\'utilisateur est membre', () => {
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: true })} />)

    const button = screen.getByRole('button', { name: 'Se désabonner' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('title', 'Quitter ce groupe')
  })

  it('n\'infère pas l\'appartenance quand joinedByUser est fourni', () => {
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} />)

    expect(mockedUseUserGroups).toHaveBeenCalledWith(undefined)
  })

  it('infère l\'appartenance depuis les groupes de l\'utilisateur', () => {
    mockedUseUserGroups.mockReturnValue({ data: [{ id: 5 }, { id: 10 }] })
    render(<GroupJoinToggle group={makeGroup()} />)

    expect(mockedUseUserGroups).toHaveBeenCalledWith(1)
    expect(screen.getByRole('button', { name: 'Se désabonner' })).toBeInTheDocument()
  })

  it('infère la non-appartenance quand le groupe est absent de la liste', () => {
    mockedUseUserGroups.mockReturnValue({ data: [{ id: 5 }] })
    render(<GroupJoinToggle group={makeGroup()} />)

    expect(screen.getByRole('button', { name: "S'abonner" })).toBeInTheDocument()
  })

  it('n\'infère pas l\'appartenance sans utilisateur connecté', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    render(<GroupJoinToggle group={makeGroup()} />)

    expect(mockedUseUserGroups).toHaveBeenCalledWith(undefined)
    expect(screen.getByRole('button', { name: "S'abonner" })).toBeInTheDocument()
  })

  it('rejoint le groupe au clic avec mise à jour optimiste et appelle onChange au succès', async () => {
    let onSuccess: (joined: boolean) => void = () => {}
    mockMutate.mockImplementation((_vars, opts) => {
      onSuccess = opts.onSuccess
    })
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} onChange={onChange} />)

    await user.click(screen.getByRole('button'))

    expect(mockMutate).toHaveBeenCalledWith(
      { groupId: 10, currentlyJoined: false },
      expect.any(Object)
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    expect(onChange).not.toHaveBeenCalled()

    onSuccess(true)

    expect(await screen.findByRole('button', { name: 'Se désabonner' })).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('quitte le groupe au clic et applique la valeur renvoyée par le serveur', async () => {
    mockMutate.mockImplementation((_vars, opts) => opts.onSuccess(false))
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: true })} onChange={onChange} />)

    await user.click(screen.getByRole('button'))

    expect(mockMutate).toHaveBeenCalledWith(
      { groupId: 10, currentlyJoined: true },
      expect.any(Object)
    )
    expect(onChange).toHaveBeenCalledWith(false)
    expect(screen.getByRole('button', { name: "S'abonner" })).toBeInTheDocument()
  })

  it('annule la mise à jour optimiste en cas d\'erreur', async () => {
    mockMutate.mockImplementation((_vars, opts) => opts.onError(new Error('fail')))
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} onChange={onChange} />)

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button', { name: "S'abonner" })).toHaveAttribute('aria-pressed', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('empêche la propagation du clic vers un parent (ex. lien de carte)', () => {
    const parentClick = jest.fn()
    render(
      <div onClick={parentClick}>
        <GroupJoinToggle group={makeGroup({ joinedByUser: false })} />
      </div>
    )

    fireEvent.click(screen.getByRole('button'))

    expect(parentClick).not.toHaveBeenCalled()
    expect(mockMutate).toHaveBeenCalled()
  })

  it('affiche un état de chargement et désactive le bouton pendant la mutation', () => {
    mockedUseToggleGroupMembership.mockReturnValue({ mutate: mockMutate, isPending: true })
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(screen.getByText('Abonnement…')).toBeInTheDocument()
  })

  it('affiche "Désabonnement…" pendant la mutation quand l\'utilisateur est membre', () => {
    mockedUseToggleGroupMembership.mockReturnValue({ mutate: mockMutate, isPending: true })
    render(<GroupJoinToggle group={makeGroup({ joinedByUser: true })} />)

    expect(screen.getByText('Désabonnement…')).toBeInTheDocument()
  })

  it('synchronise l\'état quand joinedByUser change', () => {
    const { rerender } = render(<GroupJoinToggle group={makeGroup({ joinedByUser: false })} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    rerender(<GroupJoinToggle group={makeGroup({ joinedByUser: true })} />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
