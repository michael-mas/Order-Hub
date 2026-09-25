import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { profile } from '@/content/profile'
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
  title: profile.name,
  description: profile.headline,
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: themes.light.bg },
    { media: '(prefers-color-scheme: dark)', color: themes.dark.bg },
  ],
}

/** Applies a stored manual theme before first paint — no flash. */
const themeBootstrap = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

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
