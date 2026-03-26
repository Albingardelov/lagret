import { test, expect, setupInventoryMocks, setupShoppingMocks } from './fixtures'

test.beforeEach(async ({ authedPage: page }) => {
  await setupInventoryMocks(page)
  await setupShoppingMocks(page)
})

test('visar lagersidan med befintliga varor', async ({ authedPage: page }) => {
  await page.goto('/')

  await expect(page.getByText('Lagret')).toBeVisible()

  // Pasta is in pantry (default tab)
  await expect(page.getByText('Pasta')).toBeVisible()
})

test('kan lägga till en ny vara', async ({ authedPage: page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: /Lägg till/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel(/Namn/i).fill('Ägg')
  await dialog.getByLabel(/Antal/i).fill('12')

  // Submit button text is "Lägg till" inside the modal form
  await dialog.getByRole('button', { name: /^Lägg till$/i }).click()

  await expect(dialog).not.toBeVisible()
})

test('kan ta bort en vara', async ({ authedPage: page }) => {
  await page.goto('/')

  // Switch to fridge tab to see Mjölk
  await page.getByRole('tab', { name: /Kylskåp/i }).click()

  const deleteButton = page.getByRole('button', { name: /Ta bort Mjölk/i })
  await expect(deleteButton).toBeVisible()
  await deleteButton.click()

  await expect(page.getByText('Mjölk')).not.toBeVisible()
})

test('visar tomt meddelande när lokation saknar varor', async ({ authedPage: page }) => {
  await page.goto('/')

  // Switch to freezer - should be empty
  await page.getByRole('tab', { name: /Frys/i }).click()

  // Scope to the visible tab panel to avoid strict mode violation
  const freezerPanel = page.getByRole('tabpanel', { name: /Frys/i })
  await expect(freezerPanel.getByText('Tomt här!')).toBeVisible()
})
