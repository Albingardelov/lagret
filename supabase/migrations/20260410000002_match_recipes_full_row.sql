-- Migration: Return full recipe rows from match_recipes_by_ingredients
-- This eliminates the second query in suggestRecipes (was: RPC → .in('id', ids))
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS match_recipes_by_ingredients(text[], integer);

CREATE OR REPLACE FUNCTION match_recipes_by_ingredients(
  search_ingredients text[],
  lim int DEFAULT 20
)
RETURNS SETOF recipes
LANGUAGE sql STABLE
AS $$
  WITH ranked AS (
    SELECT
      r.id,
      COUNT(DISTINCT lower(item)) AS match_count
    FROM recipes r,
         jsonb_array_elements(r.ingredient_groups) AS grp,
         jsonb_array_elements_text(grp -> 'items') AS item
    WHERE r.name IS NOT NULL
      AND r.image_urls IS NOT NULL
      AND jsonb_array_length(r.image_urls) > 0
      AND EXISTS (
        SELECT 1
        FROM unnest(search_ingredients) AS si
        WHERE lower(item) LIKE '%' || lower(si) || '%'
           OR lower(si) LIKE '%' || lower(item) || '%'
      )
    GROUP BY r.id
    ORDER BY match_count DESC, r.id DESC
    LIMIT lim
  )
  SELECT r.*
  FROM recipes r
  JOIN ranked ON r.id = ranked.id
  ORDER BY ranked.match_count DESC, r.id DESC;
$$;
