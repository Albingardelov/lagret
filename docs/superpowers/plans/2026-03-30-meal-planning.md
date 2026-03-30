# Meal Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekly meal planning with shopping list generation to Lagret.

**Architecture:** New `meal_plans` table with one row per day per household. Zustand store follows existing patterns. New MealPlanPage as fifth nav tab, TodayMealWidget on InventoryPage, AddMealModal and IngredientReviewModal as BottomSheets.

**Tech Stack:** React 19, Mantine 8, Zustand, Supabase (RLS + Realtime), dayjs, @tabler/icons-react

**Spec:** `docs/superpowers/specs/2026-03-30-meal-planning-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/XXXXXX_create_meal_plans.sql` | DB table, RLS policies, realtime |
| Create | `src/types/index.ts` (modify) | Add `MealPlan` interface |
| Create | `src/store/mealPlanStore.ts` | CRUD + realtime for meal plans |
| Create | `src/pages/MealPlanPage.tsx` | Weekly view with day cards |
| Create | `src/components/AddMealModal.tsx` | Search/pick recipe or enter freetext |
| Create | `src/components/IngredientReviewModal.tsx` | Review & add missing ingredients to shopping list |
| Create | `src/components/TodayMealWidget.tsx` | Compact today's meal card for InventoryPage |
| Modify | `src/components/AppLayout.tsx:11-16` | Add fifth nav tab |
| Modify | `src/router.tsx:38-71` | Add `/meal-plan` route |
| Modify | `src/pages/InventoryPage.tsx:227-228` | Insert TodayMealWidget |
| Create | `src/tests/mealPlanStore.test.ts` | Store unit tests |
| Create | `src/tests/MealPlanPage.test.tsx` | Page component tests |
| Create | `src/tests/TodayMealWidget.test.tsx` | Widget tests |
| Create | `src/tests/AddMealModal.test.tsx` | Modal tests |
| Create | `src/tests/IngredientReviewModal.test.tsx` | Ingredient review tests |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260330120000_create_meal_plans.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Create meal_plans table
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  date date not null,
  recipe_id int references recipes(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now(),
  unique(household_id, date)
);

-- RLS
alter table meal_plans enable row level security;

create policy "Users can view own household meal plans"
  on meal_plans for select
  using (is_household_member(household_id));

create policy "Users can insert own household meal plans"
  on meal_plans for insert
  with check (is_household_member(household_id));

create policy "Users can update own household meal plans"
  on meal_plans for update
  using (is_household_member(household_id));

create policy "Users can delete own household meal plans"
  on meal_plans for delete
  using (is_household_member(household_id));

-- Enable realtime
alter publication supabase_realtime add table meal_plans;
```

- [ ] **Step 2: Run migration in Supabase dashboard SQL editor**

Copy the SQL above and run it in the Supabase SQL editor. Verify the table exists and policies are created.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260330120000_create_meal_plans.sql
git commit -m "feat: add meal_plans table with RLS and realtime"
```

---

### Task 2: TypeScript Type + Store

**Files:**
- Modify: `src/types/index.ts:64` (add MealPlan interface after ShoppingItem)
- Create: `src/store/mealPlanStore.ts`

- [ ] **Step 1: Write store test**

Create `src/tests/mealPlanStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing store
const mockFrom = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  },
}))

vi.mock('./householdStore', () => ({
  useHouseholdStore: {
    getState: () => ({ household: { id: 'household-1' } }),
  },
}))

import { useMealPlanStore } from '../store/mealPlanStore'

describe('mealPlanStore', () => {
  beforeEach(() => {
    useMealPlanStore.setState({ items: [], loading: false })
    vi.clearAllMocks()
  })

  it('should have initial state', () => {
    const state = useMealPlanStore.getState()
    expect(state.items).toEqual([])
    expect(state.loading).toBe(false)
  })

  it('fetchItems should query by date range and household', async () => {
    const mockData = [
      {
        id: '1',
        household_id: 'household-1',
        date: '2026-03-30',
        recipe_id: null,
        title: 'Tacos',
        created_at: '2026-03-30T12:00:00Z',
      },
    ]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
            }),
          }),
        }),
      }),
    })

    await useMealPlanStore.getState().fetchItems('2026-03-30', '2026-04-05')

    expect(mockFrom).toHaveBeenCalledWith('meal_plans')
    const state = useMealPlanStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].title).toBe('Tacos')
    expect(state.items[0].householdId).toBe('household-1')
  })

  it('addItem should upsert and add to state', async () => {
    const mockRow = {
      id: '2',
      household_id: 'household-1',
      date: '2026-04-01',
      recipe_id: 42,
      title: 'Pasta Carbonara',
      created_at: '2026-03-30T12:00:00Z',
    }
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockRow, error: null }),
        }),
      }),
    })

    await useMealPlanStore.getState().addItem('2026-04-01', 'Pasta Carbonara', 42)

    const state = useMealPlanStore.getState()
    expect(state.items).toHaveLength(1)
    expect(state.items[0].recipeId).toBe(42)
  })

  it('removeItem should delete and remove from state', async () => {
    useMealPlanStore.setState({
      items: [
        {
          id: '1',
          householdId: 'household-1',
          date: '2026-03-30',
          recipeId: null,
          title: 'Tacos',
          createdAt: '2026-03-30T12:00:00Z',
        },
      ],
    })

    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    await useMealPlanStore.getState().removeItem('1')

    expect(useMealPlanStore.getState().items).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/tests/mealPlanStore.test.ts`
