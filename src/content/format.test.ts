import { describe, expect, it } from 'vitest'
import { formatMonthYear } from './format'

describe('formatMonthYear', () => {
  it('formats in French, independent of the day', () => {
    expect(formatMonthYear('2022-09-06')).toBe('sept. 2022')
    expect(formatMonthYear('2023-10')).toBe('oct. 2023')
  })
})
