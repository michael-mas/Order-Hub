/**
 * Colour tokens — the single source for both themes. CSS custom properties are
 * generated from this file (see themeCss) and every text/background pair is
 * contrast-tested. No component knows a literal colour.
 */

export const accent = {
  50: '#EAFBF3',
  100: '#C9F5E1',
  300: '#7FE9BC',
  400: '#5CE8AC',
  500: '#3DDC97',
  600: '#22B87A',
  700: '#0E7F55',
  800: '#0A6B47',
  900: '#07472F',
} as const

export interface ThemeColors {
  bg: string
  bgSunken: string
  surface: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textFaint: string
  accent: string
  accentHover: string
  onAccent: string
  danger: string
  /** Temporary: `⟨À CONFIRMER⟩` markers. Must be gone before publication. */
  marker: string
}

export const themes: Record<'light' | 'dark', ThemeColors> = {
  light: {
    bg: '#FBFAF7',
    bgSunken: '#F2F0EB',
    surface: '#FFFFFF',
    border: 'rgba(14, 17, 22, 0.12)',
    borderStrong: 'rgba(14, 17, 22, 0.24)',
    text: '#0E1116',
    textMuted: '#4A5561',
    textFaint: '#5F6B78',
    accent: accent[700],
    accentHover: accent[800],
    onAccent: '#FFFFFF',
    danger: '#C0303A',
    marker: '#8A4B00',
  },
  dark: {
    bg: '#0A0E14',
    bgSunken: '#06090D',
    surface: '#131A22',
    border: 'rgba(232, 237, 242, 0.10)',
    borderStrong: 'rgba(232, 237, 242, 0.20)',
    text: '#E8EDF2',
    textMuted: '#8A97A6',
    textFaint: '#6E7C8C',
    accent: accent[500],
    accentHover: accent[400],
    onAccent: '#0A0E14',
    danger: '#FF6B6B',
    marker: '#FFB454',
  },
}

const cssName = (key: string) => '--' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

function declarations(colors: ThemeColors): string {
  return Object.entries(colors)
    .map(([key, value]) => `${cssName(key)}:${value};`)
    .join('')
}

/**
 * Light by default, dark when the system asks for it, and a manual override
 * through `data-theme` on <html> in both directions.
 */
export function themeCss(): string {
  const light = declarations(themes.light)
  const dark = declarations(themes.dark)
  return [
    `:root{color-scheme:light;${light}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;${dark}}}`,
    `:root[data-theme="dark"]{color-scheme:dark;${dark}}`,
  ].join('')
}
