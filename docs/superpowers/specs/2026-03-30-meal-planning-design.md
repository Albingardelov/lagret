# Måltidsplanering — Design Spec

**Issue:** #22
**Datum:** 2026-03-30

## Översikt

Måltidsplanerare där användaren planerar en middag per dag i en veckovis kalendervy. Saknade ingredienser kan genereras till inköpslistan. Dagens planerade måltid visas på startsidan.

## Beslut

- Veckovis vy med bläddring framåt/bakåt (mån–sön)
- En måltid per dag
- Recept från databasen eller fritext
- Inköpslista: visa alla ingredienser, saknade förbockade, användaren väljer
- Ny tab "Veckoplan" i botten-navigationen (femte tab)
- Dagens måltid visas som kompakt kort på startsidan (Lager)
- Bara planering, ingen "lagad"-status

## Datamodell

### Tabell: `meal_plans`

| Kolumn         | Typ                          | Beskrivning                          |
| -------------- | ---------------------------- | ------------------------------------ |
| `id`           | uuid, PK                    | Default `gen_random_uuid()`          |
| `household_id` | uuid, FK → households        | RLS-scopad                           |
| `date`         | date, NOT NULL               | Planerad dag                         |
| `recipe_id`    | int, FK → recipes, nullable  | Kopplat recept (null = fritext)      |
| `title`        | text, NOT NULL               | Visningsnamn (receptnamn eller fritt) |
| `created_at`   | timestamptz                  | Default `now()`                      |

**Constraints:**
- `UNIQUE(household_id, date)` — max en måltid per dag per hushåll

**RLS:**
- Samma mönster som övriga tabeller: `is_household_member(household_id)`
- SELECT, INSERT, UPDATE, DELETE policies

**Realtime:** Aktiverat (samma mönster som `inventory` och `shopping_list`)

### TypeScript-typ

```ts
interface MealPlan {
  id: string
  householdId: string
  date: string        // ISO date "2026-03-30"
  recipeId: number | null
  title: string
  createdAt: string
}
```

Mappning i store: `household_id` → `householdId`, `recipe_id` → `recipeId`, `created_at` → `createdAt`.

## Zustand Store

**Fil:** `src/store/mealPlanStore.ts`

```
State:
  items: MealPlan[]
  loading: boolean

Actions:
  fetchItems(startDate, endDate)   — hämta planerade måltider för datumintervall
  addItem(date, title, recipeId?)  — upsert på (household_id, date)
  updateItem(id, title, recipeId?) — ändra befintlig
  removeItem(id)                   — ta bort
  subscribeRealtime()              — lyssna på ändringar
```

- Filtrerar alltid på `household_id` via `useHouseholdStore.getState().household?.id`
- `addItem` gör upsert: om det redan finns en rad för den dagen ersätts den
- Realtime-subscription följer samma mönster som `inventoryStore`

## Sidor & Komponenter

### MealPlanPage (`src/pages/MealPlanPage.tsx`)

Route: `/meal-plan`

- Veckonavigering i toppen: `← Vecka 14 · 30 mar – 5 apr →`
- Lista med en `DayCard` per dag (mån–sön)
- "Generera inköpslista för veckan"-knapp i botten

**DayCard-innehåll:**
- Planerad dag: datum, måltidsnamn, ingrediensstatus (X av Y hemma), ta bort-knapp
- Dagens dag: grön vänsterkant som markering
- Tom dag: datum, "Ingen måltid planerad", "Lägg till"-knapp

### AddMealModal (`src/components/AddMealModal.tsx`)

BottomSheet som öppnas vid "Lägg till" på en dag.

- **Sökfält:** Söker recept (debounced) och fungerar som fritext-input
- **Tre tabs:**
  - Förslag: `suggestRecipes()` — recept som matchar lagret, sorterade på matchningsgrad
  - Favoriter: Från localStorage (samma källa som RecipesPage)
  - Senaste: De senast använda recepten i `meal_plans`
- **Receptförslag:** Visar namn, ingrediensmatchning (%), tillagningstid
- **Fritext:** Enter i sökfältet utan att välja recept → spara som fritext (recipe_id = null)
- **Välj recept:** Klick → spara och stäng modal

### IngredientReviewModal (`src/components/IngredientReviewModal.tsx`)

BottomSheet som öppnas vid "Generera inköpslista".

- Visar alla ingredienser från veckans recept-kopplade måltider, grupperade per recept
- Saknade ingredienser: förbockade (kommer läggas till)
- Ingredienser som finns hemma: avbockade (kan bockas i manuellt)
- "Lägg till i inköpslistan"-knapp
- Anropar `shoppingStore.addItem()` per vald ingrediens
  - `note`-fältet sätts till receptnamnet (befintligt mönster)
- Dubbletthantering: hoppa över ingredienser som redan finns i inköpslistan (samma namn, ej köpt)

### TodayMealWidget (`src/components/TodayMealWidget.tsx`)

Kompakt kort som visas högst upp på InventoryPage.

- **Med planerad måltid:** Grön vänsterkant, "Dagens middag", måltidsnamn, ingrediensstatus
- **Utan planerad måltid:** Dashed border, "Ingen måltid planerad", "Planera"-knapp
- Klick navigerar till `/meal-plan`
- Hämtar dagens `MealPlan` från `mealPlanStore`

## Routing & Navigation

### Ny route
```
/meal-plan → MealPlanPage (inuti AuthGuard → AppLayout)
```

### Botten-navigation
Femte tab i AppLayout: ikon `IconToolsKitchen2` (eller liknande), label "Veckoplan".

## Befintlig kod som återanvänds

- `src/lib/recipeMatching.ts` — `ingredientsMatch()`, `getAllIngredients()`, `matchRecipe()`
- `src/store/shoppingStore.ts` — `addItem()` för att lägga till saknade ingredienser
- `src/store/inventoryStore.ts` — hämta lagerstatus för ingrediensmatchning
- `src/lib/recipes.ts` — `suggestRecipes()`, `getRecipeById()`
- `src/components/BottomSheet.tsx` — modal-komponent för AddMealModal och IngredientReviewModal

## Scope-avgränsning (v1)

**Ingår:**
- CRUD för måltidsplan (en per dag)
- Veckovis vy med bläddring
- Recept eller fritext
- Generera inköpslista med granskning
- Dagens måltid på startsidan
- Realtime-sync

**Ingår inte:**
- Flera måltider per dag
- "Lagad"-markering
- Drag-and-drop för att flytta måltider
- Receptförslag baserade på utgångsdatum
- Delning/export av veckoplan
