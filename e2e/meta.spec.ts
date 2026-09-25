import { expect, test } from '@playwright/test'

test('the CV PDF is served, built from profile.ts', async ({ request }) => {
  const res = await request.get('/cv-michael-mas.pdf')
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('application/pdf')
  expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-')
})

test('robots.txt keeps /dev out and points to the sitemap', async ({ request }) => {
  const body = await (await request.get('/robots.txt')).text()
  expect(body).toContain('Disallow: /dev/')
  expect(body).toContain('sitemap.xml')
})

test('share metadata and structured data are present', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Michael Mas/)
  const og = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(og).toBeTruthy()
  const image = await request.get(new URL(og!).pathname + new URL(og!).search)
  expect(image.headers()['content-type']).toBe('image/png')
  const ld = await page.locator('script[type="application/ld+json"]').textContent()
  expect(JSON.parse(ld!)['@type']).toBe('Person')
})

test('the footer links to the CV', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('footer a[href="/cv-michael-mas.pdf"]')).toBeVisible()
})
