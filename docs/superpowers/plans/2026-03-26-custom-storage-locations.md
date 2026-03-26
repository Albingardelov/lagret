# Custom Storage Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 3-value location enum with a household-specific `storage_locations` table, letting users add, rename, and delete named locations (e.g. "Hallkylskåp", "Köksfrysen").

**Architecture:** New `storage_locations` table stores per-household locations with a `name`, `icon` type, and `sort_order`. `inventory.location` migrates from a text enum (`'pantry'|'fridge'|'freezer'`) to a UUID FK. A new `locationsStore` provides CRUD. InventoryPage tabs and the Add/Edit modals are driven by this store.

**Tech Stack:** Supabase (PostgreSQL + RLS), Zustand, React, Mantine 8, TypeScript, Vitest

---

## File Map

| Action | File                                                       | Purpose                                                                                              |
| ------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Create | `supabase/migrations/20260326000004_storage_locations.sql` | DB schema + migration                                                                                |
| Modify | `src/types/index.ts`                                       | Rename old union to `LocationIcon`, add `StorageLocation` interface, update `InventoryItem.location` |
| Create | `src/store/locationsStore.ts`                              | Zustand store: fetch/add/update/delete locations                                                     |
| Create | `src/store/__tests__/locationsStore.test.ts`               | Unit tests for locationsStore                                                                        |
| Modify | `src/store/inventoryStore.ts`                              | `getByLocation` signature: `StorageLocation` → `string`                                              |
| Modify | `src/pages/InventoryPage.tsx`                              | Dynamic tabs from locationsStore                                                                     |
| Modify | `src/components/AddItemModal.tsx`                          | Select from locationsStore, prop type update                                                         |
| Modify | `src/components/EditItemModal.tsx`                         | Select from locationsStore                                                                           |
| Modify | `src/pages/HouseholdPage.tsx`                              | Locations management section                                                                         |
| Modify | `src/store/householdStore.ts`                              | Call `fetchLocations()` after household create/join                                                  |

---

## Task 1: SQL migration — run in Supabase dashboard

**⚠️ Run this FIRST before any code changes. Paste into Supabase → SQL Editor → Run.**

- [ ] **Step 1: Run the SQL below in the Supabase SQL Editor**

```sql
-- 1. Create storage_locations table
CREATE TABLE storage_locations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text NOT NULL CHECK (icon IN ('pantry', 'fridge', 'freezer')),
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_locations: member read"
  ON storage_locations FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "storage_locations: member insert"
  ON storage_locations FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "storage_locations: member update"
  ON storage_locations FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "storage_locations: member delete"
  ON storage_locations FOR DELETE
  USING (is_household_member(household_id));

-- 3. Insert default locations for all existing households
INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Skafferi', 'pantry', 0 FROM households;

INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Kylskåp', 'fridge', 1 FROM households;

INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Frys', 'freezer', 2 FROM households;

-- 4. Add new UUID column to inventory
ALTER TABLE inventory ADD COLUMN location_id uuid;

-- 5. Map old 'pantry'/'fridge'/'freezer' strings to new UUIDs
-- (icon column on storage_locations matches the old location string values)
UPDATE inventory i
SET location_id = sl.id
FROM storage_locations sl
WHERE sl.household_id = i.household_id
  AND sl.icon = i.location;

-- 6. Make it NOT NULL and add FK constraint
ALTER TABLE inventory ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE inventory ADD CONSTRAINT inventory_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES storage_locations(id);

-- 7. Drop old column, rename new one
ALTER TABLE inventory DROP COLUMN location;
ALTER TABLE inventory RENAME COLUMN location_id TO location;

-- 8. Recreate index
CREATE INDEX ON inventory (location);
```

- [ ] **Step 2: Verify**

Run in the same SQL editor:

```sql
SELECT * FROM storage_locations LIMIT 10;
SELECT location FROM inventory LIMIT 5;
```

Expected: `storage_locations` has 3 rows per household. `inventory.location` contains UUIDs.

