// npm run capture — the real page at 5 viewports × 8 scroll stops, with Web
// Vitals (LCP, CLS, long tasks) and console errors. Runs on a production build.
// Output: captures/page/<timestamp>/<viewport>-<stop>.png + report.json
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { WEBGL_ARGS, timestamp, withServer } from './server.mjs'

const VIEWPORTS = [
  { name: '360', width: 360, height: 800, isMobile: true },
  { name: '768', width: 768, height: 1024, isMobile: true },
  { name: '1280', width: 1280, height: 800, isMobile: false },
  { name: '1920', width: 1920, height: 1080, isMobile: false },
  { name: '2560', width: 2560, height: 1440, isMobile: false },
]
const STOPS = 8
const PATH = process.env.CAPTURE_PATH ?? '/?governor=off'
const outDir = `captures/page/${timestamp()}`

// Installed before any page script: collects vitals into window.__vitals.
const vitalsProbe = () => {
  const v = { lcp: 0, lcpElement: '', cls: 0, longTasks: 0, longTaskMs: 0 }
  window.__vitals = v
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      v.lcp = e.startTime
      v.lcpElement = e.element ? e.element.tagName.toLowerCase() : ''
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) v.cls += e.value
  }).observe({ type: 'layout-shift', buffered: true })
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      v.longTasks += 1
      v.longTaskMs += e.duration
    }
  }).observe({ type: 'longtask', buffered: true })
}

await mkdir(outDir, { recursive: true })

const report = await withServer({ mode: 'start', port: 3300 }, async (base) => {
  const browser = await chromium.launch({ args: WEBGL_ARGS })
  const results = []
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.addInitScript(vitalsProbe)
    await page.goto(base + PATH, { waitUntil: 'networkidle' })

    // LCP is final at the first user input. Programmatic scrolling is not input,
    // so read it before scrolling — otherwise late-revealed headings get counted.
    await page.waitForTimeout(1000)
    const lcpBeforeScroll = await page.evaluate(() => ({
      lcp: window.__vitals.lcp,
      el: window.__vitals.lcpElement,
    }))
    const scrollMax = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    for (let i = 0; i < STOPS; i++) {
      const y = Math.round((scrollMax * i) / (STOPS - 1))
      await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: `${outDir}/${vp.name}-${i}.png` })
    }
    const vitals = await page.evaluate(() => window.__vitals)
    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    results.push({
      viewport: vp.name,
      scrollMax,
      horizontalOverflow,
      errors,
      ...vitals,
      lcp: lcpBeforeScroll.lcp,
      lcpElement: lcpBeforeScroll.el,
    })
    await context.close()
  }
  await browser.close()
  return results
})

await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2))
console.log(`captures in ${outDir}`)
console.table(
  report.map((r) => ({
    viewport: r.viewport,
    'LCP ms': Math.round(r.lcp),
    'LCP el': r.lcpElement,
    CLS: r.cls.toFixed(3),
    'long tasks': r.longTasks,
    'x-overflow': r.horizontalOverflow,
    errors: r.errors.length,
  })),
)
if (report.some((r) => r.errors.length > 0 || r.horizontalOverflow)) process.exitCode = 1
