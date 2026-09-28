import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { createRandom } from '../src/random.ts'
import { sameSecret, sign, verify } from '../src/signature.ts'
import { TokenBucket } from '../src/tokenBucket.ts'

describe('createRandom', () => {
  it('replays the same sequence from the same seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(
      Array.from({ length: 50 }, () => b.next()),
    )
  })

  it('keeps int() within its inclusive bounds', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: -1000, max: 1000 }),
        fc.nat(1000),
        (seed, min, span) => {
          const random = createRandom(seed)
          for (let i = 0; i < 20; i += 1) {
            const value = random.int(min, min + span)
            expect(value).toBeGreaterThanOrEqual(min)
            expect(value).toBeLessThanOrEqual(min + span)
            expect(Number.isInteger(value)).toBe(true)
          }
        },
      ),
    )
  })

  it('honours the extreme probabilities exactly', () => {
    const random = createRandom(7)
    expect(Array.from({ length: 100 }, () => random.chance(0)).some(Boolean)).toBe(false)
    expect(Array.from({ length: 100 }, () => random.chance(1)).every(Boolean)).toBe(true)
  })

  it('rejects impossible requests', () => {
    expect(() => createRandom(1).int(5, 4)).toThrow(RangeError)
    expect(() => createRandom(1).pick([])).toThrow(RangeError)
  })
})

describe('TokenBucket', () => {
  it('never serves more than the burst plus what the elapsed time refilled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.double({ min: 0.1, max: 20, noNaN: true }),
        fc.array(fc.nat(2_000), { minLength: 1, maxLength: 200 }),
        (capacity, refillPerSecond, gaps) => {
          const start = 1_000_000
          const bucket = new TokenBucket({ capacity, refillPerSecond }, start)
          let now = start
          let allowed = 0
          for (const gap of gaps) {
            now += gap
            if (bucket.take(now).allowed) allowed += 1
          }
          const budget = capacity + ((now - start) / 1000) * refillPerSecond
          expect(allowed).toBeLessThanOrEqual(Math.floor(budget + 1e-9))
        },
      ),
    )
  })

  it('serves again once the announced delay has passed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (capacity, rate) => {
          const bucket = new TokenBucket({ capacity, refillPerSecond: rate }, 0)
          for (let i = 0; i < capacity; i += 1) expect(bucket.take(0).allowed).toBe(true)
          const refused = bucket.take(0)
          expect(refused.allowed).toBe(false)
          if (refused.allowed) return
          expect(bucket.take(refused.retryAfterMs).allowed).toBe(true)
        },
      ),
    )
  })

  it('does not mint tokens when the clock goes backwards', () => {
    const bucket = new TokenBucket({ capacity: 1, refillPerSecond: 1 }, 10_000)
    expect(bucket.take(10_000).allowed).toBe(true)
    expect(bucket.take(5_000).allowed).toBe(false)
  })

  it('keeps earned tokens within the new capacity after a plan change', () => {
    const bucket = new TokenBucket({ capacity: 10, refillPerSecond: 1 }, 0)
    bucket.reconfigure({ capacity: 2, refillPerSecond: 1 }, 0)
    expect(bucket.take(0).allowed).toBe(true)
    expect(bucket.take(0).allowed).toBe(true)
    expect(bucket.take(0).allowed).toBe(false)
  })
})

describe('webhook signature', () => {
  it('verifies what it signed, and nothing else', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.string({ minLength: 1 }),
        (secret, body, extra) => {
          const header = sign(secret, 1_000, body)
          expect(verify(secret, header, body, 1_000)).toBe(true)
          expect(verify(secret, header, body + extra, 1_000)).toBe(false)
          expect(verify(secret + extra, header, body, 1_000)).toBe(false)
        },
      ),
    )
  })

  it('rejects stale or malformed headers', () => {
    const header = sign('s', 1_000, '{}')
    expect(verify('s', header, '{}', 1_000 + 301)).toBe(false)
    expect(verify('s', 'garbage', '{}', 1_000)).toBe(false)
    expect(verify('s', 't=1000,v1=', '{}', 1_000)).toBe(false)
  })
})

describe('sameSecret', () => {
  it('accepts only the exact secret', () => {
    expect(sameSecret('control-token', 'control-token')).toBe(true)
    expect(sameSecret('control-token', 'control-toke')).toBe(false)
    expect(sameSecret('control-token', 'control-token ')).toBe(false)
    expect(sameSecret('control-token', undefined)).toBe(false)
    expect(sameSecret('', '')).toBe(false)
  })
})
