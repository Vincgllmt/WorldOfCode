import { render, screen } from '@testing-library/react'
import ChallengeStatement from '@/components/arena/ChallengeStatement'

describe('ChallengeStatement', () => {
  it('ne rend rien pour un énoncé vide', () => {
    const { container } = render(<ChallengeStatement statement="" />)
    expect(container.querySelector('div')?.children.length).toBe(0)
  })

  it('masque le premier titre H1 par défaut', () => {
    render(<ChallengeStatement statement={'# Mon défi\n\nUn paragraphe.'} />)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(screen.getByText('Un paragraphe.')).toBeInTheDocument()
  })

  it('conserve le titre H1 quand hideLeadingTitle est désactivé', () => {
    render(<ChallengeStatement statement={'# Mon défi\n\nUn paragraphe.'} hideLeadingTitle={false} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Mon défi' })).toBeInTheDocument()
  })

  it('ne masque pas un H1 qui ne serait pas le premier bloc', () => {
    render(<ChallengeStatement statement={'Intro.\n\n# Titre plus bas'} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Titre plus bas' })).toBeInTheDocument()
  })

  it('rend les titres de niveau 2 à 6', () => {
    render(<ChallengeStatement statement={'## H2\n\n### H3\n\n###### H6'} />)
    expect(screen.getByRole('heading', { level: 2, name: 'H2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'H3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'H6' })).toBeInTheDocument()
  })

  it('fusionne les retours à la ligne "doux" en espace dans un paragraphe', () => {
    render(<ChallengeStatement statement={'Première ligne\ndeuxième ligne.'} />)
    expect(screen.getByText('Première ligne deuxième ligne.')).toBeInTheDocument()
  })

  it('rend un bloc de code clôturé avec son langage', () => {
    const { container } = render(<ChallengeStatement statement={'```js\nconsole.log(1)\n```'} />)
    expect(container.querySelector('pre code')).toHaveTextContent('console.log(1)')
  })

  it('rend un bloc de code indenté (4 espaces)', () => {
    const { container } = render(<ChallengeStatement statement={'    const x = 1\n    const y = 2'} />)
    expect(container.querySelector('pre code')?.textContent).toBe('const x = 1\nconst y = 2')
  })

  it('rend une liste non ordonnée', () => {
    render(<ChallengeStatement statement={'- item un\n- item deux'} />)
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('UL')
    expect(screen.getByText('item un')).toBeInTheDocument()
    expect(screen.getByText('item deux')).toBeInTheDocument()
  })

  it('rend une liste ordonnée', () => {
    render(<ChallengeStatement statement={'1. premier\n2. second'} />)
    const list = screen.getByRole('list')
    expect(list.tagName).toBe('OL')
  })

  it('applique le formatage inline : code, gras, italique et lien', () => {
    render(
      <ChallengeStatement
        statement={'Voici `du code`, du **gras**, de l\'*italique* et un [lien](https://example.com).'}
      />,
    )
    expect(screen.getByText('du code', { selector: 'code' })).toBeInTheDocument()
    expect(screen.getByText('gras', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('italique', { selector: 'em' })).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'lien' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('applique l\'italique avec la syntaxe underscore', () => {
    render(<ChallengeStatement statement={'Du texte _en italique_ ici.'} />)
    expect(screen.getByText('en italique', { selector: 'em' })).toBeInTheDocument()
  })

  it('rend plusieurs blocs de types différents dans le même énoncé', () => {
    render(
      <ChallengeStatement
        statement={'## Consignes\n\nExplique le problème.\n\n- Étape 1\n- Étape 2\n\n```\nfoo()\n```'}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Consignes' })).toBeInTheDocument()
    expect(screen.getByText('Explique le problème.')).toBeInTheDocument()
    expect(screen.getByText('Étape 1')).toBeInTheDocument()
    expect(screen.getByText('foo()')).toBeInTheDocument()
  })
})
