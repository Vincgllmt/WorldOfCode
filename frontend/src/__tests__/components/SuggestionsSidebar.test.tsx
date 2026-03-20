import { render, screen } from '@testing-library/react'
import SuggestionsSidebar from '@/components/suggestions/SuggestionsSidebar'

// Mock useAuth
const mockUser = { id: 1, username: 'V' }
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Mock useSuggestions
const mockUseSuggestions = jest.fn()
jest.mock('@/hooks/useSuggestions', () => ({
  useSwipeSuggestions: (...args: unknown[]) => mockUseSuggestions(...args),
}))

// Mock SwipeDeck
jest.mock('@/components/suggestions/SwipeDeck', () => {
  return function MockSwipeDeck({ cards }: { cards: unknown[] }) {
    return <div data-testid="swipe-deck">Cards: {cards.length}</div>
  }
})

// Mock lucide
jest.mock('lucide-react', () => ({
  Sparkles: () => <span data-testid="sparkles-icon" />,
}))

// Mock Skeleton
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('SuggestionsSidebar', () => {
  it('affiche le titre Decouvrir', () => {
    mockUseSuggestions.mockReturnValue({
      visibleCards: [{ id: 1 }],
      hasCards: true,
      isLoading: false,
      advance: jest.fn(),
    })

    render(<SuggestionsSidebar />)
    expect(screen.getByText('Découvrir')).toBeInTheDocument()
  })

  it('affiche le skeleton pendant le chargement', () => {
    mockUseSuggestions.mockReturnValue({
      visibleCards: [],
      hasCards: false,
      isLoading: true,
      advance: jest.fn(),
    })

    render(<SuggestionsSidebar />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('affiche le SwipeDeck avec les cartes', () => {
    const cards = [{ id: 1 }, { id: 2 }, { id: 3 }]
    mockUseSuggestions.mockReturnValue({
      visibleCards: cards,
      hasCards: true,
      isLoading: false,
      advance: jest.fn(),
    })

    render(<SuggestionsSidebar />)
    expect(screen.getByTestId('swipe-deck')).toBeInTheDocument()
    expect(screen.getByText('Cards: 3')).toBeInTheDocument()
  })

  it('ne rend rien si pas de user', () => {
    // Override le mock useAuth pour ce test
    jest.spyOn(require('@/hooks/useAuth'), 'useAuth').mockReturnValue({ user: null })
    mockUseSuggestions.mockReturnValue({
      visibleCards: [],
      hasCards: false,
      isLoading: false,
      advance: jest.fn(),
    })

    const { container } = render(<SuggestionsSidebar />)
    expect(container.innerHTML).toBe('')
  })

  it('ne rend rien si pas de cartes et pas en chargement', () => {
    mockUseSuggestions.mockReturnValue({
      visibleCards: [],
      hasCards: false,
      isLoading: false,
      advance: jest.fn(),
    })

    const { container } = render(<SuggestionsSidebar />)
    expect(container.innerHTML).toBe('')
  })
})
