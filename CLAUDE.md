# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Kommandon

Node körs via nvm – använd alltid full sökväg eller sätt PATH:

```bash
PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
```

```bash
npm run dev          # Starta dev-server (Vite)
npm run build        # TypeScript-check + Vite build
npm run lint         # ESLint
npm run test         # Vitest (när det är uppsatt, issue #4)
npm run test:coverage
npm run test:e2e     # Playwright (när det är uppsatt, issue #8)
```

## Stack

| Del | Teknologi |
|-----|-----------|
| UI | React 19 + Vite 8 + TypeScript |
| Komponentbibliotek | Mantine 8 (ej Tailwind) |
| Ikoner | `@tabler/icons-react` |
| State | Zustand |
| Databas/Auth | Supabase (realtid, RLS) |
| Recept-API | TheMealDB (gratis, ingen nyckel) |
| Produktinfo | Open Food Facts (gratis, ingen nyckel) – issue #13 |
| Streckkod | ZXing (`@zxing/library`) |
| Datum | dayjs |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa + Workbox |
| Tester | Vitest + React Testing Library + Playwright |

## Arkitektur

```
src/
  components/   Återanvändbara UI-komponenter
  pages/        En fil per route
  store/        Zustand-stores (ett ansvarsområde per fil)
  lib/          Extern API-logik (supabase.ts, recipes.ts, openFoodFacts.ts)
  hooks/        Custom React hooks (t.ex. useScanner.ts)
  types/        Delade TypeScript-typer (index.ts)
```

**Dataflöde:** `pages` anropar `store` → `store` anropar `lib` → `lib` pratar med Supabase/externa API:er.

## Miljövariabler

Skapa `.env.local` (committas aldrig):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

På Vercel läggs samma variabler in i projektinställningarna.

## Databas

Migrationer ligger i `supabase/migrations/`. Tabeller: `households`, `household_members`, `inventory`, `shopping_list`. RLS är aktiverat – en användare når bara sin households data. Se issue #3 för fullt schema.

## Git-regler

- Lägg **aldrig** till `Co-Authored-By: Claude` i commit-meddelanden
- Committa aldrig `.env` eller `.env.local`

## Issues och milestones

Projektet är strukturerat i 4 milestones på GitHub:
1. **Grund & Infrastruktur** – CI/CD (#1), linting (#2), Supabase-schema (#3)
2. **Testsvit** – Vitest (#4), enhetstester (#5–6), komponenttester (#7), Playwright (#8–10)
3. **Kärnfunktioner** – Auth (#11), hushåll (#12), streckkodsskanning (#13), navigation (#14), inköpslista (#15), felhantering (#20)
4. **Recept & PWA** – Ingrediensmatchning (#16), offline (#17), push-notiser (#18), a11y (#19)

Börja alltid i milestone 1 och arbeta uppifrån.
