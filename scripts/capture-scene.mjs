// npm run capture:scene — renders every layout from fixed inspection cameras.
// Output: captures/scene/<timestamp>/<layout>-<view>.png
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { WEBGL_ARGS, timestamp, withServer } from './server.mjs'

const VIEWS = ['front', 'top', 'side', 'iso', 'production']
const LAYOUTS = (process.env.LAYOUTS ?? 'hero').split(',')
const outDir = `captures/scene/${timestamp()}`

await mkdir(outDir, { recursive: true })

await withServer({ mode: 'dev', port: 3200 }, async (base) => {
  const browser = await chromium.launch({ args: WEBGL_ARGS })
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  for (const layout of LAYOUTS) {
    for (const view of VIEWS) {
      await page.goto(`${base}/dev/scene?layout=${layout}&view=${view}`)
      await page.waitForSelector('body[data-scene-ready="1"]', {
        state: 'attached',
        timeout: 60_000,
      })
      const file = `${outDir}/${layout}-${view}.png`
      await page.screenshot({ path: file })
      console.log(file)
    }
  }
  await browser.close()
  if (errors.length > 0) {
    console.error('console errors:\n' + errors.join('\n'))
    process.exitCode = 1
  }
})
