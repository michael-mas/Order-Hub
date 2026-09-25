'use client'

import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'

function currentTheme(): Theme {
  const manual = document.documentElement.dataset.theme
  if (manual === 'light' || manual === 'dark') return manual
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  media.addEventListener('change', onChange)
  return () => {
    observer.disconnect()
    media.removeEventListener('change', onChange)
  }
}

/** Switches between light and dark; the choice is remembered on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null)
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next
        try {
          localStorage.setItem('theme', next)
        } catch {
          // storage unavailable: the choice lasts for this page only
        }
      }}
      className="label-mono rounded-md border border-border-strong px-3 py-2 text-text-muted hover:text-text"
      aria-label={
        theme ? `Passer au thème ${next === 'dark' ? 'sombre' : 'clair'}` : 'Changer de thème'
      }
    >
      {theme === 'dark' ? 'Clair' : theme === 'light' ? 'Sombre' : 'Thème'}
    </button>
  )
}
