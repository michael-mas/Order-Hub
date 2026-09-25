import { describe, expect, it, vi } from 'vitest'
import { deliverContact } from './contact'

const valid = { name: 'Ada', email: 'ada@example.com', message: 'Bonjour Michael' }
const ok = () =>
  vi.fn(async () => new Response(JSON.stringify({ success: 'true' }), { status: 200 }))

describe('deliverContact', () => {
  it('relays a valid message to the configured endpoint', async () => {
    const fetchImpl = ok()
    expect(await deliverContact(valid, 'someone@example.com', fetchImpl)).toEqual({ ok: true })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://formsubmit.co/ajax/someone%40example.com')
    expect(JSON.parse(String(init.body))).toMatchObject({
      name: 'Ada',
      _replyto: 'ada@example.com',
    })
  })

  it('rejects invalid input without calling the relay', async () => {
    const fetchImpl = ok()
    const result = await deliverContact({ ...valid, email: 'nope' }, 'x', fetchImpl)
    expect(result).toMatchObject({ ok: false, status: 400 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('drops bots that fill the honeypot', async () => {
    const fetchImpl = ok()
    expect(await deliverContact({ ...valid, company: 'spam inc' }, 'x', fetchImpl)).toMatchObject({
      status: 400,
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('reports a relay refusal instead of pretending it was sent', async () => {
    const refusing = vi.fn(
      async () => new Response(JSON.stringify({ success: 'false', message: 'Activate' })),
    )
    expect(await deliverContact(valid, 'x', refusing)).toEqual({
      ok: false,
      status: 502,
      error: 'Activate',
    })
  })

  it('reports a network failure', async () => {
    const failing = vi.fn(async () => {
      throw new Error('down')
    })
    expect(await deliverContact(valid, 'x', failing)).toMatchObject({ ok: false, status: 502 })
  })
})
