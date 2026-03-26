-- Seed-data för lokal utveckling
-- Kör: supabase db reset (nollställer och kör migrations + seed)

-- Testanvändare skapas via Supabase Auth UI eller CLI
-- Ersätt UUID:erna nedan med riktiga user-id:n från din lokala instans

DO $$
DECLARE
  v_household_id uuid := gen_random_uuid();
  v_user_id      uuid := '00000000-0000-0000-0000-000000000001'; -- byt ut mot verkligt id
BEGIN

  INSERT INTO households (id, name, invite_code)
  VALUES (v_household_id, 'Hemma', 'TEST1234');

  INSERT INTO household_members (household_id, user_id)
  VALUES (v_household_id, v_user_id);

  INSERT INTO inventory (household_id, name, quantity, unit, location, expiry_date, category) VALUES
    (v_household_id, 'Mjölk',        1,    'l',   'fridge',  current_date + 4,  'Mejeri'),
    (v_household_id, 'Ägg',          12,   'st',  'fridge',  current_date + 14, 'Mejeri'),
    (v_household_id, 'Smör',         1,    'pkt', 'fridge',  current_date + 30, 'Mejeri'),
    (v_household_id, 'Pasta',        500,  'g',   'pantry',  NULL,              'Torrvaror'),
    (v_household_id, 'Ris',          1,    'kg',  'pantry',  NULL,              'Torrvaror'),
    (v_household_id, 'Tomatkonserv', 2,    'st',  'pantry',  current_date + 365,'Konserver'),
    (v_household_id, 'Kycklingfilé', 600,  'g',   'freezer', current_date + 60, 'Kött'),
    (v_household_id, 'Lax',          400,  'g',   'freezer', current_date + 2,  'Fisk'),
    (v_household_id, 'Broccoli',     1,    'st',  'fridge',  current_date + 3,  'Grönsaker'),
    (v_household_id, 'Lök',          3,    'st',  'pantry',  NULL,              'Grönsaker');

  INSERT INTO shopping_list (household_id, name, note) VALUES
    (v_household_id, 'Mjölk',  '3 liter'),
    (v_household_id, 'Bröd',   NULL),
    (v_household_id, 'Apelsiner', '1 kg');

END $$;
