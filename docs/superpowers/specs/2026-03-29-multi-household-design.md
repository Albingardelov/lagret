# Multi-hushåll & Medlemslista

**Datum:** 2026-03-29
**Status:** Godkänd, redo för implementation

## Sammanfattning

En användare ska kunna vara med i flera hushåll (t.ex. hem + stuga) och byta aktivt hushåll på Hushåll-sidan. Det aktiva hushållet styr vilket lager, vilka platser och vilken inköpslista som visas i hela appen. Dessutom ska man kunna se vilka e-poster som är med i sitt aktiva hushåll.

## Scope

- Visa medlemslista (e-poster) för aktivt hushåll
- Visa alla hushåll användaren är med i, med möjlighet att byta aktivt
- Byte av hushåll uppdaterar lagret, inköpslistan och platserna omedelbart
- Befintliga funktioner (skapa hushåll, gå med via inbjudningskod) behålls oförändrade

Inte i scope: display-namn, avatarer, roller (admin/medlem), lämna hushåll.

## Databas

### Ny SQL-funktion

```sql
CREATE OR REPLACE FUNCTION get_household_members(hid uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT hm.user_id, u.email
  FROM household_members hm
  JOIN auth.users u ON u.id = hm.user_id
  WHERE hm.household_id = hid
    AND is_household_member(hid);
$$;
```

`SECURITY DEFINER` krävs för att kunna läsa `auth.users.email` trots RLS. Funktionen kontrollerar att den anropande användaren är medlem i hushållet via `is_household_member(hid)` innan den returnerar data.

Migrationen läggs i `supabase/migrations/20260329000001_household_members_fn.sql`.

## Frontend

### `householdStore` (src/store/householdStore.ts)

Nuvarande: hämtar ett hushåll via `.limit(1)`.

Nytt state:
```ts
households: Household[]          // alla hushåll användaren är med i
household: Household | null      // det aktiva (bakåtkompatibelt)
activeHouseholdId: string | null // sparas i localStorage
members: HouseholdMember[]       // medlemmar i aktivt hushåll
```

Ny typ i `src/types/index.ts`:
```ts
interface HouseholdMember {
  userId: string
  email: string
}
```

Nya/ändrade funktioner:
- `fetchHouseholds()` — hämtar alla hushåll användaren är med i (ersätter `fetchHousehold`)
- `setActiveHousehold(id)` — sätter `activeHouseholdId` i localStorage och state, uppdaterar `household`, anropar `fetchMembers(id)`
- `fetchMembers(id)` — anropar `get_household_members(id)` via Supabase RPC, sätter `members`

`fetchHousehold()` behålls som alias för `fetchHouseholds()` för bakåtkompatibilitet med `AppLayout`.

#### Aktivt hushåll vid start
1. Läs `activeHouseholdId` från localStorage
2. Hämta alla hushåll
3. Om sparad id finns bland hushållen → använd den
4. Annars → välj första hushållet, spara i localStorage

### `AppLayout` (src/components/AppLayout.tsx)

Ingen förändring behövs — anropar redan `fetchHousehold()` som nu delegerar till `fetchHouseholds()`.

### `HouseholdPage` (src/pages/HouseholdPage.tsx)

Sidan struktureras om i tre sektioner:

**1. Mina hushåll**
Lista av kort, ett per hushåll. Aktivt hushåll markerat med terraröd ram och "Aktivt"-badge. Klick på ett inaktivt kort anropar `setActiveHousehold(id)`.

**2. Medlemmar**
Lista med e-poster för alla i det aktiva hushållet. Hämtas via `members` från store. Laddas när aktivt hushåll sätts.

**3. Hantera hushåll** (befintligt)
Skapa nytt hushåll, gå med via inbjudningskod, visa inbjudningskod för aktivt hushåll. Oförändrat.

## Dataflöde vid byte av hushåll

```
setActiveHousehold(id)
  → localStorage.setItem('lagret:activeHousehold', id)
  → householdStore.household = households.find(id)
  → fetchMembers(id)
  → locationsStore.fetchLocations()   ← hämtar platser för nytt hushåll
  → inventoryStore.fetchItems()       ← hämtar lager för nytt hushåll
  → shoppingStore.fetchItems()        ← hämtar inköpslista för nytt hushåll
```

`locationsStore`, `inventoryStore` och `shoppingStore` läser redan `household?.id` från `householdStore.getState()` — inget behöver ändras i dessa stores.

## Felhantering

- Om `get_household_members` misslyckas: `members` sätts till `[]`, inget felmeddelande visas (icke-kritisk funktion)
- Om `fetchHouseholds` returnerar tom array: befintligt "skapa hushåll"-flöde visas som idag

## Testning

- Enhetstester för `householdStore`: `fetchHouseholds` sätter `households`, `setActiveHousehold` sparar i localStorage och uppdaterar `household`
- Befintliga tester ska fortsätta passera utan ändringar
