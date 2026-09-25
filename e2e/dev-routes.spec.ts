import { expect, test } from '@playwright/test'

test('the scene inspector is not served by a production build', async ({ page }) => {
  const response = await page.goto('/dev/scene')
  expect(response?.status()).toBe(404)
})
