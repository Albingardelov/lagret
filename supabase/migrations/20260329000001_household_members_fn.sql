-- supabase/migrations/20260329000001_household_members_fn.sql
CREATE OR REPLACE FUNCTION get_household_members(hid uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT hm.user_id, u.email::text
  FROM household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = hid
    AND is_household_member(hid);
$$;
