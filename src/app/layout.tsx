import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { profile } from '@/content/profile'
import './globals.css'

export const metadata: Metadata = {
  title: profile.name,
  description: profile.headline,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