---

## Task 2: Save migration file + update TypeScript types

**Files:**

- Create: `supabase/migrations/20260326000004_storage_locations.sql`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Save migration to file**

Create `supabase/migrations/20260326000004_storage_locations.sql` with the SQL from Task 1.

- [ ] **Step 2: Update `src/types/index.ts`**

Replace the entire file with:

```ts
export type LocationIcon = 'pantry' | 'fridge' | 'freezer'

export interface StorageLocation {
  id: string
  householdId: string
  name: string
  icon: LocationIcon
  sortOrder: number
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  barcode?: string
  quantity: number
  unit: string
  location: string // UUID referencing storage_locations.id
  expiryDate?: string // ISO date string
  imageUrl?: string
  category?: string
  createdAt: string
  updatedAt: string
}

export interface Recipe {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
  strInstructions: string
  strYoutube?: string
  ingredients: { name: string; measure: string }[]
}

export interface Household {
  id: string
  name: string
  inviteCode: string
  createdAt: string
}

export interface ShoppingItem {
  id: string
  householdId: string
  name: string
  note?: string
  isBought: boolean
  createdAt: string
}

export interface MealDBResponse {
  meals: MealDBMeal[] | null
}

export interface MealDBMeal {
  idMeal: string
  strMeal: string
  strMealThumb: string
  strCategory: string
  strArea: string
  strInstructions: string
  strYoutube: string
  [key: string]: string
}
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260326000004_storage_locations.sql src/types/index.ts
git commit -m "feat: add storage_locations migration and update types"
```

---

## Task 3: Create locationsStore (TDD)

**Files:**

- Create: `src/store/locationsStore.ts`
- Create: `src/store/__tests__/locationsStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/store/__tests__/locationsStore.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLocationsStore } from '../locationsStore'

const mockFrom = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockInsert = vi.hoisted(() => vi.fn())
const mockUpdate = vi.hoisted(() => vi.fn())
const mockDelete = vi.hoisted(() => vi.fn())
const mockEq = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockSingle = vi.hoisted(() => vi.fn())

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'hh-1' } }),
  },
}))

const defaultFromImpl = () => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  delete: mockDelete.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  order: mockOrder.mockReturnThis(),
  single: mockSingle,
})

const mockRow = {
  id: 'loc-1',
  household_id: 'hh-1',
  name: 'Kylskåp',
  icon: 'fridge',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  mockFrom.mockImplementation(defaultFromImpl)
  useLocationsStore.setState({ locations: [], loading: false, error: null })
})

describe('fetchLocations', () => {
  it('loads and maps locations from supabase', async () => {
    mockOrder.mockResolvedValue({ data: [mockRow], error: null })
    await useLocationsStore.getState().fetchLocations()
    const { locations } = useLocationsStore.getState()
    expect(locations).toHaveLength(1)
    expect(locations[0]).toEqual({
      id: 'loc-1',
      householdId: 'hh-1',
      name: 'Kylskåp',
      icon: 'fridge',
      sortOrder: 1,
      createdAt: '2026-01-01T00:00:00Z',
    })
  })

  it('sets error on failure', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await useLocationsStore.getState().fetchLocations()
    expect(useLocationsStore.getState().error).toBe('DB error')
  })
})

describe('addLocation', () => {
  it('inserts and appends new location', async () => {
    mockSingle.mockResolvedValue({
      data: { ...mockRow, id: 'loc-2', name: 'Utefrys', icon: 'freezer', sort_order: 2 },
      error: null,
    })
    await useLocationsStore.getState().addLocation('Utefrys', 'freezer')
    expect(useLocationsStore.getState().locations).toHaveLength(1)
    expect(useLocationsStore.getState().locations[0].name).toBe('Utefrys')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })
    await expect(useLocationsStore.getState().addLocation('X', 'pantry')).rejects.toThrow(
      'Insert failed'
    )
  })
})

describe('updateLocation', () => {
  it('updates name and icon in state', async () => {
    useLocationsStore.setState({
      locations: [
        {
          id: 'loc-1',
          householdId: 'hh-1',
          name: 'Kylskåp',
          icon: 'fridge' as const,
          sortOrder: 1,
          createdAt: '',
        },
      ],
    })
    mockSingle.mockResolvedValue({ data: { ...mockRow, name: 'Hallkylskåp' }, error: null })
    await useLocationsStore.getState().updateLocation('loc-1', 'Hallkylskåp', 'fridge')
    expect(useLocationsStore.getState().locations[0].name).toBe('Hallkylskåp')
  })

  it('throws on error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Update failed' } })
    await expect(
      useLocationsStore.getState().updateLocation('loc-1', 'X', 'pantry')
    ).rejects.toThrow('Update failed')
  })
})

describe('deleteLocation', () => {
  it('removes location from state on success', async () => {
    useLocationsStore.setState({
      locations: [
        {
          id: 'loc-1',
          householdId: 'hh-1',
          name: 'Frys',
          icon: 'freezer' as const,
          sortOrder: 2,
          createdAt: '',
        },
      ],
    })
    // First call: count check returns 0 items
    mockEq.mockResolvedValueOnce({ count: 0, error: null })
    // Second call: delete
    mockEq.mockResolvedValueOnce({ error: null })
    await useLocationsStore.getState().deleteLocation('loc-1')
    expect(useLocationsStore.getState().locations).toHaveLength(0)
  })

  it('throws if location has items', async () => {
    mockEq.mockResolvedValueOnce({ count: 3, error: null })
    await expect(useLocationsStore.getState().deleteLocation('loc-1')).rejects.toThrow(
      'Platsen har varor – töm den först'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test -- locationsStore
```

