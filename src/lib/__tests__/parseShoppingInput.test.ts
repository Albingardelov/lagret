import { describe, it, expect } from 'vitest'
import { parseShoppingInput } from '../parseShoppingInput'

describe('parseShoppingInput', () => {
  it('parses quantity + unit + name', () => {
    expect(parseShoppingInput('2 l mjölk')).toEqual({ quantity: 2, unit: 'l', name: 'mjölk' })
  })

  it('parses quantity + unit + multi-word name', () => {
    expect(parseShoppingInput('500 g nötfärs')).toEqual({
      quantity: 500,
      unit: 'g',
      name: 'nötfärs',
    })
  })

  it('parses decimal quantity', () => {
    expect(parseShoppingInput('0.5 kg smör')).toEqual({ quantity: 0.5, unit: 'kg', name: 'smör' })
  })

  it('parses comma decimal', () => {
    expect(parseShoppingInput('1,5 l mjölk')).toEqual({ quantity: 1.5, unit: 'l', name: 'mjölk' })
  })

  it('parses quantity without unit as st', () => {
    expect(parseShoppingInput('12 ägg')).toEqual({ quantity: 12, unit: 'st', name: 'ägg' })
  })

  it('parses name only as 1 st', () => {
    expect(parseShoppingInput('Mjölk')).toEqual({ quantity: 1, unit: 'st', name: 'Mjölk' })
  })

  it('trims whitespace', () => {
    expect(parseShoppingInput('  3 dl grädde  ')).toEqual({
      quantity: 3,
      unit: 'dl',
      name: 'grädde',
    })
  })

  it('handles all known units', () => {
    expect(parseShoppingInput('2 msk soja')).toEqual({ quantity: 2, unit: 'msk', name: 'soja' })
    expect(parseShoppingInput('1 förp bacon')).toEqual({ quantity: 1, unit: 'förp', name: 'bacon' })
    expect(parseShoppingInput('3 burk krossade tomater')).toEqual({
      quantity: 3,
      unit: 'burk',
      name: 'krossade tomater',
    })
  })

  it('returns empty name as-is', () => {
    expect(parseShoppingInput('')).toEqual({ quantity: 1, unit: 'st', name: '' })
  })
})
