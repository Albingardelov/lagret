-- 1. Create storage_locations table
CREATE TABLE storage_locations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text NOT NULL CHECK (icon IN ('pantry', 'fridge', 'freezer')),
  sort_order   int  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_locations: member read"
  ON storage_locations FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "storage_locations: member insert"
  ON storage_locations FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "storage_locations: member update"
  ON storage_locations FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "storage_locations: member delete"
  ON storage_locations FOR DELETE
  USING (is_household_member(household_id));

-- 3. Insert default locations for all existing households
INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Skafferi', 'pantry', 0 FROM households;

INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Kylskåp', 'fridge', 1 FROM households;

INSERT INTO storage_locations (household_id, name, icon, sort_order)
SELECT id, 'Frys', 'freezer', 2 FROM households;

-- 4. Add new UUID column to inventory
ALTER TABLE inventory ADD COLUMN location_id uuid;

-- 5. Map old 'pantry'/'fridge'/'freezer' strings to new UUIDs
UPDATE inventory i
SET location_id = sl.id
FROM storage_locations sl
WHERE sl.household_id = i.household_id
  AND sl.icon = i.location;

-- 6. Make it NOT NULL and add FK constraint
ALTER TABLE inventory ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE inventory ADD CONSTRAINT inventory_location_id_fkey
  FOREIGN KEY (location_id) REFERENCES storage_locations(id);

-- 7. Drop old column, rename new one
ALTER TABLE inventory DROP COLUMN location;
ALTER TABLE inventory RENAME COLUMN location_id TO location;

-- 8. Recreate index
CREATE INDEX ON inventory (location);
