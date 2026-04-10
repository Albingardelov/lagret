-- Migration: Word-level ingredient matching in match_recipes_by_ingredients
-- Fixes: "Fläskfärs Limmared säteri" not matching "500 g fläskfärs"
-- Strategy: split each search ingredient into words (≥4 chars), match any word against recipe items
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
        -- First try full phrase match (fast path)
        WHERE lower(item) LIKE '%' || lower(si) || '%'
           OR lower(si) LIKE '%' || lower(item) || '%'
           -- Word-level fallback: any word ≥4 chars from the search ingredient appears in the recipe item
           OR EXISTS (
             SELECT 1
             FROM regexp_split_to_table(lower(si), '\s+') AS si_word
             WHERE length(si_word) >= 4
               AND lower(item) LIKE '%' || si_word || '%'
           )
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