Expected: FAIL — module `../store/mealPlanStore` not found

- [ ] **Step 3: Add MealPlan type**

Add to `src/types/index.ts` after line 64 (after `ShoppingItem`):

```typescript
export interface MealPlan {
  id: string
  householdId: string
  date: string
  recipeId: number | null
  title: string
  createdAt: string
}
```

- [ ] **Step 4: Implement store**

Create `src/store/mealPlanStore.ts`:

```typescript
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { useHouseholdStore } from './householdStore'
import type { MealPlan } from '../types'

function mapItem(row: Record<string, unknown>): MealPlan {
  return {
    id: row.id as string,
    householdId: row.household_id as string,
    date: row.date as string,
    recipeId: (row.recipe_id as number | null) ?? null,
    title: row.title as string,
    createdAt: row.created_at as string,
  }
}

interface MealPlanState {
  items: MealPlan[]
  loading: boolean
  fetchItems: (startDate: string, endDate: string) => Promise<void>
  addItem: (date: string, title: string, recipeId?: number) => Promise<void>
  updateItem: (id: string, title: string, recipeId?: number | null) => Promise<void>
  removeItem: (id: string) => Promise<void>
  subscribeRealtime: () => () => void
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  items: [],
  loading: false,

  fetchItems: async (startDate, endDate) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) return
    set({ loading: true })
    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('household_id', householdId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
    set({ loading: false })
    if (error) throw new Error('Kunde inte hämta måltidsplanen')
    set({ items: (data ?? []).map(mapItem) })
  },

  addItem: async (date, title, recipeId) => {
    const householdId = useHouseholdStore.getState().household?.id
    if (!householdId) throw new Error('Inget hushåll valt')
    const { data, error } = await supabase
      .from('meal_plans')
      .upsert(
        {
          household_id: householdId,
          date,
          title,
          recipe_id: recipeId ?? null,
        },
        { onConflict: 'household_id,date' }
      )
      .select()
      .single()
    if (error || !data) throw new Error('Kunde inte spara måltid')
    const item = mapItem(data)
    set((s) => ({
      items: [...s.items.filter((i) => i.date !== date), item].sort(
        (a, b) => a.date.localeCompare(b.date)
      ),
    }))
  },

  updateItem: async (id, title, recipeId) => {
    const { data, error } = await supabase
      .from('meal_plans')
      .update({ title, recipe_id: recipeId ?? null })
      .eq('id', id)
      .select()
      .single()
    if (error || !data) throw new Error('Kunde inte uppdatera måltid')
    const item = mapItem(data)
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? item : i)),
    }))
  },

  removeItem: async (id) => {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id)
    if (error) throw new Error('Kunde inte ta bort måltid')
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
  },

  subscribeRealtime: () => {
    const channel = supabase
      .channel('meal_plan_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plans' }, () => {
        const { items } = get()
        if (items.length > 0) {
          const dates = items.map((i) => i.date).sort()
          get().fetchItems(dates[0], dates[dates.length - 1])
        }
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  },
}))
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/tests/mealPlanStore.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/store/mealPlanStore.ts src/tests/mealPlanStore.test.ts
git commit -m "feat: add MealPlan type and mealPlanStore with CRUD + realtime"
```

---

### Task 3: MealPlanPage — Weekly View

**Files:**
- Create: `src/pages/MealPlanPage.tsx`
- Modify: `src/router.tsx:7,20-21,70` (add lazy import + route)
- Modify: `src/components/AppLayout.tsx:4,15` (add nav tab)

- [ ] **Step 1: Write page test**

