import { describe, it, expect } from 'vitest'
import sv from './sv.json'
import en from './en.json'

function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, val]) => {
    const full = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return getLeafKeys(val as Record<string, unknown>, full)
    }
    return [full]
  })
}

describe('i18n parity', () => {
  it('sv.json and en.json have identical keys', () => {
    const svKeys = getLeafKeys(sv as unknown as Record<string, unknown>).sort()
    const enKeys = getLeafKeys(en as unknown as Record<string, unknown>).sort()

    const missingInEn = svKeys.filter((k) => !enKeys.includes(k))
    const missingInSv = enKeys.filter((k) => !svKeys.includes(k))

    expect(missingInEn, 'Keys in sv.json but missing in en.json').toEqual([])
    expect(missingInSv, 'Keys in en.json but missing in sv.json').toEqual([])
  })
})
