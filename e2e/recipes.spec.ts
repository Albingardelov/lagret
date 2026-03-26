import { test, expect, setupInventoryMocks, setupShoppingMocks } from './fixtures'

const MOCK_RECIPES = {
  meals: [
    {
      idMeal: '52772',
      strMeal: 'Pasta Carbonara',
      strMealThumb: 'https://www.themealdb.com/images/media/meals/llcbn01574260722.jpg',
      strCategory: 'Pasta',
      strArea: 'Italian',
      strIngredient1: 'Pasta',
      strIngredient2: 'Bacon',
      strIngredient3: 'Egg',
      strIngredient4: '',
      strMeasure1: '200g',
      strMeasure2: '100g',
      strMeasure3: '2',
      strMeasure4: '',
      strInstructions: 'Cook pasta. Fry bacon. Mix with egg.',
      strYoutube: '',
    },
  ],
}

test.beforeEach(async ({ authedPage: page }) => {
  await setupInventoryMocks(page, [
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
  ])
  await setupShoppingMocks(page)

  // Mock TheMealDB (all endpoints: filter.php, lookup.php, search.php)
  await page.route('https://www.themealdb.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_RECIPES),
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
  await page.getByRole('button', { name: /^Sök$/i }).click()

  await expect(page.getByText('Pasta Carbonara')).toBeVisible({ timeout: 10000 })
})

test('kan filtrera recept med segmented control', async ({ authedPage: page }) => {
  await loadRecipesPage(page)

  // Trigger recipe suggestions (inventory store should be populated)
  await page.getByRole('button', { name: /Föreslå recept/i }).click()

  // Wait for segmented control — only visible when matches.length > 0
  await expect(page.getByText('Alla')).toBeVisible({ timeout: 10000 })
  await expect(page.getByText('Kan laga nu')).toBeVisible()
  await expect(page.getByText('Nästan')).toBeVisible()

  await page.getByText('Kan laga nu').click()
})

test('kan öppna ett receptkort för ingredienslista', async ({ authedPage: page }) => {
  await loadRecipesPage(page)

  await page.getByRole('button', { name: /Föreslå recept/i }).click()

  await expect(page.getByText('Pasta Carbonara')).toBeVisible({ timeout: 10000 })

  // Click on the recipe card to open modal
  await page.getByText('Pasta Carbonara').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/Ingredienser \(\d+\/\d+ hemma\)/)).toBeVisible()
})
