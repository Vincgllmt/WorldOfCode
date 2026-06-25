import { sanitizeHtml } from '@/lib/sanitizeHtml'

describe('sanitizeHtml (SEC-20)', () => {
  it('conserve le HTML de base et l’attribut class', () => {
    const out = sanitizeHtml('<p class="x"><strong>Salut</strong> <a href="https://woc.test">lien</a></p>')
    expect(out).toContain('<strong>Salut</strong>')
    expect(out).toContain('class="x"')
    expect(out).toContain('href="https://woc.test"')
  })

  it('retire les balises SVG (surface XSS inutile)', () => {
    const out = sanitizeHtml('<p>ok</p><svg><circle r="10" /></svg>')
    expect(out).toContain('<p>ok</p>')
    expect(out.toLowerCase()).not.toContain('<svg')
    expect(out.toLowerCase()).not.toContain('<circle')
  })

  it('neutralise les scripts et handlers inline', () => {
    const out = sanitizeHtml('<img src=x onerror=alert(1)><script>alert(1)</script>')
    expect(out.toLowerCase()).not.toContain('<script')
    expect(out.toLowerCase()).not.toContain('onerror')
  })
})