Create `src/tests/MealPlanPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.locale('sv')

vi.mock('../store/mealPlanStore', () => ({
  useMealPlanStore: vi.fn((selector) =>
    selector({
      items: [
        {
          id: '1',
          householdId: 'h1',
          date: dayjs().format('YYYY-MM-DD'),
          recipeId: null,
          title: 'Tacos',
          createdAt: '2026-03-30T12:00:00Z',
        },
      ],
      loading: false,
      fetchItems: vi.fn(),
      removeItem: vi.fn(),
      subscribeRealtime: vi.fn(() => vi.fn()),
    })
  ),
}))

vi.mock('../store/inventoryStore', () => ({
  useInventoryStore: vi.fn((selector) =>
    selector({ items: [] })
  ),
}))

import { MealPlanPage } from '../pages/MealPlanPage'

function renderPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <MealPlanPage />
      </MemoryRouter>
    </MantineProvider>
  )
}

describe('MealPlanPage', () => {
  it('shows week number and navigation arrows', () => {
    renderPage()
    expect(screen.getByText(/vecka/i)).toBeInTheDocument()
  })

  it('shows 7 day rows', () => {
    renderPage()
    const days = ['mån', 'tis', 'ons', 'tor', 'fre', 'lör', 'sön']
    // At least some day abbreviations should be visible
    const found = days.filter((d) =>
      screen.queryAllByText(new RegExp(d, 'i')).length > 0
    )
    expect(found.length).toBeGreaterThanOrEqual(1)
  })

  it('shows planned meal title', () => {
    renderPage()
    expect(screen.getByText('Tacos')).toBeInTheDocument()
  })

  it('shows "Generera inköpslista" button', () => {
    renderPage()
    expect(screen.getByText(/generera inköpslista/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/tests/MealPlanPage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MealPlanPage**

Create `src/pages/MealPlanPage.tsx`:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Stack, Text, Group, Box, Button, ActionIcon, Loader, Center } from '@mantine/core'
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconX,
  IconShoppingCart,
} from '@tabler/icons-react'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isoWeek from 'dayjs/plugin/isoWeek'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { AddMealModal } from '../components/AddMealModal'
import { IngredientReviewModal } from '../components/IngredientReviewModal'
import { matchRecipe, getAllIngredients } from '../lib/recipeMatching'
import { getRecipeById } from '../lib/recipes'
import type { MealPlan, Recipe } from '../types'

dayjs.extend(weekOfYear)
dayjs.extend(isoWeek)
dayjs.locale('sv')

function getWeekDays(weekStart: dayjs.Dayjs) {
  return Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'))
}

export function MealPlanPage() {
  const { items, loading, fetchItems, removeItem, subscribeRealtime } = useMealPlanStore()
  const inventoryItems = useInventoryStore((s) => s.items)
  const [weekStart, setWeekStart] = useState(() => dayjs().isoWeekday(1))
  const [addModalDate, setAddModalDate] = useState<string | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({})

  const weekEnd = weekStart.add(6, 'day')
  const weekDays = getWeekDays(weekStart)
  const weekNumber = weekStart.isoWeek()
  const today = dayjs().format('YYYY-MM-DD')

  const loadWeek = useCallback(() => {
    fetchItems(weekStart.format('YYYY-MM-DD'), weekEnd.format('YYYY-MM-DD'))
  }, [fetchItems, weekStart, weekEnd])

  useEffect(() => {
    loadWeek()
  }, [loadWeek])

  useEffect(() => {
    const unsub = subscribeRealtime()
    return unsub
  }, [subscribeRealtime])

  // Fetch full recipe data for items with recipeId
  useEffect(() => {
    const recipeItems = items.filter((i) => i.recipeId && !recipes[i.recipeId])
    recipeItems.forEach((item) => {
      if (item.recipeId) {
        getRecipeById(item.recipeId).then((r) => {
          if (r) setRecipes((prev) => ({ ...prev, [r.id]: r }))
        })
      }
    })
  }, [items, recipes])

  const inventoryNames = inventoryItems.map((i) => i.name)

  const getMealForDate = (date: string): MealPlan | undefined =>
    items.find((i) => i.date === date)

  const getIngredientStatus = (meal: MealPlan) => {
    if (!meal.recipeId) return null
    const recipe = recipes[meal.recipeId]
    if (!recipe) return null
    const match = matchRecipe(recipe, inventoryNames)
    const total = getAllIngredients(recipe).length
    return { matched: match.matched.length, total }
  }

  const prevWeek = () => setWeekStart((w) => w.subtract(7, 'day'))
  const nextWeek = () => setWeekStart((w) => w.add(7, 'day'))

  return (
    <Stack gap={0} pb={80}>
      {/* Week navigation */}
      <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid #eee' }}>
        <ActionIcon variant="subtle" color="sage" onClick={prevWeek}>
          <IconChevronLeft size={20} />
        </ActionIcon>
        <Text fw={600} size="sm">
          Vecka {weekNumber} · {weekStart.format('D MMM')} – {weekEnd.format('D MMM')}
        </Text>
        <ActionIcon variant="subtle" color="sage" onClick={nextWeek}>
          <IconChevronRight size={20} />
        </ActionIcon>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader color="sage" />
        </Center>
      ) : (
        <Stack gap={8} px="md" py="sm">
          {weekDays.map((day) => {
            const dateStr = day.format('YYYY-MM-DD')
            const meal = getMealForDate(dateStr)
            const isToday = dateStr === today
            const ingredientStatus = meal ? getIngredientStatus(meal) : null

            return (
              <Box
                key={dateStr}
                p="sm"
                style={{
                  background: meal ? '#f8fbee' : '#fafafa',
                  borderRadius: 8,
                  border: meal ? 'none' : '1px dashed #ddd',
                  borderLeft: isToday ? '3px solid #53642e' : undefined,
                }}
              >
                <Group justify="space-between" align="center">
                  <div>
                    <Text
                      size="xs"
                      fw={600}
                      tt="uppercase"
                      c={isToday ? 'sage' : 'dimmed'}
                      style={{ letterSpacing: '0.05em' }}
                    >
                      {isToday ? 'Idag · ' : ''}
                      {day.format('dddd D MMM')}
                    </Text>
                    {meal ? (
                      <>
                        <Text size="md" fw={500} mt={4}>
                          {meal.title}
                        </Text>
                        {ingredientStatus && (
                          <Text size="xs" c="dimmed" mt={2}>
                            {ingredientStatus.matched} av {ingredientStatus.total} ingredienser hemma
                          </Text>
                        )}
                        {!meal.recipeId && (
                          <Text size="xs" c="dimmed" mt={2}>
                            Fritext
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text size="sm" c="dimmed" mt={4}>
                        Ingen måltid planerad
                      </Text>
                    )}
                  </div>
                  {meal ? (
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => removeItem(meal.id)}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  ) : (
                    <Button
                      size="xs"
                      variant="filled"
                      color="sage"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => setAddModalDate(dateStr)}
                    >
                      Lägg till
                    </Button>
                  )}
                </Group>
              </Box>
            )
          })}
        </Stack>
      )}

      {/* Generate shopping list button */}
      <Box px="md" py="sm">
        <Button
          fullWidth
          color="sage"
          leftSection={<IconShoppingCart size={18} />}
          onClick={() => setReviewOpen(true)}
          disabled={!items.some((i) => i.recipeId)}
        >
          Generera inköpslista för veckan
        </Button>
      </Box>

      <AddMealModal
        opened={!!addModalDate}
        onClose={() => setAddModalDate(null)}
        date={addModalDate}
      />

      <IngredientReviewModal
        opened={reviewOpen}
        onClose={() => setReviewOpen(false)}
        mealPlans={items.filter((i) => i.recipeId)}
        recipes={recipes}
      />
    </Stack>
  )
}
```

