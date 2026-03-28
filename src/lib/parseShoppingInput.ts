import { UNITS } from './units'

const ALL_UNITS = UNITS.flatMap((g) => g.items)

export interface ParsedShoppingInput {
  quantity: number
  unit: string
  name: string
}

export function parseShoppingInput(input: string): ParsedShoppingInput {
  const trimmed = input.trim()
  if (!trimmed) return { quantity: 1, unit: 'st', name: '' }

  // Pattern: optional number, optional unit, rest is name
  const match = trimmed.match(/^(\d+[.,]?\d*)\s+(.+)$/)
  if (!match) return { quantity: 1, unit: 'st', name: trimmed }

  const quantity = parseFloat(match[1].replace(',', '.'))
  const rest = match[2]

  // Check if rest starts with a known unit
  for (const unit of ALL_UNITS) {
    if (rest.toLowerCase().startsWith(unit + ' ')) {
      const name = rest.slice(unit.length).trim()
      return { quantity, unit, name }
    }
    if (rest.toLowerCase() === unit) {
      return { quantity, unit, name: '' }
    }
  }

  // No unit found — treat as "quantity st name"
  return { quantity, unit: 'st', name: rest }
}