Expected: FAIL — `Cannot find module '../locationsStore'`

- [ ] **Step 3: Create `src/store/locationsStore.ts`**

```ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { StorageLocation, LocationIcon } from '../types'

interface LocationsState {
  locations: StorageLocation[]
  loading: boolean
  error: string | null
  fetchLocations: () => Promise<void>
  addLocation: (name: string, icon: LocationIcon) => Promise<void>
  updateLocation: (id: string, name: string, icon: LocationIcon) => Promise<void>
  deleteLocation: (id: string) => Promise<void>
}

function mapLocation(row: Record<string, unknown>): StorageLocation {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    name: row.name as string,
    icon: row.icon as LocationIcon,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
  }
}

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locations: [],
  loading: false,
  error: null,

  fetchLocations: async () => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('storage_locations')
      .select('*')
      .eq('household_id', householdId)
      .order('sort_order')
    if (error) {
      set({ error: error.message, loading: false })
    } else {
      set({ locations: (data as Record<string, unknown>[]).map(mapLocation), loading: false })
    }
  },

  addLocation: async (name, icon) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll laddat')
    const maxOrder = get().locations.reduce((m, l) => Math.max(m, l.sortOrder), -1)
    const { data, error } = await supabase
      .from('storage_locations')
      .insert({ household_id: householdId, name, icon, sort_order: maxOrder + 1 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    set((s) => ({ locations: [...s.locations, mapLocation(data as Record<string, unknown>)] }))
  },

  updateLocation: async (id, name, icon) => {
    const { data, error } = await supabase
      .from('storage_locations')
      .update({ name, icon })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === id ? mapLocation(data as Record<string, unknown>) : l
      ),
    }))
  },

  deleteLocation: async (id) => {
    const { count, error: countError } = await supabase
      .from('inventory')
      .select('id', { count: 'exact', head: true })
      .eq('location', id)
    if (countError) throw new Error(countError.message)
    if (count && count > 0) throw new Error('Platsen har varor – töm den först')
    const { error } = await supabase.from('storage_locations').delete().eq('id', id)
    if (error) throw new Error(error.message)
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }))
  },
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- locationsStore
```

