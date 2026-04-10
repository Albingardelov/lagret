-- Add vacuum_packed flag to inventory.
-- Vacuum packing extends the shelf life of meat/fish (and most other
-- foods) by roughly 5x — see VACUUM_PACK_MULTIPLIER in src/lib/storageDurations.ts.
-- Persisting the flag lets us show a "vakuum"-badge on items and recompute
-- the expiry date if the user toggles the flag from the edit modal.
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS vacuum_packed BOOLEAN NOT NULL DEFAULT FALSE;
