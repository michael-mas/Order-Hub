import { expect, test } from '@playwright/test'

async function fill(page: import('@playwright/test').Page) {
  await page.goto('/')
  const form = page.locator('#contact form')
  await form.getByLabel('Nom').fill('Ada')
  await form.getByLabel('E‑mail').fill('ada@example.com')
  await form.getByLabel('Message').fill('Bonjour Michael')
  return form
}

test('a sent message shows a visible confirmation', async ({ page }) => {
  await page.route('/api/contact', (route) => route.fulfill({ json: { ok: true } }))
  const form = await fill(page)
  await form.getByRole('button', { name: 'Envoyer' }).click()
  await expect(form.getByRole('status')).toHaveText('Message envoyé, merci.')
})

test('a failed send says so and gives the address', async ({ page }) => {
  await page.route('/api/contact', (route) =>
    route.fulfill({ status: 502, json: { ok: false, error: 'Le relais est injoignable.' } }),
  )
  const form = await fill(page)
  await form.getByRole('button', { name: 'Envoyer' }).click()
  await expect(form.getByRole('status')).toContainText('Le relais est injoignable.')
  await expect(form.getByRole('status')).toContainText('masmichael280699@gmail.com')
})

test('the API rejects invalid input before reaching the relay', async ({ request }) => {
  const res = await request.post('/api/contact', { data: { name: '', email: 'x', message: '' } })
  expect(res.status()).toBe(400)
})
