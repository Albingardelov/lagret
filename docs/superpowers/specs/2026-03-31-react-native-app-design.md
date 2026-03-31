# React Native app design (monorepo)

**Datum:** 2026-03-31

## Mål

Bygg en React Native-app som känns och fungerar så likt Lagret PWA som möjligt, med maximal återanvändning av affärslogik och datalager (Zustand + Supabase).

## Icke-mål

- Ersätta PWA:n med Expo Web
- “Perfekt pixel parity” över alla plattformar på dag 1 (men målet är att ligga nära)

## Tekniskt val

- **React Native runtime:** Expo
- **Navigation:** React Navigation med bottom tabs
- **State:** Zustand (delas via `packages/core`)
- **Backend:** Supabase (samma projekt, samma tabeller/RLS)

## Repo-struktur (monorepo)

Vi delar upp repo:t i appar + delade paket:

- `apps/pwa` — nuvarande web-app (React + Vite + Mantine)
- `apps/mobile` — ny Expo-app
- `packages/core` — delad domänlogik, Supabase-anrop, Zustand-stores och typer

Princip: **UI och navigation är plattformsspecifikt**, men **all domänlogik** (t.ex. `inventoryStore`, `shoppingStore`, `householdStore`, map-funktioner, Supabase-queries) flyttas till `packages/core`.

## Delning: vad flyttas till `packages/core`

- **Typer:** gemensamma TypeScript-typer (motsv. `src/types`)
- **Supabase-klient:** wrapper runt `createClient()`
- **Stores (Zustand):** auth, inventory, shopping, households, locations
- **Data-mappning:** snake_case → camelCase (som idag)
- **Felhantering:** stores ska kasta errors (som idag), UI ansvarar för toasts/loading-states

## Plattformsspecifika adaptrar

För att kunna dela stores utan att dra in web-API:er i mobilen skapar vi små adaptrar i `packages/core/platform/*`:

- **Persistens:** `localStorage` (web) vs `AsyncStorage` (RN)
- **OAuth/redirect:** `window.location.origin` (web) vs RN Linking / deep links (Expo)

Stores får injecta/bero av adaptrar i stället för att direkt använda `window`/`localStorage`.

## Navigation / IA (motsvarar PWA routes)

PWA routes idag:

- `/` Lagret
- `/recipes` Recept
- `/shopping` Inköp
- `/household` Hushåll
- `/login`

RN motsvarighet:

- **Auth gate**: loader → login → app
- **Bottom tabs**: Lagret / Recept / Inköp / Hushåll (samma ordning och ikoner så långt det går)

## Design / theme

Mobile ska matcha PWA:ns “terra”-känsla:

- **Primärfärg:** terra-palett (samma hex som i `src/App.tsx`)
- **Bakgrund:** varm ljus (motsv. PWA:s `BG = #F7F2EB`)
- **Typografi:** Manrope (brödtext), Epilogue (rubriker) om möjligt i Expo
- **Former:** rundade knappar/chips och mjuka ytor

Bottom tab-bar ska efterlikna PWA footer:

- aktiv-state med terra accent + subtil bakgrund
- kompakt label med uppercase/känsla av PWA

## Env / konfiguration

Vi behöver stöd för olika env-namn:

- PWA: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Expo: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

`packages/core` ska exponera en `createSupabaseClient(config)` eller en konfig-funktion som kan matas av respektive app.

## Migreringsstrategi (inkrementell)

1. Skapa monorepo-struktur och flytta PWA till `apps/pwa` utan beteendeförändringar
2. Lägg till `packages/core` och flytta “rena” delar först (typer, map-funktioner, Supabase-wrapper)
3. Flytta stores till `packages/core`, inför platform-adaptrar där det behövs
4. Scaffolda Expo-app i `apps/mobile` och implementera:
   - auth gate + login
   - bottom tabs + tomma skärmar
   - koppla på delade stores och Supabase
5. Portera skärmar en i taget (Inventory → Shopping → Household → Recipes), med fokus på beteendeparitet

## Testning

Vi prioriterar snabb iteration. Tester kan läggas till senare; initialt fokuserar vi på fungerande flöden i appen.

