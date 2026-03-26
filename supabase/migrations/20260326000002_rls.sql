-- ============================================================
-- Row Level Security
-- En användare får bara läsa/skriva data som tillhör
-- ett hushåll de är medlem i.
-- ============================================================

ALTER TABLE households       ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list    ENABLE ROW LEVEL SECURITY;

-- Helper: returnerar true om den inloggade användaren
-- är medlem i det givna hushållet
CREATE OR REPLACE FUNCTION is_household_member(hid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ---- households ----
-- Inloggad användare kan se hushåll (krävs för att söka på inbjudningskod).
-- Åtkomst till känslig data (inventory, shopping) skyddas av egna policies.
CREATE POLICY "households: member read"
  ON households FOR SELECT
  USING (is_household_member(id) OR auth.uid() IS NOT NULL);

-- Ny rad: vem som helst som är inloggad kan skapa ett hushåll
CREATE POLICY "households: authenticated create"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- household_members ----
-- Läsa: se övriga medlemmar i samma hushåll
CREATE POLICY "household_members: member read"
  ON household_members FOR SELECT
  USING (is_household_member(household_id));

-- Gå med i ett hushåll (INSERT egen user_id)
CREATE POLICY "household_members: join"
  ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Lämna hushåll (DELETE egen rad)
CREATE POLICY "household_members: leave"
  ON household_members FOR DELETE
  USING (user_id = auth.uid());

-- ---- inventory ----
CREATE POLICY "inventory: member read"
  ON inventory FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "inventory: member insert"
  ON inventory FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "inventory: member update"
  ON inventory FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "inventory: member delete"
  ON inventory FOR DELETE
  USING (is_household_member(household_id));

-- ---- shopping_list ----
CREATE POLICY "shopping_list: member read"
  ON shopping_list FOR SELECT
  USING (is_household_member(household_id));

CREATE POLICY "shopping_list: member insert"
  ON shopping_list FOR INSERT
  WITH CHECK (is_household_member(household_id));

CREATE POLICY "shopping_list: member update"
  ON shopping_list FOR UPDATE
  USING (is_household_member(household_id));

CREATE POLICY "shopping_list: member delete"
  ON shopping_list FOR DELETE
  USING (is_household_member(household_id));
