import { test, expect, setupInventoryMocks, setupShoppingMocks } from './fixtures'

const MOCK_RECIPE_ROW = {
  id: 1,
  url: 'https://example.com/pasta',
  slug: 'pasta-carbonara',
  name: 'Pasta Carbonara',
  description: 'Klassisk italiensk pasta',
  ingredient_groups: [{ name: null, items: ['Pasta', 'Bacon', 'Egg'] }],
  instructions: ['Cook pasta', 'Fry bacon', 'Mix with egg'],
  image_urls: ['https://example.com/pasta.jpg'],
  cook_time: null,
  prep_time: null,
  total_time: '30',
  servings: '4',
}

test.beforeEach(async ({ authedPage: page }) => {
  await setupInventoryMocks(page, [
    {
      id: 'item-2',
      name: 'Pasta',
      quantity: 500,
      unit: 'gram',
      location: 'loc-pantry',
      expiry_date: null,
      expiryDate: null,
      household_id: 'hh-1',
      created_at: new Date().toISOString(),
    },
  ])
  await setupShoppingMocks(page)

  // Mock Supabase recipe endpoints (RPC + REST)
  await page.route('**/rest/v1/rpc/match_recipes_by_ingredients', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Pasta Carbonara', slug: 'pasta-carbonara', image_urls: [], match_count: 1 },
      ]),
    })
  })

  await page.route('**/rest/v1/rpc/search_recipes', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([MOCK_RECIPE_ROW]),
    })
  })

  await page.route('**/rest/v1/recipes**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([MOCK_RECIPE_ROW]),
    })
  })
})

async function loadRecipesPage(page: Parameters<typeof test.fn>[0]['authedPage']) {
  // Visit inventory page first so Zustand store is populated with items
  await page.goto('/')
  await expect(page.getByText('Pasta')).toBeVisible()

  // Navigate via bottom nav (SPA client-side navigation preserves Zustand state)
  await page.getByText('Recept').click()
  await expect(page.getByPlaceholder(/Sök recept/i)).toBeVisible()
}

test('visar receptsidan med sökfält', async ({ authedPage: page }) => {
  await page.goto('/recipes')
  await expect(page.getByPlaceholder(/Sök recept/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /Föreslå recept/i })).toBeVisible()
})

test('kan söka efter recept via sökfält', async ({ authedPage: page }) => {
  await page.goto('/recipes')

  await page.getByPlaceholder(/Sök recept/i).fill('Pasta')
  await page.getByPlaceholder(/Sök recept/i).press('Enter')

  await expect(page.getByText('Pasta Carbonara')).toBeVisible({ timeout: 10000 })
})

test('kan filtrera recept med pills', async ({ authedPage: page }) => {
  await loadRecipesPage(page)

  await page.getByRole('button', { name: /Föreslå recept/i }).click()

  // Wait for filter pills — only visible when matches.length > 0
  await expect(page.getByText('Alla')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Kan laga nu')).toBeVisible()
  await expect(page.getByText('Nästan')).toBeVisible()

  await page.getByText('Kan laga nu').click()
})

test('kan öppna ett receptkort för ingredienslista', async ({ authedPage: page }) => {
  await loadRecipesPage(page)

  await page.getByRole('button', { name: /Föreslå recept/i }).click()

  await expect(page.getByText('Pasta Carbonara')).toBeVisible({ timeout: 10000 })

  // Click on the recipe card to open bottom sheet / modal
  await page.getByText('Pasta Carbonara').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Ingredienser \(\d+\/\d+ hemma\)/)).toBeVisible()
})
