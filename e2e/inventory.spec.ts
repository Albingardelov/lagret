import { test, expect, setupInventoryMocks, setupShoppingMocks } from './fixtures'

test.beforeEach(async ({ authedPage: page }) => {
  await setupInventoryMocks(page)
  await setupShoppingMocks(page)
})

test('visar lagersidan med befintliga varor', async ({ authedPage: page }) => {
  await page.goto('/')

  await expect(page.getByText('Lagret')).toBeVisible()

  // Pasta is in pantry (default tab/pill)
  await expect(page.getByText('Pasta')).toBeVisible()
})

test('kan lägga till en ny vara', async ({ authedPage: page }) => {
  await page.goto('/')

  // Click the Inskanning chip to open the add-item modal
  await page.getByText('Inskanning').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  await dialog.getByLabel(/Namn/i).fill('Ägg')
  await dialog.getByLabel(/Antal/i).fill('12')

  await dialog.getByRole('button', { name: /^Lägg till$/i }).click()

  await expect(dialog).not.toBeVisible()
})

test('kan ta bort en vara', async ({ authedPage: page }) => {
  await page.goto('/')

  // Click Kylskåp pill to see Mjölk
  await page.getByText('Kylskåp').click()

  const deleteButton = page.getByRole('button', { name: /Ta bort Mjölk/i })
  await expect(deleteButton).toBeVisible()
  await deleteButton.click()

  await expect(page.getByText('Mjölk')).not.toBeVisible()
})

test('visar tomt meddelande när lokation saknar varor', async ({ authedPage: page }) => {
  await page.goto('/')

  // Click Frys pill - should be empty
  await page.getByText('Frys').click()

  await expect(page.getByText('Inga varor här ännu')).toBeVisible()
})
