-- Add category column to shopping_list
ALTER TABLE shopping_list ADD COLUMN IF NOT EXISTS category TEXT;
