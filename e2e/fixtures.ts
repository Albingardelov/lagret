import { test as base, type Page } from '@playwright/test'

const MOCK_USER = { id: 'e2e-user-id', email: 'e2e@test.com' }

// Valid 3-part JWT (fake but properly formatted so Supabase JS won't reject it)
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiJlMmUtdXNlci1pZCIsImVtYWlsIjoiZTJlQHRlc3QuY29tIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6OTk5OTk5OTk5OX0' +
  '.fakeSignatureForE2ETesting'

const MOCK_SESSION = {
  access_token: MOCK_JWT,
  refresh_token: 'mock-refresh-token',
  expires_at: 9999999999,
  token_type: 'bearer',
  user: MOCK_USER,
}

export const MOCK_INVENTORY = [
  {
    id: 'item-1',
    name: 'Mjölk',
    quantity: 1,
    unit: 'liter',
    location: 'fridge',
    expiry_date: null,
    expiryDate: null,
    household_id: 'hh-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'item-2',
    name: 'Pasta',
    quantity: 500,
    unit: 'gram',
    location: 'pantry',
    expiry_date: null,
    expiryDate: null,
    household_id: 'hh-1',
    created_at: new Date().toISOString(),
  },
]

export async function setupAuthMocks(page: Page) {
  // Inject fake session into localStorage before app scripts run
  const sessionJson = JSON.stringify(MOCK_SESSION)
  await page.addInitScript((session) => {
    const origGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (key: string) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return session
      }
      return origGetItem.call(this, key)
    }
  }, sessionJson)

  // Mock Supabase auth REST endpoints
  await page.route('**/auth/v1/user', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USER),
    })
  })

  await page.route('**/auth/v1/token**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_SESSION),
    })
  })
}

export async function setupInventoryMocks(page: Page, items = MOCK_INVENTORY) {
  let currentItems = [...items]

  await page.route('**/rest/v1/inventory**', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(currentItems),
      })
    } else if (method === 'POST') {
      const body = JSON.parse(route.request().postData() ?? '{}')
      const newItem = {
        id: `item-${Date.now()}`,
        household_id: 'hh-1',
        created_at: new Date().toISOString(),
        expiry_date: null,
        expiryDate: null,
        ...body,
      }
      currentItems = [...currentItems, newItem]
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([newItem]),
      })
    } else if (method === 'PATCH') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else if (method === 'DELETE') {
      const url = route.request().url()
      const idMatch = url.match(/id=eq\.([^&]+)/)
      if (idMatch) {
        currentItems = currentItems.filter((item) => item.id !== idMatch[1])
      }
      route.fulfill({ status: 204, body: '' })
    } else {
      route.continue()
    }
  })

  // Mock households
  await page.route('**/rest/v1/households**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'hh-1', name: 'Testfamiljen', invite_code: 'TEST123' }),
    })
  })

  // Silence realtime WebSocket
  await page.route('**/realtime/v1/**', (route) => {
    route.abort()
  })
}

export async function setupShoppingMocks(page: Page) {
  await page.route('**/rest/v1/shopping_list**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

// Custom fixture extending base test with auth mocks pre-applied
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await setupAuthMocks(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
