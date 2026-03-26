const BASE_URL = 'https://world.openfoodfacts.org/api/v0/product'

export interface ProductInfo {
  name: string
  imageUrl?: string
  category?: string
}

interface OFFResponse {
  status: number
  product?: {
    product_name?: string
    image_url?: string
    categories_tags?: string[]
  }
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(barcode)}.json`)
    if (!res.ok) return null
    const data: OFFResponse = await res.json()
    if (data.status !== 1 || !data.product) return null
    const { product_name, image_url, categories_tags } = data.product
    if (!product_name?.trim()) return null
    const category = categories_tags
      ?.find((t) => t.startsWith('en:'))
      ?.replace('en:', '')
      ?.replace(/-/g, ' ')
    return {
      name: product_name.trim(),
      imageUrl: image_url,
      category,
    }
  } catch {
    // Network error or offline
    return null
  }
}
