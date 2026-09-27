import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  variable: '--font-inter',
  display: 'swap',
  weight: '100 900',
})
const jetbrains = localFont({
  src: './fonts/jetbrains-mono-latin-var.woff2',
  variable: '--font-jetbrains',
  display: 'swap',
  weight: '100 800',
})

export const metadata: Metadata = {
  title: 'Order Hub — control room',
  description:
    'Reliable, observable order ingestion from unruly marketplaces. Break the channels, watch the hub absorb it.',
}

export const viewport: Viewport = {
  themeColor: '#0a0e14',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