Expected: all 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/store/locationsStore.ts src/store/__tests__/locationsStore.test.ts
git commit -m "feat: add locationsStore with fetch/add/update/delete"
```

---

## Task 4: Update inventoryStore

**Files:**

- Modify: `src/store/inventoryStore.ts`

The only change needed: `getByLocation` signature uses `string` instead of `StorageLocation` (which no longer refers to the old union type).

- [ ] **Step 1: Update import and function signature in `src/store/inventoryStore.ts`**

Remove `StorageLocation` from the import since `InventoryItem.location` is now `string` and we just compare strings:

```ts
// Change this line:
import type { InventoryItem, StorageLocation } from '../types'
// To:
import type { InventoryItem } from '../types'
```

Update `getByLocation` in the interface:

```ts
// Change:
getByLocation: (location: StorageLocation) => InventoryItem[]
// To:
getByLocation: (location: string) => InventoryItem[]
```

Update `mapItem` — `location` maps directly, no change needed there.

- [ ] **Step 2: Run existing inventoryStore tests**

```bash
npm run test -- inventoryStore
```

Expected: all tests PASS (no behavior change)

- [ ] **Step 3: Commit**

```bash
git add src/store/inventoryStore.ts
git commit -m "fix: update getByLocation signature to string (UUID)"
```

---

## Task 5: Update InventoryPage — dynamic tabs

**Files:**

- Modify: `src/pages/InventoryPage.tsx`

- [ ] **Step 1: Replace the file content**

```tsx
import { useState, useEffect } from 'react'
import { Tabs, Button, Stack, Text, Group, Badge, Loader, Center } from '@mantine/core'
import { IconPlus, IconFridge, IconBox, IconSnowflake } from '@tabler/icons-react'
import { useInventoryStore } from '../store/inventoryStore'
import { useLocationsStore } from '../store/locationsStore'
import { ItemCard } from '../components/ItemCard'
import { AddItemModal } from '../components/AddItemModal'
import { EditItemModal } from '../components/EditItemModal'
import { useErrorNotification } from '../hooks/useErrorNotification'
import { NotificationBanner } from '../components/NotificationBanner'
import type { LocationIcon } from '../types'

const ICON_MAP: Record<LocationIcon, React.ReactNode> = {
  pantry: <IconBox size={16} />,
  fridge: <IconFridge size={16} />,
  freezer: <IconSnowflake size={16} />,
}

export function InventoryPage() {
  const {
    loading,
    error,
    fetchItems,
    deleteItem,
    getByLocation,
    getExpiringSoon,
    subscribeRealtime,
  } = useInventoryStore()
  const { locations, fetchLocations } = useLocationsStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null as import('../types').InventoryItem | null)
  const [activeTab, setActiveTab] = useState<string>('')
  useErrorNotification(error, 'Lagerfel')
  const expiring = getExpiringSoon(3)

  useEffect(() => {
    fetchItems()
    fetchLocations()
    const unsubscribe = subscribeRealtime()
    return unsubscribe
  }, [fetchItems, fetchLocations, subscribeRealtime])

  // Set initial active tab once locations load
  useEffect(() => {
    if (locations.length > 0 && !activeTab) {
      setActiveTab(locations[0].id)
    }
  }, [locations, activeTab])

  return (
    <Stack p="md">
      <NotificationBanner />
      {expiring.length > 0 && (
        <Badge color="orange" size="lg" fullWidth>
          {expiring.length} vara{expiring.length > 1 ? 'r' : ''} går snart ut!
        </Badge>
      )}

      <Group justify="space-between">
        <Text fw={700} size="xl">
          Lagret
        </Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpen(true)}>
          Lägg till
        </Button>
      </Group>

      {loading ? (
        <Center h={200}>
          <Loader />
        </Center>
      ) : (
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v ?? '')}>
          <Tabs.List>
            {locations.map((loc) => (
              <Tabs.Tab key={loc.id} value={loc.id} leftSection={ICON_MAP[loc.icon]}>
                {loc.name}
                <Badge ml={6} size="xs" variant="light">
                  {getByLocation(loc.id).length}
                </Badge>
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {locations.map((loc) => (
            <Tabs.Panel key={loc.id} value={loc.id} pt="md">
              <Stack gap="xs">
                {getByLocation(loc.id).length === 0 ? (
                  <Text c="dimmed" ta="center" py="xl">
                    Tomt här!
                  </Text>
                ) : (
                  getByLocation(loc.id).map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onEdit={setEditItem}
                      onDelete={deleteItem}
                    />
                  ))
                )}
              </Stack>
            </Tabs.Panel>
          ))}
        </Tabs>
      )}

      <AddItemModal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultLocation={activeTab}
      />
      <EditItemModal item={editItem} onClose={() => setEditItem(null)} />
    </Stack>
  )
}
```

- [ ] **Step 2: Build to check types**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/pages/InventoryPage.tsx
git commit -m "feat: dynamic inventory tabs from locationsStore"
```

