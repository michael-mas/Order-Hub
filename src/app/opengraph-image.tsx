import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { profile } from '@/content/profile'
import { themes } from '@/styles/tokens'

export const alt = `${profile.name} — ${profile.headline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const font = (weight: number) =>
  readFile(join(process.cwd(), `assets/fonts/inter-latin-${weight}-normal.woff`))

/** Share preview: what a recruiter's colleagues see when the link is pasted. */
export default async function OpenGraphImage() {
  const t = themes.dark
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: t.bg,
        color: t.text,
        fontFamily: 'Inter',
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -3, textTransform: 'uppercase' }}>
        {profile.name}
      </div>
      <div style={{ marginTop: 24, fontSize: 36, fontWeight: 400, maxWidth: 980 }}>
        {profile.headline}
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 24,
          color: t.accent,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        {`${profile.location} · ${profile.status}`}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Inter', data: await font(400), weight: 400, style: 'normal' },
        { name: 'Inter', data: await font(800), weight: 800, style: 'normal' },
      ],
    },
  )
}
