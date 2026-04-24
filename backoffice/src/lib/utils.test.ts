import { describe, it, expect } from 'vitest'
import { parseReportReason } from './utils'

describe('parseReportReason', () => {
  it('retourne null/null pour une valeur null', () => {
    expect(parseReportReason(null)).toEqual({ label: null, details: null })
  })

  it('retourne null/null pour une valeur undefined', () => {
    expect(parseReportReason(undefined)).toEqual({ label: null, details: null })
  })

  it('retourne null/null pour une chaîne vide', () => {
    expect(parseReportReason('')).toEqual({ label: null, details: null })
  })

  it('retourne tout en label quand aucun séparateur', () => {
    expect(parseReportReason('Spam')).toEqual({ label: 'Spam', details: null })
  })

  it('sépare correctement label et détails', () => {
    expect(parseReportReason('Spam — contenu répétitif')).toEqual({
      label: 'Spam',
      details: 'contenu répétitif',
    })
  })

  it('place uniquement au premier séparateur — détails peut contenir des tirets', () => {
    expect(parseReportReason('Harcèlement — menaces — répétées')).toEqual({
      label: 'Harcèlement',
      details: 'menaces — répétées',
    })
  })

  it('gère un séparateur en début de chaîne (label vide)', () => {
    // ' — texte' → séparateur à l'index 0 → label = ''
    expect(parseReportReason(' — texte')).toEqual({ label: '', details: 'texte' })
  })

  it('gère un label sans détails avec séparateur en fin', () => {
    const result = parseReportReason('Autre — ')
    expect(result.label).toBe('Autre')
    expect(result.details).toBe('')
  })
})
