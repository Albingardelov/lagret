import { http, HttpResponse } from 'msw'

const BASE = 'https://world.openfoodfacts.org/api/v0/product'

export const MOCK_PRODUCT = {
  status: 1,
  product: {
    product_name: 'Oatly Havredryck',
    image_url: 'https://images.openfoodfacts.org/oatly.jpg',
    categories_tags: ['en:plant-based-foods', 'en:beverages'],
  },
}

export const offHandlers = [
  http.get(`${BASE}/7394376616006.json`, () => {
    return HttpResponse.json(MOCK_PRODUCT)
  }),

  http.get(`${BASE}/0000000000000.json`, () => {
    return HttpResponse.json({ status: 0, product: null })
  }),

  // Fallback: any other barcode returns 404
  http.get(`${BASE}/:barcode`, () => {
    return new HttpResponse(null, { status: 404 })
  }),
]
