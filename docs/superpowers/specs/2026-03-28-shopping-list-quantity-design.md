# Shopping List Quantity & Unit

## Problem

Shopping list items have no quantity or unit — just a name. This makes it impossible to know how much to buy, and when moving items to inventory the quantity/unit must be guessed. Recipe ingredients are stored as freetext names ("2 msk japansk soja") with no structured data.

## Design

### Database

Add two columns to `shopping_list`:

```sql
ALTER TABLE shopping_list ADD COLUMN quantity numeric NOT NULL DEFAULT 1;
ALTER TABLE shopping_list ADD COLUMN unit text NOT NULL DEFAULT 'st';
```

No data loss — existing rows get quantity=1, unit='st'.

### TypeScript Type

```ts
export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  quantity: number
  unit: string
  note?: string
  category?: string
  isBought: boolean
  createdAt: string
}
```

### Freetext Parser

`src/lib/parseShoppingInput.ts` — parses user input into structured data.

Pattern: `^(\d+[.,]?\d*)\s*(known_unit)?\s*(.+)$`

Examples:
- `"2 l mjölk"` → `{ quantity: 2, unit: 'l', name: 'Mjölk' }`
- `"500 g köttfärs"` → `{ quantity: 500, unit: 'g', name: 'Köttfärs' }`
- `"12 ägg"` → `{ quantity: 12, unit: 'st', name: 'Ägg' }`
- `"Mjölk"` → `{ quantity: 1, unit: 'st', name: 'Mjölk' }`

Known units: all units from `UNITS` in `src/lib/units.ts`.

### UI: Add Item BottomSheet

Fields:
1. **Namn** — freetext with live parsing (typing "2 l mjölk" auto-fills quantity=2, unit=l, name=Mjölk)
2. **Antal** — NumberInput, pre-filled from parse
3. **Enhet** — Select with UNITS_FLAT, pre-filled from parse
4. **Kategori** — optional Select
5. **Notering** — optional TextInput

### UI: Shopping List Display

Each item shows quantity + unit before name: `2 l Mjölk` instead of just `Mjölk`.

### Recipe → Shopping List

Recipe ingredients like "2 msk japansk soja" are added as:
- `name: "Japansk soja"` (just the ingredient name, no measurement)
- `quantity: 1`
- `unit: "st"`
- `note: "2 msk — Receptnamn"` (recipe measurement baked into the note for reference)

This reflects what you actually buy (1 package/bottle) rather than the recipe measurement.

### Bulk Wizard → Inventory

When moving bought items to inventory via the bulk wizard, use the shopping item's `quantity` and `unit` directly instead of guessing defaults.

### Store Changes

- `shoppingStore.mapItem`: map `quantity` and `unit` from snake_case
- `shoppingStore.addItem`: accept and insert `quantity` and `unit`
- `RecipesPage.handleAddMissingToShoppingList`: extract ingredient name, set quantity=1, unit='st', put recipe measurement in note

### Files Changed

- `supabase/migrations/YYYYMMDD_shopping_list_quantity.sql` (already applied)
- `src/types/index.ts` — add fields to ShoppingItem
- `src/lib/parseShoppingInput.ts` — new parser + tests
- `src/store/shoppingStore.ts` — mapItem, addItem updates
- `src/pages/ShoppingListPage.tsx` — add form fields, display quantity/unit, update bulk wizard
- `src/pages/RecipesPage.tsx` — update recipe→shopping flow
