import { renderToBuffer } from '@react-pdf/renderer'
import { CvDocument } from '@/content/cv/CvDocument'
import { profile } from '@/content/profile'

export const dynamic = 'force-static'

/** The CV, rendered once at build time from profile.ts. */
export async function GET() {
  const pdf = await renderToBuffer(CvDocument({ profile }))
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="cv-michael-mas.pdf"',
    },
  })
}
