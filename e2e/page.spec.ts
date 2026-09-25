import { expect, test } from '@playwright/test'

const SECTIONS = [
  'profil',
  'cas-plugins',
  'cas-commandes',
  'cas-system-alive',
  'experience',
  'competences',
  'parcours',
  'contact',
]

test('every section is rendered in order', async ({ page }) => {
  await page.goto('/')
  const ids = await page.locator('main section[id]').evaluateAll((els) => els.map((e) => e.id))
  expect(ids.filter((id) => SECTIONS.includes(id))).toEqual(SECTIONS)
})

test('missing facts are shown as visible markers, never filled in', async ({ page }) => {
  await page.goto('/')
  const markers = page.locator('[data-pending]')
  expect(await markers.count()).toBeGreaterThan(0)
  await expect(markers.first()).toBeVisible()
})

test('the contact address is in clear text', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#contact a[href^="mailto:"]')).toHaveText('masmichael280699@gmail.com')
})

test('the theme toggle switches and remembers the theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  await page.getByRole('button', { name: /thème sombre/ }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('no horizontal overflow at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})

test('keyboard focus is visible', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)
  expect(outline).not.toBe('none')
})
