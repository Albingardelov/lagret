# Ingredient Groups Migration

**Date:** 2026-03-28
**Status:** Draft

## Summary

Replace the flat `ingredients: string[]` field on recipes with `ingredientGroups: IngredientGroup[]` to support grouped ingredients (e.g. "Sås", "Potatismos"). This affects types, data fetching, matching logic, UI rendering, cooking mode, and two Supabase RPC functions.

## Data Structure

The `ingredient_groups` column in the `recipes` table stores:

```json
[
  { "name": null, "items": ["1 dl olivolja", "salt"] },
  { "name": "Sås", "items": ["2 dl grädde", "1 msk smör"] }
]
```

- `name: null` means ungrouped items (render without header)
- `name: string` renders as a section header

TypeScript type:

```ts
export interface IngredientGroup {
  name: string | null
  items: string[]
}
```

## Changes

### 1. Types (`src/types/index.ts`)

- Add `IngredientGroup` interface
- Replace `ingredients: string[]` with `ingredientGroups: IngredientGroup[]` on `Recipe`
- Remove `ingredients` entirely

### 2. Recipes lib (`src/lib/recipes.ts`)

- `RecipeRow`: replace `ingredients` with `ingredient_groups`
- `mapRecipe()`: map `ingredient_groups` → `ingredientGroups`
- All `.select()` queries: replace `ingredients` with `ingredient_groups`

### 3. Recipe matching (`src/lib/recipeMatching.ts`)

- Add helper: `getAllIngredients(recipe)` — flattens all groups' items into a single `string[]`
- `matchRecipe()`: use `getAllIngredients()` instead of `recipe.ingredients`
- Matching logic is group-agnostic — groups only matter for display

### 4. RecipesPage UI (`src/pages/RecipesPage.tsx`)

#### Recipe card (list view)

- Score badge: count total items across all groups using `getAllIngredients()`

#### Recipe modal — ingredient view (not cooking)

- Render each group:
  - If `name` is not null → show group name as a `Text fw={600}` subheader
  - List items with ✓/✗ icons (same as today, but per group)
- "Ingredienser (3/8 hemma)" header counts across all groups

#### Recipe modal — cooking mode

- Show **all ingredients grouped** (not just matched inventory items)
- Each ingredient gets a checkbox
- Matched ingredients are pre-checked
- Unmatched ingredients are unchecked (user can still check them off as a cooking checklist)
- "Bekräfta" still only decrements inventory for items that match actual inventory entries
- Group headers shown in cooking mode too

### 5. Supabase RPC functions (SQL migration)

Two functions need updating to extract ingredient text from `ingredient_groups` JSONB instead of `ingredients`:

- `search_recipes` — full-text search
- `match_recipes_by_ingredients` — ingredient matching

See `supabase/migrations/2026-03-28-ingredient-groups-rpc.sql` for the migration.

## Out of scope

- Migrating old `ingredients` data to `ingredient_groups` (assumed already done by scraper)
- Dropping the `ingredients` column from DB (can be done later)
- Changes to the scraper
