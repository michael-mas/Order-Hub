import { expect, test } from '@playwright/test'

test('the scene mounts after the text, and the canvas is never the LCP element', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __lcp: string }
    w.__lcp = ''
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<PerformanceEntry & { element?: Element }>) {
        w.__lcp = e.element?.tagName.toLowerCase() ?? ''
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
  })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-scene', /low|medium|high/, {
    timeout: 15_000,
  })
  await expect(page.locator('.scene-layer canvas')).toHaveCount(1)
  const lcp = await page.evaluate(() => (window as unknown as { __lcp: string }).__lcp)
  expect(lcp).not.toBe('canvas')
})

test('cutting the canvas leaves a complete page (?3d=off)', async ({ page }) => {
  await page.goto('/?3d=off')
  await page.waitForTimeout(1500)
  await expect(page.locator('canvas')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#contact a[href^="mailto:"]')).toBeVisible()
})

test('prefers-reduced-motion means no scene at all', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.waitForTimeout(1500)
  await expect(page.locator('canvas')).toHaveCount(0)
})
