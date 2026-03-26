import { describe, it, expect } from 'vitest'
import { lookupBarcode } from '../openFoodFacts'

describe('lookupBarcode', () => {
  it('returnerar produktinfo för känd streckkod', async () => {
    const result = await lookupBarcode('7394376616006')
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Oatly Havredryck')
    expect(result?.imageUrl).toContain('oatly')
    expect(result?.category).toBe('plant based foods')
  })

  it('returnerar null för okänd produkt', async () => {
    const result = await lookupBarcode('0000000000000')
    expect(result).toBeNull()
  })

  it('returnerar null vid nätverksfel', async () => {
    const result = await lookupBarcode('invalid-barcode-causes-no-handler')
    expect(result).toBeNull()
  })
})
