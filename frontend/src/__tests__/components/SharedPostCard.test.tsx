import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SharedPostCard from '@/components/post/SharedPostCard'
import type { Post } from '@/interfaces/post'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const post: Post = {
  id: 42,
  content: '<p>Contenu <strong>partagé</strong></p>',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: null,
  authorId: 7,
  authorUsername: 'alice',
  techGroupId: 3,
  techGroupName: 'Backend',
  likesCount: 0,
  likedByUser: false,
  sharedCount: 0,
  commentsCount: 0,
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SharedPostCard', () => {
  it("affiche le pseudo de l'auteur, le nom du groupe et le contenu", () => {
    render(<SharedPostCard post={post} />)

    expect(screen.getAllByText('alice').length).toBeGreaterThan(0)
    expect(screen.getByText(/Publication originale • Backend/)).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByText('partagé')).toBeInTheDocument()
  })

  it('affiche les initiales en avatar par défaut', () => {
    render(<SharedPostCard post={post} />)
    expect(screen.getByText('AL')).toBeInTheDocument()
  })

  it("affiche l'avatar image quand authorAvatarUrl est fourni", () => {
    render(<SharedPostCard post={{ ...post, authorAvatarUrl: 'https://cdn.test/a.png' }} />)
    expect(screen.getByAltText('Avatar de alice')).toHaveAttribute('src', 'https://cdn.test/a.png')
    expect(screen.queryByText('AL')).not.toBeInTheDocument()
  })

  it("affiche un message par défaut quand il n'y a pas de contenu", () => {
    render(<SharedPostCard post={{ ...post, content: null }} />)
    expect(screen.getByText('Pas de contenu textuel pour cette publication.')).toBeInTheDocument()
  })

  it("affiche un avertissement quand la publication partagée en contient une autre", () => {
    render(<SharedPostCard post={{ ...post, sharedPost: { ...post, id: 43 } }} />)
    expect(screen.getByText(/déjà un partage/)).toBeInTheDocument()
  })

  it("n'affiche pas d'avertissement de partage imbriqué par défaut", () => {
    render(<SharedPostCard post={post} />)
    expect(screen.queryByText(/déjà un partage/)).not.toBeInTheDocument()
  })

  it('navigue vers le post au clic sur la carte', async () => {
    const user = userEvent.setup()
    const { container } = render(<SharedPostCard post={post} />)

    const card = container.querySelector('[role="link"][tabindex="0"]') as HTMLElement
    // On clique directement sur la carte plutôt que sur du texte, pour éviter
    // de toucher un lien enfant (qui stoppe la propagation du clic).
    await user.click(card)
    expect(mockPush).toHaveBeenCalledWith('/post/42')
  })

  it('navigue vers le post via la touche Entrée', () => {
    render(<SharedPostCard post={post} />)
    const card = document.querySelector('[role="link"][tabindex="0"]') as HTMLElement
    card.focus()
    // Utilise fireEvent car userEvent.type ajouterait aussi des frappes de texte non pertinentes ici.
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    card.dispatchEvent(event)
    expect(mockPush).toHaveBeenCalledWith('/post/42')
  })

  it("n'appelle pas push pour une autre touche que Entrée", () => {
    render(<SharedPostCard post={post} />)
    const card = document.querySelector('[role="link"][tabindex="0"]') as HTMLElement
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    card.dispatchEvent(event)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("n'entraîne pas de navigation lors du clic sur le lien de l'auteur (stopPropagation)", async () => {
    const user = userEvent.setup()
    render(<SharedPostCard post={post} />)

    await user.click(screen.getByRole('link', { name: 'alice' }))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("les liens vers le profil pointent vers /user/:authorId", () => {
    const { container } = render(<SharedPostCard post={post} />)
    const links = container.querySelectorAll('a[href]')
    expect(links.length).toBe(2)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/user/7'))
  })
})
