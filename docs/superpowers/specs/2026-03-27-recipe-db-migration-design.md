# Recipe DB Migration — MealDB API → Supabase Postgres

**Date:** 2026-03-27
**Status:** Approved

## Summary

Replace the external TheMealDB API with a local `recipes` table (25k scraped Swedish recipes from ICA) in the same Supabase project. This eliminates the English-only API dependency, removes the Swedish→English ingredient translation layer, and gives full control over recipe data.

## Architecture Decision

**Single Supabase project** — the `recipes` table lives alongside the existing app tables (`households`, `inventory`, `shopping_list`, etc.). One client, one auth system, RLS protects recipes for authenticated users only.

Alternatives considered and rejected:

- **Second Supabase client** — unnecessary complexity since we consolidated into one project
- **Edge Function proxy** — extra latency, cold starts, harder to debug
- **Foreign Data Wrapper** — sync complexity, data duplication

## Database Schema

The `recipes` table already exists on the new Supabase project:

```sql
CREATE TABLE public.recipes (
  id serial NOT NULL,
  url text NOT NULL,
  slug text NULL,
  name text NULL,
  description text NULL,
  ingredients jsonb NULL,      -- string[]
  instructions jsonb NULL,     -- string[]
  image_urls jsonb NULL,       -- string[]
  cook_time text NULL,
  prep_time text NULL,
  total_time text NULL,
  servings text NULL,
  sitemap_lastmod date NULL,
  scraped_at timestamptz NULL DEFAULT now(),
  raw_schema_json jsonb NULL,
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_url_key UNIQUE (url)
);
```

### RLS

- All existing app tables: same policies as before via `is_household_member()` function
- `recipes`: `SELECT` for `authenticated` role only (data is private, not public)

### Search Functions

**Full-text search** with Swedish stemming:

```sql
CREATE INDEX idx_recipes_fts ON public.recipes
  USING GIN (to_tsvector('swedish', coalesce(name, '') || ' ' || coalesce(description, '')));

CREATE OR REPLACE FUNCTION public.search_recipes(query text, lim int DEFAULT 20)
RETURNS SETOF public.recipes AS $$
  SELECT *
  FROM public.recipes
  WHERE to_tsvector('swedish', coalesce(name, '') || ' ' || coalesce(description, ''))
        @@ plainto_tsquery('swedish', query)
  ORDER BY ts_rank(
    to_tsvector('swedish', coalesce(name, '') || ' ' || coalesce(description, '')),
    plainto_tsquery('swedish', query)
  ) DESC
  LIMIT lim;
$$ LANGUAGE sql STABLE;
```

**Ingredient matching** for "what can I cook?" feature:

```sql
CREATE OR REPLACE FUNCTION public.match_recipes_by_ingredients(search_ingredients text[], lim int DEFAULT 20)
RETURNS TABLE(id int, name text, slug text, image_urls jsonb, match_count int) AS $$
  SELECT
    r.id, r.name, r.slug, r.image_urls,
    count(*)::int AS match_count
  FROM public.recipes r,
       jsonb_array_elements_text(r.ingredients) AS ri(ingredient),
       unnest(search_ingredients) AS inv(item)
  WHERE lower(ri.ingredient) LIKE '%' || lower(inv.item) || '%'
  GROUP BY r.id, r.name, r.slug, r.image_urls
  HAVING count(DISTINCT inv.item) >= 2
  ORDER BY count(DISTINCT inv.item) DESC, r.name
  LIMIT lim;
$$ LANGUAGE sql STABLE;
```

## App Code Changes

### New `Recipe` Type

Replace MealDB-shaped types in `src/types/index.ts`:

```ts
interface Recipe {
  id: number
  url: string
  slug: string | null
  name: string | null
  description: string | null
  ingredients: string[]
  instructions: string[]
  imageUrls: string[]
  cookTime: string | null
  prepTime: string | null
  totalTime: string | null
  servings: string | null
}
```

Delete `MealDBMeal` and `MealDBResponse` types.

### Rewrite `src/lib/recipes.ts`

Query Supabase instead of MealDB:

- `searchRecipes(query)` — calls `search_recipes` RPC
- `getRecipeById(id)` — `.from('recipes').select().eq('id', id).single()` + snake→camelCase mapping
- `getRecipeBySlug(slug)` — same by slug, for URL-friendly routes
- `suggestRecipes(ingredientNames)` — calls `match_recipes_by_ingredients` RPC, fetches full details for top matches

### Simplify `src/lib/recipeMatching.ts`

- Remove `translateToEnglish` dependency — all comparisons are Swedish↔Swedish now
- Adapt `matchRecipe` to new `Recipe.ingredients` shape (`string[]` instead of `{ name, measure }[]`)
- Keep `RecipeMatch`, `normalizeIngredient`, `ingredientsMatch`, `matchRecipes`
- Keep session cache utilities (`getCached`, `setCache`)

### Delete `src/lib/ingredientTranslations.ts`

No longer needed — recipes and inventory are both in Swedish.

### Update `src/pages/RecipesPage.tsx`

Adapt to new types and function signatures:

- `recipe.name` instead of `recipe.strMeal`
- `recipe.imageUrls[0]` instead of `recipe.strMealThumb`
- `recipe.instructions` is `string[]` (steps) instead of a single text blob
- New metadata available: `cookTime`, `prepTime`, `totalTime`, `servings`

### Environment Variables

Update `.env.local` with new Supabase project URL and anon key (same variable names `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`). Update Vercel env vars for production.

## Files Changed

| Action  | File                                                                 |
| ------- | -------------------------------------------------------------------- |
| Modify  | `src/types/index.ts` — new Recipe type, delete MealDB types          |
| Rewrite | `src/lib/recipes.ts` — Supabase queries instead of MealDB            |
| Modify  | `src/lib/recipeMatching.ts` — remove translation, adapt to new type  |
| Delete  | `src/lib/ingredientTranslations.ts`                                  |
| Modify  | `src/pages/RecipesPage.tsx` — adapt to new types/functions           |
| Modify  | `src/lib/__tests__/recipeMatching.test.ts` — adapt to new type       |
| Modify  | `src/lib/__tests__/recipes.test.ts` — mock Supabase instead of fetch |
| Modify  | `.env.local` — new Supabase URL + key                                |

## Database Setup (already done)

All SQL has been executed on the new Supabase project:

1. App tables created (households, household_members, storage_locations, inventory, shopping_list, barcodes)
2. RLS policies + `is_household_member()` function
3. Realtime enabled on inventory + shopping_list
4. GIN index + `search_recipes` function
5. `match_recipes_by_ingredients` function
