-- Add English product name column to barcodes table.
-- Existing rows keep their Swedish name in the `name` column.
-- name_en is nullable — app falls back to `name` if missing.
ALTER TABLE barcodes ADD COLUMN IF NOT EXISTS name_en text;