---

## Task 6: Update AddItemModal — location Select from store

**Files:**

- Modify: `src/components/AddItemModal.tsx`

- [ ] **Step 1: Update imports, prop type, form field, and Select**

Change the import — remove `StorageLocation`, add `useLocationsStore`:

```ts
// Remove from imports:
import type { StorageLocation } from '../types'

// Add import:
import { useLocationsStore } from '../store/locationsStore'
```

Update Props interface:

```ts
interface Props {
  opened: boolean
  onClose: () => void
  defaultBarcode?: string
  defaultLocation?: string // now a UUID string, not LocationIcon
}
```

Add locations to the component body (after the store selectors):

```ts
const locations = useLocationsStore((s) => s.locations)
```

Update form initialValues — `location` is now a UUID string:

```ts
location: defaultLocation ?? (locations[0]?.id ?? ''),
```

Replace the hardcoded `<Select>` with:

```tsx
<Select
  label="Förvaringsplats"
  data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
  {...form.getInputProps('location')}
/>
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/components/AddItemModal.tsx
git commit -m "feat: populate AddItemModal location select from locationsStore"
```

---

## Task 7: Update EditItemModal — location Select from store

**Files:**

- Modify: `src/components/EditItemModal.tsx`

- [ ] **Step 1: Update imports and Select**

Add import:

```ts
import { useLocationsStore } from '../store/locationsStore'
```

Add to component body:

```ts
const locations = useLocationsStore((s) => s.locations)
```

Update form initialValues — `location` starts as empty string:

```ts
location: '',
```

In the `useEffect` that sets form values from item:

```ts
form.setValues({
  name: item.name,
  quantity: item.quantity,
  unit: item.unit,
  location: item.location, // already a UUID string
  expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
  category: item.category ?? '',
})
```

Replace the hardcoded `<Select>` with:

```tsx
<Select
  label="Förvaringsplats"
  data={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
  {...form.getInputProps('location')}
/>
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`

- [ ] **Step 3: Commit**

```bash
git add src/components/EditItemModal.tsx
git commit -m "feat: populate EditItemModal location select from locationsStore"
```

---

## Task 8: Update HouseholdPage — locations management section

**Files:**

- Modify: `src/pages/HouseholdPage.tsx`

- [ ] **Step 1: Read current HouseholdPage to understand existing structure before editing**

Read `src/pages/HouseholdPage.tsx` fully.

- [ ] **Step 2: Replace the file with updated version**

