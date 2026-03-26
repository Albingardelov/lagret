# Custom Storage Locations — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Summary

Replace the hardcoded 3-value location enum (`pantry | fridge | freezer`) with a household-specific `storage_locations` table. Each household starts with three default locations (Skafferi, Kylskåp, Frys) and can add, rename, and delete locations freely. Deletion is blocked if the location still has inventory items.

---

## Database

### New table: `storage_locations`

```sql
CREATE TABLE storage_locations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text NOT NULL CHECK (icon IN ('pantry', 'fridge', 'freezer')),
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);
```

- `icon` controls which Tabler icon to show in the tab (IconBox / IconFridge / IconSnowflake)
- `sort_order` controls tab order; default locations get 0, 1, 2

### Change: `inventory.location`

```sql
-- Before
location text NOT NULL CHECK (location IN ('pantry', 'fridge', 'freezer'))

-- After
location uuid NOT NULL REFERENCES storage_locations(id)
```

### RLS

- SELECT: `is_household_member(household_id)`
- INSERT/UPDATE/DELETE: `is_household_member(household_id)`

### Migration strategy

1. Add `storage_locations` table with RLS
2. For each existing household, insert three default rows (Skafferi/pantry, Kylskåp/fridge, Frys/freezer)
3. Add temp column `location_id uuid` on `inventory`
4. Update `inventory.location_id` by joining on household_id + matching old location string
5. Drop old `location` column, rename `location_id` → `location`
6. Add FK constraint

SQL to run manually in Supabase dashboard (no local Supabase).

---

## TypeScript

### Updated types (`src/types/index.ts`)

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

// InventoryItem.location changes from LocationIcon to string (UUID)
export interface InventoryItem {
  // ...
  location: string // UUID referencing storage_locations.id
  // ...
}
```

### New store: `src/store/locationsStore.ts`

```ts
interface LocationsState {
  locations: StorageLocation[]
  loading: boolean
  fetchLocations: () => Promise<void>
  addLocation: (name: string, icon: LocationIcon) => Promise<void>
  updateLocation: (id: string, name: string, icon: LocationIcon) => Promise<void>
  deleteLocation: (id: string) => Promise<void> // throws if items exist
}
```

- `deleteLocation` checks `inventory` count for this location before deleting; throws `"Platsen har varor – töm den först"` if any exist
- `mapLocation(row)` handles snake_case → camelCase (`household_id` → `householdId`, `sort_order` → `sortOrder`, `created_at` → `createdAt`)

### Updated: `inventoryStore`

- `getByLocation(locationId: string)` — already works, just compares strings
- `addItem` / `addItems` — `location` field is now a UUID, no other change needed
- `mapItem` — `location` maps directly (same column name, now stores UUID)

### Updated: `householdStore`

- Call `fetchLocations()` after `createHousehold` succeeds (so tabs appear immediately)

---

## UI

### `src/pages/InventoryPage.tsx`

- Import `useLocationsStore`
- Replace hardcoded `TABS` array with `locations` from store
- `useEffect` calls `fetchLocations()` on mount (alongside `fetchItems`)
- Tab `value` = `location.id` (UUID), `label` = `location.name`, icon based on `location.icon`
- `activeTab` state changes type from `StorageLocation` (old enum) to `string` (UUID)
- Pass `defaultLocation={activeTab}` (UUID) to AddItemModal — already wired up

### `src/components/AddItemModal.tsx` and `src/components/EditItemModal.tsx`

- Select data populated from `useLocationsStore` locations
- `defaultLocation` prop type changes from `StorageLocation` to `string` (UUID)
- Form initial value for `location` = first location id or passed default

### `src/pages/HouseholdPage.tsx`

New "Förvaringsplatser" section below existing household UI:

- List of locations, each showing: icon, name, edit button, delete button
- Edit button opens an inline form or small modal to change name and icon type
- Delete button: disabled with tooltip if location has items; otherwise confirms and deletes
- "Lägg till plats" button opens a small form: name input + icon selector (3 options with labels)

---

## Error handling

- `deleteLocation`: shows Mantine notification or Alert if items exist
- `addLocation` / `updateLocation`: show Alert in modal on error
- `fetchLocations` error: stored in `locationsStore.error`, shown via `useErrorNotification`

---

## Out of scope

- Reordering locations via drag-and-drop (sort_order stays fixed at creation time)
- Moving items between locations in bulk when renaming
- Per-location item count shown in management UI (can be added later)
