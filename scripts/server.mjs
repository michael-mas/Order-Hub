// Starts a Next.js server for capture scripts and stops it afterwards.
import { spawn } from 'node:child_process'

export async function withServer({ mode, port, env = {} }, run) {
  const args =
    mode === 'dev' ? ['next', 'dev', '-p', String(port)] : ['next', 'start', '-p', String(port)]
  const child = spawn('npx', args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  let log = ''
  child.stdout.on('data', (d) => (log += d))
  child.stderr.on('data', (d) => (log += d))
  const url = `http://localhost:${port}`
  try {
    await waitFor(url, 90_000)
    return await run(url)
  } catch (error) {
    console.error(log.slice(-4000))
    throw error
  } finally {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      // already stopped
    }
  }
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`server did not start at ${url}`)
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/** Chromium launch options that give headless WebGL through SwiftShader. */
export const WEBGL_ARGS = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
]