```tsx
import { useState, useEffect } from 'react'
import {
  Stack,
  Text,
  TextInput,
  Button,
  Paper,
  Group,
  Loader,
  Center,
  Divider,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
  Select,
} from '@mantine/core'
import {
  IconCopy,
  IconCheck,
  IconPlus,
  IconDoor,
  IconEdit,
  IconTrash,
  IconFridge,
  IconBox,
  IconSnowflake,
} from '@tabler/icons-react'
import { useHouseholdStore } from '../store/householdStore'
import { useLocationsStore } from '../store/locationsStore'
import { useErrorNotification } from '../hooks/useErrorNotification'
import type { LocationIcon } from '../types'

const ICON_MAP: Record<LocationIcon, React.ReactNode> = {
  pantry: <IconBox size={16} />,
  fridge: <IconFridge size={16} />,
  freezer: <IconSnowflake size={16} />,
}

const ICON_OPTIONS = [
  { value: 'pantry', label: 'Skafferi' },
  { value: 'fridge', label: 'Kylskåp' },
  { value: 'freezer', label: 'Frys' },
]

export function HouseholdPage() {
  const { household, loading, error, fetchHousehold, createHousehold, joinHousehold } =
    useHouseholdStore()
  const { locations, fetchLocations, addLocation, updateLocation, deleteLocation } =
    useLocationsStore()
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [addingLocation, setAddingLocation] = useState(false)
  const [newLocName, setNewLocName] = useState('')
  const [newLocIcon, setNewLocIcon] = useState<LocationIcon>('fridge')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState<LocationIcon>('fridge')
  const [locError, setLocError] = useState<string | null>(null)

  useErrorNotification(error, 'Hushållsfel')

  useEffect(() => {
    fetchHousehold()
  }, [fetchHousehold])

  useEffect(() => {
    if (household) fetchLocations()
  }, [household, fetchLocations])

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return
    setLocError(null)
    try {
      await addLocation(newLocName.trim(), newLocIcon)
      setNewLocName('')
      setNewLocIcon('fridge')
      setAddingLocation(false)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  const handleUpdateLocation = async (id: string) => {
    if (!editName.trim()) return
    setLocError(null)
    try {
      await updateLocation(id, editName.trim(), editIcon)
      setEditingId(null)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    setLocError(null)
    try {
      await deleteLocation(id)
    } catch (e) {
      setLocError(e instanceof Error ? e.message : 'Något gick fel')
    }
  }

  if (loading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    )
  }

  if (!household) {
    return (
      <Stack p="md">
        <Text fw={700} size="xl">
          Hushåll
        </Text>
        <Paper withBorder p="md" radius="md">
          <Stack>
            <Text fw={600}>Skapa ett hushåll</Text>
            <TextInput
              placeholder="Hushållets namn"
              value={householdName}
              onChange={(e) => setHouseholdName(e.currentTarget.value)}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              disabled={!householdName.trim()}
              loading={loading}
              onClick={() => createHousehold(householdName.trim())}
            >
              Skapa
            </Button>
          </Stack>
        </Paper>

        <Divider label="eller" labelPosition="center" />

        <Paper withBorder p="md" radius="md">
          <Stack>
            <Text fw={600}>Gå med i ett hushåll</Text>
            <TextInput
              placeholder="Inbjudningskod (8 tecken)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.currentTarget.value)}
            />
            <Button
              leftSection={<IconDoor size={16} />}
              variant="default"
              disabled={inviteCode.length !== 8}
              loading={loading}
              onClick={() => joinHousehold(inviteCode)}
            >
              Gå med
            </Button>
          </Stack>
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack p="md">
      <Text fw={700} size="xl">
        Hushåll
      </Text>

      <Paper withBorder p="md" radius="md">
        <Stack>
          <Text fw={600}>{household.name}</Text>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              Inbjudningskod:
            </Text>
            <Text size="sm" ff="monospace">
              {household.inviteCode}
            </Text>
            <CopyButton value={household.inviteCode} timeout={2000}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? 'Kopierat!' : 'Kopiera'} withArrow>
                  <ActionIcon variant="subtle" onClick={copy} size="sm">
                    {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Förvaringsplatser</Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setAddingLocation(true)
                setLocError(null)
              }}
            >
              Lägg till
            </Button>
          </Group>

          {locError && (
            <Alert color="red" title="Fel">
              {locError}
            </Alert>
          )}

          {locations.map((loc) => (
            <div key={loc.id}>
              {editingId === loc.id ? (
                <Group>
                  <TextInput
                    value={editName}
                    onChange={(e) => setEditName(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Select
                    data={ICON_OPTIONS}
                    value={editIcon}
                    onChange={(v) => setEditIcon((v as LocationIcon) ?? 'fridge')}
                    w={120}
                  />
                  <Button size="xs" onClick={() => handleUpdateLocation(loc.id)}>
                    Spara
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => setEditingId(null)}
                  >
                    Avbryt
                  </Button>
                </Group>
              ) : (
                <Group justify="space-between">
                  <Group gap="xs">
                    {ICON_MAP[loc.icon]}
                    <Text>{loc.name}</Text>
                  </Group>
                  <Group gap={4}>
                    <ActionIcon
                      variant="subtle"
                      onClick={() => {
                        setEditingId(loc.id)
                        setEditName(loc.name)
                        setEditIcon(loc.icon)
                        setLocError(null)
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDeleteLocation(loc.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              )}
            </div>
          ))}

          {addingLocation && (
            <Group>
              <TextInput
                placeholder="Namn, t.ex. Hallkylskåp"
                value={newLocName}
                onChange={(e) => setNewLocName(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Select
                data={ICON_OPTIONS}
                value={newLocIcon}
                onChange={(v) => setNewLocIcon((v as LocationIcon) ?? 'fridge')}
                w={120}
              />
              <Button size="xs" onClick={handleAddLocation} disabled={!newLocName.trim()}>
                Lägg till
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => {
                  setAddingLocation(false)
                  setNewLocName('')
                }}
              >
                Avbryt
              </Button>
            </Group>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`

