# Shopping List Quantity & Unit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quantity and unit fields to shopping list items so users know how much to buy, with freetext parsing for fast input.

**Architecture:** Add quantity/unit columns to DB (already done), update TypeScript types and store mapper, create a freetext parser, update the add-item BottomSheet with quantity/unit fields and live parsing, update list display, update recipe→shopping flow, and update bulk wizard to pass quantity/unit to inventory.

**Tech Stack:** React, Zustand, Supabase, Mantine, Vitest

---

### Task 1: Freetext Parser

**Files:**
- Create: `src/lib/parseShoppingInput.ts`
- Create: `src/lib/__tests__/parseShoppingInput.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/__tests__/parseShoppingInput.test.ts
import { describe, it, expect } from 'vitest'
import { parseShoppingInput } from '../parseShoppingInput'

describe('parseShoppingInput', () => {
  it('parses quantity + unit + name', () => {
    expect(parseShoppingInput('2 l mjölk')).toEqual({ quantity: 2, unit: 'l', name: 'mjölk' })
  })

  it('parses quantity + unit + multi-word name', () => {
    expect(parseShoppingInput('500 g nötfärs')).toEqual({ quantity: 500, unit: 'g', name: 'nötfärs' })
  })

  it('parses decimal quantity', () => {
    expect(parseShoppingInput('0.5 kg smör')).toEqual({ quantity: 0.5, unit: 'kg', name: 'smör' })
  })

  it('parses comma decimal', () => {
    expect(parseShoppingInput('1,5 l mjölk')).toEqual({ quantity: 1.5, unit: 'l', name: 'mjölk' })
  })

  it('parses quantity without unit as st', () => {
    expect(parseShoppingInput('12 ägg')).toEqual({ quantity: 12, unit: 'st', name: 'ägg' })
  })

  it('parses name only as 1 st', () => {
    expect(parseShoppingInput('Mjölk')).toEqual({ quantity: 1, unit: 'st', name: 'Mjölk' })
  })

  it('trims whitespace', () => {
    expect(parseShoppingInput('  3 dl grädde  ')).toEqual({ quantity: 3, unit: 'dl', name: 'grädde' })
  })

  it('handles all known units', () => {
    expect(parseShoppingInput('2 msk soja')).toEqual({ quantity: 2, unit: 'msk', name: 'soja' })
    expect(parseShoppingInput('1 förp bacon')).toEqual({ quantity: 1, unit: 'förp', name: 'bacon' })
    expect(parseShoppingInput('3 burk krossade tomater')).toEqual({ quantity: 3, unit: 'burk', name: 'krossade tomater' })
  })

  it('returns empty name as-is', () => {
    expect(parseShoppingInput('')).toEqual({ quantity: 1, unit: 'st', name: '' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/parseShoppingInput.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the parser**

```ts
// src/lib/parseShoppingInput.ts
import { UNITS } from './units'

const ALL_UNITS = UNITS.flatMap((g) => g.items)

export interface ParsedShoppingInput {
  quantity: number
  unit: string
  name: string
}