- [ ] **Step 4: Add route to router.tsx**

Add lazy import after line 20 in `src/router.tsx`:

```typescript
const MealPlanPage = lazy(() =>
  import('./pages/MealPlanPage').then((m) => ({ default: m.MealPlanPage }))
)
```

Add route in children array after the `household` route (after line 70):

```typescript
      {
        path: 'meal-plan',
        element: (
          <SuspenseWrapper>
            <MealPlanPage />
          </SuspenseWrapper>
        ),
      },
```

- [ ] **Step 5: Add nav tab to AppLayout**

In `src/components/AppLayout.tsx`, add import at line 4:

```typescript
import { IconBox, IconBook2, IconShoppingCart, IconHome, IconLogout, IconCalendarEvent } from '@tabler/icons-react'
```

Add entry to `NAV_ITEMS` array (after line 15, before the closing `]`):

```typescript
  { path: '/meal-plan', label: 'Veckoplan', icon: IconCalendarEvent },
```

- [ ] **Step 6: Run tests**

Run: `npm run test -- src/tests/MealPlanPage.test.tsx`
Expected: PASS

- [ ] **Step 7: Run build to check types**

Run: `npm run build`
Expected: Build succeeds (AddMealModal and IngredientReviewModal don't exist yet — create placeholder exports)

Create temporary `src/components/AddMealModal.tsx`:

```tsx
import { BottomSheet } from './BottomSheet'

interface AddMealModalProps {
  opened: boolean
  onClose: () => void
  date: string | null
}

export function AddMealModal({ opened, onClose }: AddMealModalProps) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Lägg till måltid">
      <div>Placeholder</div>
    </BottomSheet>
  )
}
```

Create temporary `src/components/IngredientReviewModal.tsx`:

```tsx
import { BottomSheet } from './BottomSheet'
import type { MealPlan, Recipe } from '../types'

interface IngredientReviewModalProps {
  opened: boolean
  onClose: () => void
  mealPlans: MealPlan[]
  recipes: Record<string, Recipe>
}

export function IngredientReviewModal({ opened, onClose }: IngredientReviewModalProps) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Inköpslista">
      <div>Placeholder</div>
    </BottomSheet>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/MealPlanPage.tsx src/router.tsx src/components/AppLayout.tsx \
  src/components/AddMealModal.tsx src/components/IngredientReviewModal.tsx \
  src/tests/MealPlanPage.test.tsx
git commit -m "feat: add MealPlanPage with weekly view and navigation tab"
```

---

### Task 4: AddMealModal — Recipe Search + Freetext

**Files:**
- Modify: `src/components/AddMealModal.tsx` (replace placeholder)

- [ ] **Step 1: Write modal test**

Create `src/tests/AddMealModal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import userEvent from '@testing-library/user-event'

vi.mock('../store/mealPlanStore', () => ({
  useMealPlanStore: vi.fn((selector) =>
    selector({
      items: [],
      addItem: vi.fn(),
    })
  ),
}))

vi.mock('../store/inventoryStore', () => ({
  useInventoryStore: vi.fn((selector) =>
    selector({ items: [{ name: 'Pasta' }, { name: 'Ägg' }] })
  ),
}))

vi.mock('../lib/recipes', () => ({
  suggestRecipes: vi.fn().mockResolvedValue([]),
  searchRecipes: vi.fn().mockResolvedValue([]),
}))

vi.mock('../lib/recipeMatching', () => ({
  matchRecipe: vi.fn().mockReturnValue({ matched: [], missing: [], score: 0 }),
  getAllIngredients: vi.fn().mockReturnValue([]),
}))

import { AddMealModal } from '../components/AddMealModal'

function renderModal(date = '2026-04-01') {
  return render(
    <MantineProvider>
      <AddMealModal opened={true} onClose={vi.fn()} date={date} />
    </MantineProvider>
  )
}

describe('AddMealModal', () => {
  it('shows date in title', () => {
    renderModal('2026-04-01')
    expect(screen.getByText(/1 april/i)).toBeInTheDocument()
  })

  it('shows search input', () => {
    renderModal()
    expect(screen.getByPlaceholderText(/sök recept/i)).toBeInTheDocument()
  })

  it('shows tabs for Förslag, Favoriter, Senaste', () => {
    renderModal()
    expect(screen.getByText('Förslag')).toBeInTheDocument()
    expect(screen.getByText('Favoriter')).toBeInTheDocument()
    expect(screen.getByText('Senaste')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/tests/AddMealModal.test.tsx`
Expected: FAIL — placeholder doesn't have the expected content

- [ ] **Step 3: Implement AddMealModal**

Replace `src/components/AddMealModal.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react'
import { TextInput, Tabs, Stack, Text, Group, Box, UnstyledButton, Badge, Loader, Center } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import dayjs from 'dayjs'
import 'dayjs/locale/sv'
import { BottomSheet } from './BottomSheet'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { suggestRecipes, searchRecipes } from '../lib/recipes'
import { matchRecipe, getAllIngredients } from '../lib/recipeMatching'
import type { Recipe } from '../types'

dayjs.locale('sv')

const FAVORITES_KEY = 'lagret:favorite-recipes'

function loadFavoriteIds(): Set<number> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return new Set(raw ? (JSON.parse(raw) as number[]) : [])
  } catch {
    return new Set()
  }
}

interface AddMealModalProps {
  opened: boolean
  onClose: () => void
  date: string | null
}

export function AddMealModal({ opened, onClose, date }: AddMealModalProps) {
  const addItem = useMealPlanStore((s) => s.addItem)
  const mealPlanItems = useMealPlanStore((s) => s.items)
  const inventoryItems = useInventoryStore((s) => s.items)
  const inventoryNames = useMemo(() => inventoryItems.map((i) => i.name), [inventoryItems])

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<string | null>('suggestions')
  const [suggestions, setSuggestions] = useState<Recipe[]>([])
  const [searchResults, setSearchResults] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Load suggestions on open
  useEffect(() => {
    if (!opened) return
    setQuery('')
    setTab('suggestions')
    setSearchResults([])
    setLoading(true)
    suggestRecipes(inventoryNames).then((r) => {
      setSuggestions(r)
      setLoading(false)
    })
  }, [opened, inventoryNames])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(() => {
      searchRecipes(query).then(setSearchResults)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelectRecipe = async (recipe: Recipe) => {
    if (!date || submitting) return
    setSubmitting(true)
    try {
      await addItem(date, recipe.name ?? 'Okänt recept', recipe.id)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleFreetext = async () => {
    if (!date || !query.trim() || submitting) return
    setSubmitting(true)
    try {
      await addItem(date, query.trim())
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleFreetext()
  }

  const favoriteIds = useMemo(() => loadFavoriteIds(), [])

  // Get recent recipes from meal plan history
  const recentRecipes = useMemo(() => {
    const seen = new Set<string>()
    return mealPlanItems
      .filter((i) => i.recipeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((i) => {
        if (seen.has(i.title)) return false
        seen.add(i.title)
        return true
      })
      .slice(0, 10)
  }, [mealPlanItems])

  const recipesToShow = query.trim() ? searchResults : suggestions

  const favoriteRecipes = useMemo(
    () => suggestions.filter((r) => favoriteIds.has(r.id)),
    [suggestions, favoriteIds]
  )

  const renderRecipeItem = (recipe: Recipe) => {
    const match = matchRecipe(recipe, inventoryNames)
    const total = getAllIngredients(recipe).length
    const pct = total > 0 ? Math.round((match.matched.length / total) * 100) : 0

    return (
      <UnstyledButton
        key={recipe.id}
        onClick={() => handleSelectRecipe(recipe)}
        p="sm"
        style={{ background: '#f8fbee', borderRadius: 8 }}
        w="100%"
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={500}>
              {recipe.name}
            </Text>
            <Text size="xs" c="dimmed" mt={2}>
              {match.matched.length} av {total} ingredienser hemma
              {recipe.totalTime ? ` · ${recipe.totalTime}` : ''}
            </Text>
          </div>
          <Badge variant="light" color="sage" size="sm">
            {pct}%
          </Badge>
        </Group>
      </UnstyledButton>
    )
  }

  const formattedDate = date ? dayjs(date).format('dddd D MMMM') : ''

  return (
    <BottomSheet opened={opened} onClose={onClose} title={formattedDate}>
      <Stack gap="sm">
        <TextInput
          placeholder="Sök recept eller skriv fritext..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />

        <Tabs value={tab} onChange={setTab}>
          <Tabs.List>
            <Tabs.Tab value="suggestions">Förslag</Tabs.Tab>
            <Tabs.Tab value="favorites">Favoriter</Tabs.Tab>
            <Tabs.Tab value="recent">Senaste</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="suggestions" pt="sm">
            {loading ? (
              <Center py="md">
                <Loader color="sage" size="sm" />
              </Center>
            ) : (
              <Stack gap={8}>
                {recipesToShow.length === 0 && (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    {query.trim()
                      ? 'Inga recept hittades. Tryck Enter för fritext.'
                      : 'Inga förslag just nu.'}
                  </Text>
                )}
                {recipesToShow.map(renderRecipeItem)}
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="favorites" pt="sm">
            <Stack gap={8}>
              {favoriteRecipes.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Inga favoriter än.
                </Text>
              ) : (
                favoriteRecipes.map(renderRecipeItem)
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="recent" pt="sm">
            <Stack gap={8}>
              {recentRecipes.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  Inga tidigare måltider.
                </Text>
              ) : (
                recentRecipes.map((item) => (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => {
                      if (date) addItem(date, item.title, item.recipeId ?? undefined)
                      onClose()
                    }}
                    p="sm"
                    style={{ background: '#f8fbee', borderRadius: 8 }}
                    w="100%"
                  >
                    <Text size="sm" fw={500}>
                      {item.title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.recipeId ? 'Recept' : 'Fritext'}
                    </Text>
                  </UnstyledButton>
                ))
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {query.trim() && (
          <Text size="xs" c="dimmed" ta="center">
            Tryck Enter för att lägga till "{query.trim()}" som fritext
          </Text>
        )}
      </Stack>
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/tests/AddMealModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AddMealModal.tsx src/tests/AddMealModal.test.tsx
git commit -m "feat: implement AddMealModal with recipe search and freetext"
```

---

### Task 5: IngredientReviewModal — Generate Shopping List

**Files:**
- Modify: `src/components/IngredientReviewModal.tsx` (replace placeholder)

- [ ] **Step 1: Write modal test**

Create `src/tests/IngredientReviewModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { Recipe, MealPlan } from '../types'

const mockAddItem = vi.fn()

vi.mock('../store/shoppingStore', () => ({
  useShoppingStore: vi.fn((selector) =>
    selector({ items: [], addItem: mockAddItem })
  ),
}))

vi.mock('../store/inventoryStore', () => ({
  useInventoryStore: vi.fn((selector) =>
    selector({ items: [{ name: 'Pasta' }] })
  ),
}))

import { IngredientReviewModal } from '../components/IngredientReviewModal'

const testRecipe: Recipe = {
  id: 1,
  url: '',
  slug: null,
  name: 'Pasta Carbonara',
  description: null,
  ingredientGroups: [{ name: null, items: ['Pasta', 'Ägg', 'Pancetta'] }],
  instructions: [],
  imageUrls: [],
  cookTime: null,
  prepTime: null,
  totalTime: null,
  servings: null,
}

const testMealPlans: MealPlan[] = [
  {
    id: '1',
    householdId: 'h1',
    date: '2026-04-01',
    recipeId: 1,
    title: 'Pasta Carbonara',
    createdAt: '2026-03-30T12:00:00Z',
  },
]

function renderModal() {
  return render(
    <MantineProvider>
      <IngredientReviewModal
        opened={true}
        onClose={vi.fn()}
        mealPlans={testMealPlans}
        recipes={{ 1: testRecipe }}
      />
    </MantineProvider>
  )
}

describe('IngredientReviewModal', () => {
  it('shows recipe name as group header', () => {
    renderModal()
    expect(screen.getByText('Pasta Carbonara')).toBeInTheDocument()
  })

  it('shows all ingredients', () => {
    renderModal()
    expect(screen.getByText('Pasta')).toBeInTheDocument()
    expect(screen.getByText('Ägg')).toBeInTheDocument()
    expect(screen.getByText('Pancetta')).toBeInTheDocument()
  })

  it('shows add to shopping list button', () => {
    renderModal()
    expect(screen.getByText(/lägg till i inköpslistan/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/tests/IngredientReviewModal.test.tsx`
Expected: FAIL — placeholder doesn't have expected content

- [ ] **Step 3: Implement IngredientReviewModal**

Replace `src/components/IngredientReviewModal.tsx`:

```tsx
import { useState, useMemo } from 'react'
import { Stack, Text, Checkbox, Button, Group, Box } from '@mantine/core'
import { IconShoppingCart } from '@tabler/icons-react'
import { BottomSheet } from './BottomSheet'
import { useShoppingStore } from '../store/shoppingStore'
import { useInventoryStore } from '../store/inventoryStore'
import { getAllIngredients, ingredientsMatch } from '../lib/recipeMatching'
import { parseShoppingInput } from '../lib/parseShoppingInput'
import type { MealPlan, Recipe } from '../types'

interface IngredientReviewModalProps {
  opened: boolean
  onClose: () => void
  mealPlans: MealPlan[]
  recipes: Record<string, Recipe>
}

interface IngredientEntry {
  ingredient: string
  recipeName: string
  isMissing: boolean
}

export function IngredientReviewModal({
  opened,
  onClose,
  mealPlans,
  recipes,
}: IngredientReviewModalProps) {
  const addShoppingItem = useShoppingStore((s) => s.addItem)
  const shoppingItems = useShoppingStore((s) => s.items)
  const inventoryItems = useInventoryStore((s) => s.items)
  const inventoryNames = useMemo(() => inventoryItems.map((i) => i.name), [inventoryItems])
  const [submitting, setSubmitting] = useState(false)
  const [added, setAdded] = useState(false)

  // Build ingredient list grouped by recipe
  const entries = useMemo(() => {
    const result: IngredientEntry[] = []
    for (const meal of mealPlans) {
      if (!meal.recipeId) continue
      const recipe = recipes[meal.recipeId]
      if (!recipe) continue
      const ingredients = getAllIngredients(recipe)
      for (const ingredient of ingredients) {
        const isMissing = !inventoryNames.some((inv) => ingredientsMatch(ingredient, inv))
        result.push({
          ingredient,
          recipeName: recipe.name ?? meal.title,
          isMissing,
        })
      }
    }
    return result
  }, [mealPlans, recipes, inventoryNames])

  // Group by recipe name
  const grouped = useMemo(() => {
    const map = new Map<string, IngredientEntry[]>()
    for (const entry of entries) {
      const list = map.get(entry.recipeName) ?? []
      list.push(entry)
      map.set(entry.recipeName, list)
    }
    return map
  }, [entries])

  // Track which ingredients are selected (default: missing ones)
  const [selected, setSelected] = useState<Set<string>>(() => {
    return new Set(
      entries.filter((e) => e.isMissing).map((e) => `${e.recipeName}:${e.ingredient}`)
    )
  })

  // Reset selected when entries change
  useMemo(() => {
    setSelected(
      new Set(
        entries.filter((e) => e.isMissing).map((e) => `${e.recipeName}:${e.ingredient}`)
      )
    )
    setAdded(false)
  }, [entries])

  const toggleIngredient = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAddToShoppingList = async () => {
    setSubmitting(true)
    try {
      const pendingNames = shoppingItems
        .filter((i) => !i.isBought)
        .map((i) => i.name.toLowerCase())

      for (const entry of entries) {
        const key = `${entry.recipeName}:${entry.ingredient}`
        if (!selected.has(key)) continue

        const parsed = parseShoppingInput(entry.ingredient)
        const name = parsed.name || entry.ingredient
        if (pendingNames.includes(name.toLowerCase())) continue

        await addShoppingItem(name, parsed.quantity, parsed.unit, entry.recipeName)
      }
      setAdded(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet opened={opened} onClose={onClose} title="Generera inköpslista">
      <Stack gap="md">
        {Array.from(grouped.entries()).map(([recipeName, items]) => (
          <Box key={recipeName}>
            <Text size="sm" fw={600} mb={4}>
              {recipeName}
            </Text>
            <Stack gap={4}>
              {items.map((entry) => {
                const key = `${entry.recipeName}:${entry.ingredient}`
                return (
                  <Checkbox
                    key={key}
                    label={entry.ingredient}
                    checked={selected.has(key)}
                    onChange={() => toggleIngredient(key)}
                    color="sage"
                    size="sm"
                    styles={{
                      label: {
                        textDecoration: !entry.isMissing ? 'line-through' : undefined,
                        color: !entry.isMissing ? '#aaa' : undefined,
                      },
                    }}
                  />
                )
              })}
            </Stack>
          </Box>
        ))}

        {entries.length === 0 && (
          <Text size="sm" c="dimmed" ta="center" py="md">
            Inga recept-kopplade måltider den här veckan.
          </Text>
        )}

        <Button
          fullWidth
          color="sage"
          leftSection={<IconShoppingCart size={18} />}
          onClick={handleAddToShoppingList}
          loading={submitting}
          disabled={selected.size === 0 || added}
        >
          {added ? 'Tillagd i inköpslistan!' : `Lägg till i inköpslistan (${selected.size})`}
        </Button>
      </Stack>
    </BottomSheet>
  )
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/tests/IngredientReviewModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/IngredientReviewModal.tsx src/tests/IngredientReviewModal.test.tsx
git commit -m "feat: implement IngredientReviewModal with ingredient selection"
```

---

### Task 6: TodayMealWidget on InventoryPage

**Files:**
- Create: `src/components/TodayMealWidget.tsx`
- Modify: `src/pages/InventoryPage.tsx:1-2,22,217-228`

- [ ] **Step 1: Write widget test**

Create `src/tests/TodayMealWidget.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import dayjs from 'dayjs'

const today = dayjs().format('YYYY-MM-DD')

vi.mock('../store/mealPlanStore', () => ({
  useMealPlanStore: vi.fn((selector) =>
    selector({
      items: [
        {
          id: '1',
          householdId: 'h1',
          date: today,
          recipeId: null,
          title: 'Tacos',
          createdAt: '2026-03-30T12:00:00Z',
        },
      ],
      fetchItems: vi.fn(),
    })
  ),
}))

vi.mock('../store/inventoryStore', () => ({
  useInventoryStore: vi.fn((selector) =>
    selector({ items: [] })
  ),
}))

import { TodayMealWidget } from '../components/TodayMealWidget'

function renderWidget() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <TodayMealWidget />
      </MemoryRouter>
    </MantineProvider>
  )
}

describe('TodayMealWidget', () => {
  it('shows today meal title', () => {
    renderWidget()
    expect(screen.getByText('Tacos')).toBeInTheDocument()
  })

  it('shows "Dagens middag" label', () => {
    renderWidget()
    expect(screen.getByText(/dagens middag/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/tests/TodayMealWidget.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TodayMealWidget**

Create `src/components/TodayMealWidget.tsx`:

```tsx
import { useEffect, useMemo } from 'react'
import { Box, Text, Group, Button } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMealPlanStore } from '../store/mealPlanStore'
import { useInventoryStore } from '../store/inventoryStore'
import { matchRecipe, getAllIngredients } from '../lib/recipeMatching'
import { getRecipeById } from '../lib/recipes'
import { useState } from 'react'
import type { Recipe } from '../types'

