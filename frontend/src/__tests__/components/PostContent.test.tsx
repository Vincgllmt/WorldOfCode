import { render } from '@testing-library/react'
import PostContent from '@/components/post/PostContent'

describe('PostContent', () => {
  it('affiche le contenu HTML assaini', () => {
    const { container } = render(<PostContent content="<p>Bonjour <strong>le monde</strong></p>" />)
    expect(container.querySelector('p')?.innerHTML).toBe('Bonjour <strong>le monde</strong>')
  })

  it('ne plante pas et affiche un conteneur vide quand content est null', () => {
    const { container } = render(<PostContent content={null} />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toBeInTheDocument()
    expect(root.innerHTML).toBe('')
  })

  it('retire les balises et attributs dangereux (script, onerror)', () => {
    const { container } = render(<PostContent content='<img src="x" onerror="alert(1)"><script>alert(1)</script>' />)
    expect(container.innerHTML.toLowerCase()).not.toContain('<script')
    expect(container.innerHTML.toLowerCase()).not.toContain('onerror')
  })

  it('applique la coloration syntaxique Prism pour un bloc de code supporté', () => {
    const { container } = render(
      <PostContent content='<pre class="language-js"><code class="language-js">const a = 1;</code></pre>' />
    )
    const code = container.querySelector('pre code')
    expect(code?.querySelector('.token')).not.toBeNull()
    expect(code?.textContent).toBe('const a = 1;')
  })

  it('laisse le bloc de code inchangé pour un langage non supporté par Prism', () => {
    const { container } = render(
      <PostContent content='<pre class="language-inconnu"><code class="language-inconnu">foo();</code></pre>' />
    )
    const code = container.querySelector('pre code')
    expect(code?.querySelector('.token')).toBeNull()
    expect(code?.textContent).toBe('foo();')
  })

  it('fusionne la className fournie avec les classes par défaut', () => {
    const { container } = render(<PostContent content="<p>x</p>" className="custom-class" />)
    const root = container.firstElementChild as HTMLElement
    expect(root).toHaveClass('custom-class')
    expect(root).toHaveClass('space-y-3')
  })
})
