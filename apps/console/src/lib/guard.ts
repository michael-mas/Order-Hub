/**
 * Checks on the writes the public console relays. The console has no session
 * to steal, but another site must still not be able to drive a visitor's
 * browser into it, and no request may make it buffer an unbounded body.
 */
export const MAX_BODY_BYTES = 16 * 1024

/**
 * True for a request another site made the browser send. Browsers say so in
 * `Sec-Fetch-Site`, and older ones in `Origin`; other clients send neither and
 * carry no ambient credentials.
 */
export function isCrossSite(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site')
  if (site !== null && site !== 'same-origin' && site !== 'none') return true
  const origin = request.headers.get('origin')
  if (origin === null) return false
  try {
    return new URL(origin).host !== request.headers.get('host')
  } catch {
    return true
  }
}

/** The body as text, or null when it is larger than `limit` bytes. */
export async function readLimited(
  request: Request,
  limit: number = MAX_BODY_BYTES,
): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > limit) return null
  if (request.body === null) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}
