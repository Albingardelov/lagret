import { http, HttpResponse } from 'msw'

// Supabase REST API base – matchar VITE_SUPABASE_URL i tester
const BASE = 'http://localhost:54321/rest/v1'

export const MOCK_ITEMS = [
  {
    id: 'item-1',
    household_id: 'hh-1',
    name: 'Mjölk',
    barcode: null,
    quantity: 1,
    unit: 'l',
    location: 'fridge',
    expiry_date: '2026-04-01',
    category: 'Mejeri',
    image_url: null,
    created_at: '2026-03-26T00:00:00Z',
    updated_at: '2026-03-26T00:00:00Z',
  },
  {
    id: 'item-2',
    household_id: 'hh-1',
    name: 'Pasta',
    barcode: null,
    quantity: 500,
    unit: 'g',
    location: 'pantry',
    expiry_date: null,
    category: 'Torrvaror',
    image_url: null,
    created_at: '2026-03-26T00:00:00Z',
    updated_at: '2026-03-26T00:00:00Z',
  },
]

export const supabaseHandlers = [
  http.get(`${BASE}/inventory`, () => {
    return HttpResponse.json(MOCK_ITEMS)
  }),

  http.post(`${BASE}/inventory`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...body, id: 'new-item-id' }, { status: 201 })
  }),

  http.patch(`${BASE}/inventory`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({ ...MOCK_ITEMS[0], ...body })
  }),

  http.delete(`${BASE}/inventory`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
