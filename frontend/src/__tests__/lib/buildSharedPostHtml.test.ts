import { buildSharedPostHtml } from '@/lib/buildSharedPostHtml'
import type { Post } from '@/interfaces/post'

const makePost = (overrides: Partial<Post> = {}): Post =>
  ({
    id: 12,
    content: '<p>Hello <strong>Night City</strong></p>',
    authorId: 7,
    authorUsername: 'johnny',
    techGroupName: 'Samurai',
    ...overrides,
  }) as Post

const render = (html: string) => {
  const container = document.createElement('div')
  container.innerHTML = html
  return container
}

describe('buildSharedPostHtml', () => {
  it('construit la carte avec auteur, groupe, extrait et lien', () => {
    const el = render(buildSharedPostHtml(makePost()))

    expect(el.querySelector('.shared-post-avatar')?.textContent).toBe('JO')
    const author = el.querySelector('a.shared-post-author')
    expect(author?.getAttribute('href')).toBe('/user/7')
    expect(author?.textContent).toBe('johnny')
    expect(el.querySelector('.shared-post-group')?.textContent).toBe('Samurai')
    expect(el.querySelector('.shared-post-excerpt')?.textContent).toBe('Hello Night City')
    expect(el.querySelector('a.shared-post-link')?.getAttribute('href')).toBe('/post/12')
  })

  it('tronque l\'extrait au-dela de 150 caracteres', () => {
    const long = 'a'.repeat(200)
    const el = render(buildSharedPostHtml(makePost({ content: long })))

    expect(el.querySelector('.shared-post-excerpt')?.textContent).toBe('a'.repeat(150) + '…')
  })

  it('omet l\'extrait si le contenu est vide', () => {
    const el = render(buildSharedPostHtml(makePost({ content: '' })))
    expect(el.querySelector('.shared-post-excerpt')).toBeNull()
  })

  it('omet l\'extrait si le contenu est absent', () => {
    const el = render(buildSharedPostHtml(makePost({ content: undefined as any })))
    expect(el.querySelector('.shared-post-excerpt')).toBeNull()
  })

  it('ajoute le message personnel en echappant le HTML', () => {
    const html = buildSharedPostHtml(makePost(), '<script>alert(1)</script> regarde ça')

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; regarde ça')
    expect(html).not.toContain('<script>')
    expect(render(html).querySelector('.shared-post-personal')).not.toBeNull()
  })

  it('ignore un message personnel compose uniquement d\'espaces', () => {
    const el = render(buildSharedPostHtml(makePost(), '   '))
    expect(el.querySelector('.shared-post-personal')).toBeNull()
  })
})