export function parseShoppingInput(input: string): ParsedShoppingInput {
  const trimmed = input.trim()
  if (!trimmed) return { quantity: 1, unit: 'st', name: '' }

  // Pattern: optional number, optional unit, rest is name
  const match = trimmed.match(/^(\d+[.,]?\d*)\s+(.+)$/)
  if (!match) return { quantity: 1, unit: 'st', name: trimmed }

  const quantity = parseFloat(match[1].replace(',', '.'))
  const rest = match[2]

  // Check if rest starts with a known unit
  for (const unit of ALL_UNITS) {
    if (rest.toLowerCase().startsWith(unit + ' ')) {
      const name = rest.slice(unit.length).trim()
      return { quantity, unit, name }
    }
    if (rest.toLowerCase() === unit) {
      return { quantity, unit, name: '' }
    }
  }

  // No unit found — treat as "quantity st name"
  return { quantity, unit: 'st', name: rest }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/parseShoppingInput.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/parseShoppingInput.ts src/lib/__tests__/parseShoppingInput.test.ts
git commit -m "feat: add freetext parser for shopping input"
```

---

### Task 2: Update ShoppingItem Type and Store

**Files:**
- Modify: `src/types/index.ts:54-62`
- Modify: `src/store/shoppingStore.ts:6-16,51-63`
- Modify: `src/store/__tests__/shoppingStore.test.ts`

- [ ] **Step 1: Update ShoppingItem type**

In `src/types/index.ts`, add `quantity` and `unit` to ShoppingItem:

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

- [ ] **Step 2: Update mapItem in shoppingStore**

In `src/store/shoppingStore.ts`, update `mapItem`:

```ts
function mapItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    quantity: row.quantity as number,
    unit: row.unit as string,
    note: (row.note as string | null) ?? undefined,
    category: (row.category as string | null) ?? undefined,
    isBought: row.is_bought as boolean,
    createdAt: row.created_at as string,
  }
}
```

- [ ] **Step 3: Update addItem signature and insert**

In `src/store/shoppingStore.ts`, change `addItem`:

```ts
addItem: async (name, quantity = 1, unit = 'st', note, category) => {
  const householdId = useHouseholdStore.getState().household?.id
  if (!householdId) throw new Error('Inget hushåll laddat')
  const { data, error } = await supabase
    .from('shopping_list')
    .insert({
      household_id: householdId,
      name,
      quantity,
      unit,
      note: note ?? null,
      category: category ?? null,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  if (data) {
    set((s) => ({ items: [...s.items, mapItem(data as Record<string, unknown>)] }))
  }
},
```

Update the interface:

```ts
addItem: (name: string, quantity?: number, unit?: string, note?: string, category?: string) => Promise<void>
```

- [ ] **Step 4: Update shoppingStore tests**

In `src/store/__tests__/shoppingStore.test.ts`, add `quantity` and `unit` to mock data:

Update `MOCK_ROW_1`:
```ts
const MOCK_ROW_1 = {
  id: 'shop-1',
  household_id: 'hh-1',
  name: 'Mjölk',
  quantity: 2,
  unit: 'l',
  note: null,
  category: null,
  is_bought: false,
  created_at: '2026-03-26T00:00:00Z',
}
```

Update `MOCK_ITEM`:
```ts
const MOCK_ITEM: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
  quantity: 2,
  unit: 'l',
  isBought: false,
  createdAt: '2026-03-26T00:00:00Z',
}
```

Do the same for `MOCK_ROW_2` / `MOCK_ITEM_2` (quantity: 1, unit: 'st').

Update `addItem` test to pass quantity and unit:
```ts
await useShoppingStore.getState().addItem('Ost', 200, 'g')
```

Update the insert assertion to include `quantity: 200, unit: 'g'`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/store/__tests__/shoppingStore.test.ts`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/store/shoppingStore.ts src/store/__tests__/shoppingStore.test.ts
git commit -m "feat: add quantity and unit to ShoppingItem type and store"
```

---

### Task 3: Update Shopping List UI — Add Form

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx:32-65,365-395`

- [ ] **Step 1: Add quantity/unit state and update handleDetailAdd**

In `ShoppingListPage.tsx`, add state for detail quantity and unit:

```ts
const [detailQuantity, setDetailQuantity] = useState<number>(1)
const [detailUnit, setDetailUnit] = useState<string>('st')
```

Update `handleDetailAdd`:

```ts
async function handleDetailAdd() {
  const trimmed = detailName.trim()
  if (!trimmed) return
  await addItem(trimmed, detailQuantity, detailUnit, detailNote.trim() || undefined, detailCategory ?? undefined)
  setDetailName('')
  setDetailQuantity(1)
  setDetailUnit('st')
  setDetailNote('')
  setDetailCategory(null)
  setDetailsOpen(false)
}
```

- [ ] **Step 2: Add live parsing to name field**

Import the parser and add an `onChange` handler:

```ts
import { parseShoppingInput } from '../lib/parseShoppingInput'
```

Add a `handleNameChange` function:

```ts
function handleNameChange(value: string) {
  setDetailName(value)
  const parsed = parseShoppingInput(value)
  if (parsed.name !== value) {
    // Parser found quantity/unit — update fields
    setDetailQuantity(parsed.quantity)
    setDetailUnit(parsed.unit)
  }
}
```

- [ ] **Step 3: Update the BottomSheet form**

Replace the BottomSheet form content with:

```tsx
<Stack>
  <TextInput
    label="Vara"
    placeholder='T.ex. "2 l Mjölk" eller "Mjölk"'
    value={detailName}
    onChange={(e) => handleNameChange(e.currentTarget.value)}
  />
  <Group grow>
    <NumberInput
      label="Antal"
      min={0}
      step={0.5}
      value={detailQuantity}
      onChange={(v) => setDetailQuantity(typeof v === 'number' ? v : 1)}
    />
    <Select
      label="Enhet"
      data={UNITS_FLAT}
      value={detailUnit}
      onChange={(v) => setDetailUnit(v ?? 'st')}
      searchable
      allowDeselect={false}
    />
  </Group>
  <Select
    label="Kategori"
    placeholder="Valfritt"
    data={ITEM_CATEGORIES}
    value={detailCategory}
    onChange={setDetailCategory}
    clearable
    searchable
  />
  <TextInput
    label="Notering"
    placeholder="Valfritt"
    value={detailNote}
    onChange={(e) => setDetailNote(e.currentTarget.value)}
  />
  <Button onClick={handleDetailAdd} disabled={!detailName.trim()} fullWidth>
    Lägg till
  </Button>
</Stack>
```

Add imports at top:

```ts
import { NumberInput, Select } from '@mantine/core'  // ensure these are imported
import { UNITS_FLAT } from '../lib/units'
```

- [ ] **Step 4: Run dev server and test manually**

Verify: open BottomSheet, type "2 l mjölk" → quantity auto-fills to 2, unit to l.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ShoppingListPage.tsx
git commit -m "feat: add quantity/unit fields to shopping add form with live parsing"
```

---

### Task 4: Update Shopping List Display

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx` (pending items display ~line 163-196, bought items display ~line 302-340)

- [ ] **Step 1: Update pending item display**

Change the pending item label from just `{item.name}` to show quantity+unit:

```tsx
<Text
  style={{
    fontFamily: '"Manrope", sans-serif',
    fontSize: 14,
    fontWeight: 500,
    color: '#191d16',
  }}
>
  {item.quantity !== 1 || item.unit !== 'st'
    ? `${item.quantity} ${item.unit} `
    : ''}
  {item.name}
</Text>
```

- [ ] **Step 2: Update bought item display**

Same pattern for bought items — prefix with quantity+unit when not "1 st":

```tsx
<Text
  style={{
    fontFamily: '"Manrope", sans-serif',
    fontSize: 14,
    fontWeight: 500,
    color: '#a8b4a0',
    textDecoration: 'line-through',
  }}
>
  {item.quantity !== 1 || item.unit !== 'st'
    ? `${item.quantity} ${item.unit} `
    : ''}
  {item.name}
</Text>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShoppingListPage.tsx
git commit -m "feat: display quantity and unit in shopping list items"
```

---

### Task 5: Update Recipe → Shopping List Flow

**Files:**
- Modify: `src/pages/RecipesPage.tsx:200-211`

- [ ] **Step 1: Update handleAddMissingToShoppingList**

Change from:
```ts
selected.missing.map((name) => addShoppingItem(name, selected.recipe.name ?? undefined))
```

To — extract the ingredient name without measurement, put recipe measurement in note:

```ts
import { parseShoppingInput } from '../lib/parseShoppingInput'
```

```ts
const handleAddMissingToShoppingList = async () => {
  if (!selected || selected.missing.length === 0) return
  setAddingToList(true)
  try {
    const recipeName = selected.recipe.name ?? ''
    await Promise.all(
      selected.missing.map((ingredient) => {
        const parsed = parseShoppingInput(ingredient)
        const name = parsed.name || ingredient
        const note = parsed.quantity !== 1 || parsed.unit !== 'st'
          ? `${parsed.quantity} ${parsed.unit} — ${recipeName}`
          : recipeName || undefined
        return addShoppingItem(name, 1, 'st', note)
      })
    )
    setAddedToList(true)
  } finally {
    setAddingToList(false)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/RecipesPage.tsx
git commit -m "feat: parse recipe ingredients and store measurement in note"
```

---

### Task 6: Update Bulk Wizard

**Files:**
- Modify: `src/pages/ShoppingListPage.tsx:78-95`

- [ ] **Step 1: Use shopping item quantity/unit in bulk add**

Change `handleBulkAdd` to use the item's own quantity and unit:

```ts
async function handleBulkAdd() {
  setBulkSubmitting(true)
  try {
    for (const item of bought) {
      const loc = bulkLocations[item.id] || locations[0]?.id
      if (!loc) continue
      await addInventoryItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        location: loc,
      })
      await removeItem(item.id)
    }
    setBulkDone(true)
  } finally {
    setBulkSubmitting(false)
  }
}
```

- [ ] **Step 2: Show quantity/unit in wizard item list**

Update the bulk wizard item display to show quantity+unit:

```tsx
<Text
  style={{
    fontFamily: '"Manrope", sans-serif',
    fontSize: 14,
    fontWeight: 600,
    color: '#191d16',
  }}
>
  {item.quantity !== 1 || item.unit !== 'st'
    ? `${item.quantity} ${item.unit} `
    : ''}
  {item.name}
</Text>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ShoppingListPage.tsx
git commit -m "feat: bulk wizard uses shopping item quantity/unit for inventory"
```

---

### Task 7: Update ShoppingListPage Test

**Files:**
- Modify: `src/pages/__tests__/ShoppingListPage.test.tsx`

- [ ] **Step 1: Add quantity/unit to mock data**

```ts
const ITEM_1: ShoppingItem = {
  id: 'shop-1',
  householdId: 'hh-1',
  name: 'Mjölk',
  quantity: 2,
  unit: 'l',
  note: undefined,
  isBought: false,
  createdAt: '2026-03-26T00:00:00Z',
}
const ITEM_2: ShoppingItem = {
  id: 'shop-2',
  householdId: 'hh-1',
  name: 'Bröd',
  quantity: 1,
  unit: 'st',
  note: 'Surdeg',
  isBought: true,
  createdAt: '2026-03-26T00:00:00Z',
}
```

- [ ] **Step 2: Update addItem test**

The "anropar addItem via FAB och BottomSheet" test needs to fill in quantity/unit fields now. Update to assert `addItem` is called with `(name, quantity, unit, note, category)`:

```ts
expect(mockAddItem).toHaveBeenCalledWith('Ägg', 1, 'st', undefined, undefined)
```

- [ ] **Step 3: Add test for quantity display**

```ts
it('visar mängd och enhet för varor', () => {
  render(<ShoppingListPage />)
  expect(screen.getByText(/2 l/)).toBeInTheDocument()
})
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/__tests__/ShoppingListPage.test.tsx
git commit -m "test: update shopping list tests for quantity/unit"
```

---

### Task 8: Create Migration File and Final Verification

**Files:**
- Create: `supabase/migrations/20260328000001_shopping_list_quantity.sql`

- [ ] **Step 1: Write migration file (for reference — already applied)**

```sql
-- Already applied via SQL editor
ALTER TABLE shopping_list ADD COLUMN quantity numeric NOT NULL DEFAULT 1;
ALTER TABLE shopping_list ADD COLUMN unit text NOT NULL DEFAULT 'st';
```

- [ ] **Step 2: Run full test suite**

Run: `npm run build && npm run test && npm run lint && npm run format:check`
Expected: all PASS

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/20260328000001_shopping_list_quantity.sql
git commit -m "chore: add migration file for shopping_list quantity/unit columns"
```

- [ ] **Step 4: Push**

```bash
git push
```