- [ ] **Step 4: Commit**

```bash
git add src/pages/HouseholdPage.tsx
git commit -m "feat: add location management to HouseholdPage"
```

---

## Task 9: Update householdStore — fetchLocations after create/join

**Files:**

- Modify: `src/store/householdStore.ts`

After `createHousehold` and `joinHousehold` succeed, call `fetchLocations()` so the inventory tabs populate immediately without a page reload.

- [ ] **Step 1: Add import and calls in `src/store/householdStore.ts`**

Add at the top (after existing imports):

```ts
import { useLocationsStore } from './locationsStore'
```

At the end of `createHousehold`, just before the final `set(...)`:

```ts
await useLocationsStore.getState().fetchLocations()
set({ household: mapHousehold(hh as Record<string, string>), loading: false })
```

At the end of `joinHousehold`, just before the final `set(...)`:

```ts
await useLocationsStore.getState().fetchLocations()
set({ household: mapHousehold(hh as Record<string, string>), loading: false })
```

- [ ] **Step 2: Run all tests**

```bash
npm run test
```

Expected: all tests PASS (householdStore tests mock supabase, so this won't break them — but `useLocationsStore` will be called; it's fine because it's a Zustand store that no-ops without a household)

If householdStore tests fail because `useLocationsStore` isn't mocked, add a mock at the top of `src/store/__tests__/householdStore.test.ts`:

```ts
vi.mock('../locationsStore', () => ({
  useLocationsStore: { getState: () => ({ fetchLocations: vi.fn() }) },
}))
```

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: `✓ built`

- [ ] **Step 4: Commit and push**

```bash
git add src/store/householdStore.ts
git commit -m "feat: fetch locations after household create/join"
git push origin main
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
npm run test
```

Expected: all tests PASS

- [ ] **Step 2: Full build**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built`

- [ ] **Step 3: Smoke test in production after Vercel deploy**

1. Go to Hushåll-sidan → see "Förvaringsplatser" with Skafferi, Kylskåp, Frys
2. Add a new location "Hallkylskåp" with Kylskåp icon → appears in list and as a tab on Lager-sidan
3. Rename "Skafferi" to "Skafferi 2" → tab updates immediately
4. Add a vara to "Hallkylskåp" → appears under that tab
5. Try to delete "Hallkylskåp" → blocked with "Platsen har varor – töm den först"
6. Move/delete the vara, then delete "Hallkylskåp" → succeeds

- [ ] **Step 4: Push if not already done**

```bash
git push origin main
```
