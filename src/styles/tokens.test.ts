import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'
import { themeCss, themes } from './tokens'

const AA_TEXT = 4.5

describe.each(Object.entries(themes))('theme %s', (_name, t) => {
  const pairs: Array<[string, string, string]> = [
    ['text on bg', t.text, t.bg],
    ['text on surface', t.text, t.surface],
    ['muted on bg', t.textMuted, t.bg],
    ['faint on bg', t.textFaint, t.bg],
    ['accent on bg', t.accent, t.bg],
    ['on-accent on accent', t.onAccent, t.accent],
    ['danger on bg', t.danger, t.bg],
    ['marker on bg', t.marker, t.bg],
    ['text on sunken bg', t.text, t.bgSunken],
    ['faint on sunken bg', t.textFaint, t.bgSunken],
  ]

  it.each(pairs)('%s meets WCAG AA', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })
})

describe('themeCss', () => {
  it('declares every token for both themes and honours a manual override', () => {
    const css = themeCss()
    expect(css).toContain('--text-muted:')
    expect(css).toContain(':root[data-theme="dark"]')
    expect(css).toContain(':root:not([data-theme="light"])')
  })
})
