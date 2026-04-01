# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kommandon

Node körs via nvm – använd alltid full sökväg eller sätt PATH:

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:/usr/bin:/bin:$PATH"
```

```bash
npm run dev          # Starta dev-server (Vite)
npm run build        # TypeScript-check + Vite build
npm run lint         # ESLint
npm run test         # Vitest (enhetstester)
npm run test:coverage
npm run test:e2e     # Playwright E2E
```

Kör enstaka test:

```bash
npx vitest run src/store/__tests__/inventoryStore.test.ts   # En specifik testfil
npx vitest run -t "should add item"                          # Test by name
npx playwright test e2e/inventory.spec.ts                    # En specifik E2E-test
```

## Stack

| Del                | Teknologi                                   |
| ------------------ | ------------------------------------------- |
| UI                 | React 19 + Vite 7 + TypeScript              |
| Komponentbibliotek | Mantine 8 (ej Tailwind)                     |
| Ikoner             | `@tabler/icons-react`                       |
| State              | Zustand                                     |
| Databas/Auth       | Supabase (realtid, RLS)                     |
| Recept-API         | TheMealDB (gratis, ingen nyckel)            |
| Streckkod          | ZXing (`@zxing/library`)                    |
| Datum              | dayjs                                       |
| Routing            | React Router v7                             |
| PWA                | vite-plugin-pwa + Workbox                   |
| Tester             | Vitest + React Testing Library + Playwright |

## Arkitektur

```
src/
  App.tsx       Root-komponent – initierar auth (onAuthStateChange) vid start
  components/   Återanvändbara UI-komponenter
  pages/        En fil per route
  store/        Zustand-stores (ett ansvarsområde per fil)
  lib/          Extern API-logik (supabase.ts, barcodeRegistry.ts, recipes.ts)
  hooks/        Custom React hooks
  types/        Delade TypeScript-typer (index.ts)
```

**Dataflöde:** `pages` anropar `store` → `store` anropar `lib` → `lib` pratar med Supabase/externa API:er.

## Kodstil

Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'es5'`, `printWidth: 100`.

## Routing

`src/router.tsx` definierar alla routes med `createBrowserRouter()`.
Alla skyddade routes ligger under `<AuthGuard>` + `<AppLayout>`.
Sidor lazy-loadas med `React.lazy()` + `Suspense` + `<PageLoader />`.

## Databas

Tabeller: `households`, `household_members`, `inventory`, `shopping_list`, `barcodes`

- RLS aktiverat på alla tabeller
- `is_household_member(uuid)` är en SECURITY DEFINER-funktion som används i policies
- `household_members` SELECT-policy: `user_id = auth.uid()` (enkel, ej självrefererande)
- Migrationer läggs i `supabase/migrations/` och körs via Supabase dashboard SQL editor
- Realtime aktiverat för `inventory` och `shopping_list`

### Viktig: snake_case → camelCase-mappning

Supabase returnerar råa kolumnnamn (snake_case). TypeScript-typerna använder camelCase.
**Mappa alltid data manuellt** – använd en `mapItem(row)`-funktion, se `inventoryStore.ts`.

Kolumner att mappa för `inventory`:

- `expiry_date` → `expiryDate`
- `created_at` → `createdAt`
- `updated_at` → `updatedAt`

## Auth

`App.tsx` anropar `useAuthStore.initialize()` vid app-start (en gång globalt).
`AuthGuard` prenumererar **inte** på auth-state – den läser bara från store.
Detta förhindrar race conditions där `INITIAL_SESSION` nollställer en nyss inloggad session.

`signInWithPassword` sätter `user/session` direkt i store efter lyckad inloggning,
utan att vänta på `onAuthStateChange`.

## Hushåll

`useHouseholdStore.getState().household?.id` används i `inventoryStore` för att hämta `household_id`.
`AppLayout` anropar `fetchHousehold()` på mount för att säkerställa att hushållet är laddat.

**Kaskad vid byte av hushåll:** `setActiveHousehold()` triggar sekventiellt:
`fetchMembers` → `fetchLocations` → `fetchItems` → `fetchShoppingItems`.
Aktivt hushåll persisteras i `localStorage` (`lagret:activeHousehold`).

## Realtime-prenumerationer

`inventoryStore` och `shoppingStore` har `subscribeRealtime()` som returnerar en unsubscribe-funktion.
Mönster i sidor:

```ts
useEffect(() => {
  const unsub = subscribeRealtime()
  return () => { unsub() }
}, [subscribeRealtime])
```

## Streckkod / produktinfo

`src/lib/barcodeRegistry.ts` slår upp och sparar produktinfo i Supabase `barcodes`-tabellen.
Open Food Facts används **inte** längre – allt är lokalt i databasen.
`saveBarcodeRegistry` anropas fire-and-forget med `.catch(() => {})` efter att en vara lagts till.

## Felhantering i stores

Store-funktioner (`addItem`, `addItems`, etc.) ska **kasta errors** (`throw new Error(...)`)
vid misslyckanden, inte bara sätta state och returnera tyst. Komponenter förväntar sig `throw`
för att kunna anropa `setSubmitting(false)` i sitt catch-block.

## Formulär / DateInput

Mantine `DateInput` kan returnera en sträng om användaren skriver manuellt (inte väljer via picker).
Kontrollera alltid med `instanceof Date` innan `.toISOString()` anropas:

```ts
const d = values.expiryDate
const expiryDate = d instanceof Date ? d.toISOString().split('T')[0] : (d ?? undefined)
```

Lägg dessutom denna beräkning **inuti** try-catch så att `setSubmitting(false)` alltid körs.

## Git-regler

- Lägg **aldrig** till `Co-Authored-By: Claude` i commit-meddelanden
- Committa aldrig `.env` eller `.env.local`

## Miljövariabler

Skapa `.env.local` (committas aldrig):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

På Vercel läggs samma variabler in i projektinställningarna (lagret.vercel.app).

## Testinfrastruktur

- **MSW (Mock Service Worker)** används för att mocka HTTP i enhetstester. Handlers i `src/test/mocks/handlers/`.
- **`renderWithMantine()`** i `src/test/utils.tsx` – custom render-wrapper med MantineProvider. Använd alltid denna istället för RTL:s `render()`.
- **`vi.hoisted()`** krävs för mockar som behöver initialiseras innan moduler importeras (t.ex. Supabase-mockar i store-tester).
- **E2E-fixtures** i `e2e/fixtures.ts` – `authedPage` injicerar fake JWT + localStorage-session och interceptar Supabase-anrop.

## Tema

Custom Mantine-tema i `App.tsx`: `primaryColor: 'terra'` (terrakotta-palett).
Typsnitt: `Manrope` (brödtext), `Epilogue` (rubriker) – laddas via Google Fonts i `index.html`.
