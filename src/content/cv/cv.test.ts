import { renderToBuffer } from '@react-pdf/renderer'
import { describe, expect, it } from 'vitest'
import { profile } from '../profile'
import { CvDocument } from './CvDocument'

describe('CV', () => {
  it('renders a one-page PDF from profile.ts', async () => {
    const pdf = await renderToBuffer(CvDocument({ profile }))
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
    const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []
    expect(pages).toHaveLength(1)
  }, 20_000)
})
