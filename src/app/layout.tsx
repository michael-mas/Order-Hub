import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { profile } from '@/content/profile'
import { SITE_URL } from '@/lib/site'
import { themeCss, themes } from '@/styles/tokens'
import './globals.css'

const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = localFont({
  src: './fonts/jetbrains-mono-latin-var.woff2',
  weight: '100 800',
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${profile.name} — ${profile.headline}`,
  description: profile.tagline,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    locale: 'fr_FR',
    url: '/',
    siteName: profile.name,
    title: `${profile.name} — ${profile.headline}`,
    description: profile.tagline,
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: themes.dark.bg,
}

/** Before first paint: stored theme (no flash), and motion on unless the visitor asked for less. */
const themeBootstrap = `try{var d=document.documentElement,t=localStorage.getItem('theme');if(t==='light'||t==='dark')d.dataset.theme=t;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)d.dataset.motion='on'}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <style>{themeCss()}</style>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
