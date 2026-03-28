-- Migration: Update RPC functions to use ingredient_groups instead of ingredients
-- Run this in Supabase SQL Editor

-- 1. search_recipes: full-text search across recipe name, description, and ingredient items
CREATE OR REPLACE FUNCTION search_recipes(query text, lim int DEFAULT 20)
RETURNS SETOF recipes
LANGUAGE sql STABLE
AS $$
  SELECT r.*
  FROM recipes r
  WHERE r.name IS NOT NULL
    AND r.image_urls IS NOT NULL
    AND jsonb_array_length(r.image_urls) > 0
    AND (
      r.name ILIKE '%' || query || '%'
      OR r.description ILIKE '%' || query || '%'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(r.ingredient_groups) AS grp,
             jsonb_array_elements_text(grp -> 'items') AS item
        WHERE item ILIKE '%' || query || '%'
      )
    )
  ORDER BY
    CASE WHEN r.name ILIKE '%' || query || '%' THEN 0 ELSE 1 END,
    r.id DESC
  LIMIT lim;
$$;

-- 2. match_recipes_by_ingredients: find recipes that use any of the given ingredients
CREATE OR REPLACE FUNCTION match_recipes_by_ingredients(
  search_ingredients text[],
  lim int DEFAULT 20
)
RETURNS TABLE(id int, name text, slug text, image_urls jsonb, match_count bigint)
LANGUAGE sql STABLE
AS $$
  SELECT
    r.id,
    r.name,
    r.slug,
    r.image_urls,
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
  GROUP BY r.id, r.name, r.slug, r.image_urls
  ORDER BY match_count DESC, r.id DESC
  LIMIT lim;
$$;
