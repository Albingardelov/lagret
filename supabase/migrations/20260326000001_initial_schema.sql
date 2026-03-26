-- ============================================================
-- Households
-- ============================================================
CREATE TABLE households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- Household members (many-to-many: users <-> households)
-- ============================================================
CREATE TABLE household_members (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (household_id, user_id)
);

-- ============================================================
-- Inventory
-- ============================================================
CREATE TABLE inventory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  barcode      text,
  quantity     numeric NOT NULL DEFAULT 1,
  unit         text NOT NULL DEFAULT 'st',
  location     text NOT NULL CHECK (location IN ('pantry', 'fridge', 'freezer')),
  expiry_date  date,
  category     text,
  image_url    text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Shopping list
-- ============================================================
CREATE TABLE shopping_list (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         text NOT NULL,
  note         text,
  is_bought    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX ON inventory (household_id);
CREATE INDEX ON inventory (location);
CREATE INDEX ON inventory (expiry_date);
CREATE INDEX ON shopping_list (household_id);
CREATE INDEX ON household_members (user_id);
