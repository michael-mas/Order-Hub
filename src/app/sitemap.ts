import type { MetadataRoute } from 'next'
import { CV_PATH, SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, { url: `${SITE_URL}${CV_PATH}` }]
}