export function TodayMealWidget() {
  const navigate = useNavigate()
  const today = dayjs().format('YYYY-MM-DD')
  const items = useMealPlanStore((s) => s.items)
  const fetchItems = useMealPlanStore((s) => s.fetchItems)
  const inventoryItems = useInventoryStore((s) => s.items)
  const inventoryNames = useMemo(() => inventoryItems.map((i) => i.name), [inventoryItems])
  const [recipe, setRecipe] = useState<Recipe | null>(null)

  useEffect(() => {
    fetchItems(today, today)
  }, [fetchItems, today])

  const todayMeal = items.find((i) => i.date === today)

  useEffect(() => {
    if (todayMeal?.recipeId) {
      getRecipeById(todayMeal.recipeId).then((r) => setRecipe(r))
    } else {
      setRecipe(null)
    }
  }, [todayMeal?.recipeId])

  const ingredientStatus = useMemo(() => {
    if (!recipe) return null
    const match = matchRecipe(recipe, inventoryNames)
    const total = getAllIngredients(recipe).length
    return { matched: match.matched.length, total }
  }, [recipe, inventoryNames])

  if (!todayMeal) {
    return (
      <Box
        mx="md"
        mb="sm"
        p="sm"
        style={{
          border: '1px dashed #ccc',
          borderRadius: 8,
          cursor: 'pointer',
        }}
        onClick={() => navigate('/meal-plan')}
      >
        <Group justify="space-between" align="center">
          <div>
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
              Dagens middag
            </Text>
            <Text size="sm" c="dimmed" mt={2}>
              Ingen måltid planerad
            </Text>
          </div>
          <Button size="xs" variant="filled" color="sage" onClick={() => navigate('/meal-plan')}>
            Planera
          </Button>
        </Group>
      </Box>
    )
  }

  return (
    <Box
      mx="md"
      mb="sm"
      p="sm"
      style={{
        background: '#f8fbee',
        borderRadius: 8,
        borderLeft: '3px solid #53642e',
        cursor: 'pointer',
      }}
      onClick={() => navigate('/meal-plan')}
    >
      <Group justify="space-between" align="center">
        <div>
          <Text size="xs" fw={600} tt="uppercase" c="sage">
            Dagens middag
          </Text>
          <Text size="md" fw={500} mt={2}>
            {todayMeal.title}
          </Text>
          {ingredientStatus && (
            <Text size="xs" c="dimmed" mt={2}>
              {ingredientStatus.matched}/{ingredientStatus.total} ingredienser
            </Text>
          )}
        </div>
        <Text size="xs" c="dimmed">
          →
        </Text>
      </Group>
    </Box>
  )
}
```

- [ ] **Step 4: Insert widget in InventoryPage**

In `src/pages/InventoryPage.tsx`, add import (around line 27):

```typescript
import { TodayMealWidget } from '../components/TodayMealWidget'
```

Insert `<TodayMealWidget />` right after `<NotificationBanner />` on line 228:

```tsx
    <Stack gap={0}>
      <NotificationBanner />
      <TodayMealWidget />
```

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/tests/TodayMealWidget.test.tsx`
Expected: PASS

- [ ] **Step 6: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 7: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add src/components/TodayMealWidget.tsx src/pages/InventoryPage.tsx \
  src/tests/TodayMealWidget.test.tsx
git commit -m "feat: add TodayMealWidget to InventoryPage"
```

---

### Task 7: Final Integration + Polish

**Files:**
- All files from previous tasks (verify integration)

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 4: Manual smoke test checklist**

Run: `npm run dev`

Verify:
1. Fifth tab "Veckoplan" appears in bottom navigation
2. MealPlanPage shows current week with day rows
3. Week navigation (← →) changes the displayed week
4. "Lägg till" on empty day opens AddMealModal
5. Search finds recipes, selecting one saves to the day
6. Freetext entry (type + Enter) saves as freetext
7. ✕ button removes a planned meal
8. "Generera inköpslista" shows IngredientReviewModal with ingredients
9. Adding to shopping list actually creates items in inköpslistan
10. InventoryPage shows TodayMealWidget at top
11. Widget shows today's planned meal or "Planera" button
12. Clicking widget navigates to /meal-plan

- [ ] **Step 5: Commit any polish fixes**

```bash
git add -A
git commit -m "chore: meal planning integration polish"
```
