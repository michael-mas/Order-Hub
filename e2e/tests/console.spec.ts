import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('control room', () => {
  test('shows live data from the hub and the simulator', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1 })).toContainText('exactly once')
    await expect(page.getByText('live', { exact: true })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Channel Nova Market' })).toBeVisible()
    await expect(page.getByRole('article', { name: 'Channel Atlas Marketplace' })).toBeVisible()
    // The simulator creates orders on its own; the journal must fill up.
    await expect(page.locator('#journal li[id^="entry-"]').first()).toBeVisible({ timeout: 30_000 })
  })

  test('has no serious accessibility violation', async ({ page }) => {
    // Audit the settled page: new journal rows fade in, and a row caught
    // mid-animation would be measured half transparent.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('#journal li[id^="entry-"]').first()).toBeVisible({ timeout: 30_000 })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    )
    expect(serious.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([])
  })

  test('has no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
  })
})

test.describe('operations', () => {
  test('pausing and resuming a channel is journaled', async ({ page }) => {
    await page.goto('/')
    const atlas = page.getByRole('article', { name: 'Channel Atlas Marketplace' })

    await atlas.getByRole('button', { name: 'Pause' }).click()
    await expect(atlas.getByText('paused by an operator')).toBeVisible()
    await expect(page.locator('#journal').getByText('Channel paused by an operator')).toBeVisible()

    await atlas.getByRole('button', { name: 'Resume' }).click()
    await expect(atlas.getByRole('button', { name: 'Pause' })).toBeVisible()
    await expect(
      page.locator('#journal').getByText('Channel resumed by an operator.'),
    ).toBeVisible()
  })

  test('the incident analyst cites real journal entries', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#journal li[id^="entry-"]').first()).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Analyse now' }).click()
    const analyst = page.locator('#analyst')
    await expect(analyst.getByText(/engine rules/)).toBeVisible()

    // The cited entries come with the analysis, even once they have
    // scrolled out of the live journal.
    const evidence = analyst.getByRole('button', { name: /Show evidence/ })
    if ((await evidence.count()) > 0) {
      await evidence.first().click()
      await expect(
        analyst
          .getByRole('list', { name: /^Evidence for/ })
          .getByRole('listitem')
          .first(),
      ).toBeVisible()
    }
  })
})

test.describe('public surface', () => {
  test('the console proxy refuses anything outside its allowlist', async ({ request }) => {
    expect((await request.post('/api/simulator/control/reset')).status()).toBe(404)
    expect((await request.get('/api/simulator/control/marketplaces/nova/orders')).status()).toBe(
      404,
    )
    expect((await request.get('/api/hub/_profiler')).status()).toBe(404)
    expect((await request.get('/api/hub/api/channels')).status()).toBe(200)
  })

  test('pages ship a strict CSP, and the console runs within it', async ({ page, request }) => {
    const violations: string[] = []
    page.on('console', (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text())
    })
    const response = await page.goto('/')
    const headers = response?.headers() ?? {}
    const policy = headers['content-security-policy'] ?? ''
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{24}' 'strict-dynamic'/)
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).not.toContain('unsafe-inline')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-powered-by']).toBeUndefined()

    // Live data means the scripts ran under the policy.
    await expect(page.getByText('live', { exact: true })).toBeVisible()
    await expect(page.locator('#journal li[id^="entry-"]').first()).toBeVisible({ timeout: 30_000 })
    expect(violations).toEqual([])

    const again = (await request.get('/')).headers()['content-security-policy']
    expect(again).toMatch(/'nonce-/)
    expect(again).not.toBe(policy)
  })

  test('writes from another site and oversized bodies are refused', async ({ request }) => {
    const replay = '/api/hub/api/failed-messages/replay'
    const crossSite = await request.post(replay, { headers: { 'sec-fetch-site': 'cross-site' } })
    expect(crossSite.status()).toBe(403)
    const foreign = await request.post(replay, { headers: { origin: 'https://evil.example' } })
    expect(foreign.status()).toBe(403)
    const large = await request.post(replay, {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({ padding: 'x'.repeat(20_000) }),
    })
    expect(large.status()).toBe(413)
  })

  test('costly actions are rate-limited', async ({ request }) => {
    const statuses: number[] = []
    for (let i = 0; i < 6; i += 1) statuses.push((await request.get('/api/consistency')).status())
    expect(statuses).toContain(429)
    const limited = await request.get('/api/consistency')
    if (limited.status() === 429)
      expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0)
    // Leave the bucket full for the tests that follow.
    await new Promise((resolve) => setTimeout(resolve, 10_000))
  })
})
