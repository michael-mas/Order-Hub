/**
 * Best-effort hardware probe. The result is an estimate, never an answer:
 * the frame governor has the last word from measured frame times.
 * Viewport width is deliberately absent — it says nothing about the GPU.
 */
export interface Capabilities {
  webgl2: boolean
  maxTextureSize: number
  gpuRenderer: string | null
  cores: number | null
  memoryGb: number | null
  dpr: number
  coarsePointer: boolean
  reducedMotion: boolean
  saveData: boolean
  effectiveType: string | null
}

interface NetworkInformationLike {
  saveData?: boolean
  effectiveType?: string
}

/** Reads capabilities from the browser. Never throws. */
export function readCapabilities(): Capabilities {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    connection?: NetworkInformationLike
  }
  const gl = probeWebGL2()
  return {
    webgl2: gl !== null,
    maxTextureSize: gl?.maxTextureSize ?? 0,
    gpuRenderer: gl?.renderer ?? null,
    cores: nav.hardwareConcurrency ?? null,
    memoryGb: nav.deviceMemory ?? null,
    dpr: window.devicePixelRatio || 1,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: nav.connection?.saveData === true,
    effectiveType: nav.connection?.effectiveType ?? null,
  }
}

function probeWebGL2(): { maxTextureSize: number; renderer: string | null } | null {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return null
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : null
    const maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { maxTextureSize, renderer }
  } catch {
    return null
  }
}
