# Lagret

En PWA för att hålla koll på matförrådet hemma — med streckkodsscanning, inköpslista och receptförslag.

[![Live](https://img.shields.io/badge/Live-lagret.vercel.app-black?style=for-the-badge)](https://lagret.vercel.app)

---

## Vad är det?

Lagret löser ett konkret problem: man vet aldrig riktigt vad man har hemma. Appen låter dig:

- Scanna streckkoder för att snabbt lägga till varor
- Se vad som håller på att gå ut i datum
- Dela förrådet med andra i samma hushåll i realtid
- Få receptförslag baserat på det du faktiskt har hemma
- Hantera en gemensam inköpslista

Fungerar som en installationsbar app på mobilen (PWA).

## Stack

| Del | Teknologi |
|-----|-----------|
| UI | React 19 + TypeScript + Vite |
| Komponenter | Mantine 8 |
| State | Zustand |
| Backend/Auth | Supabase (Postgres, RLS, Realtime) |
| Streckkodsscanning | ZXing |
| Recept | TheMealDB API |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa + Workbox |
| Tester | Vitest + React Testing Library + Playwright |

## Arkitektur

```
src/
  components/   Återanvändbara UI-komponenter
  pages/        En fil per route, lazy-laddad
  store/        Zustand-stores (ett ansvarsområde per fil)
  lib/          Extern API-logik (Supabase, streckkoder, recept)
  hooks/        Custom React hooks
  types/        Delade TypeScript-typer
```

Dataflöde: `pages → store → lib → Supabase / externa API:er`

## Köra lokalt

```bash
# Klona och installera
git clone https://github.com/Albingardelov/lagret.git
cd lagret
npm install

# Miljövariabler
cp .env.example .env.local
# Fyll i VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY

# Starta dev-server
npm run dev
```

Du behöver ett eget Supabase-projekt med tabellerna `households`, `household_members`, `inventory`, `shopping_list` och `barcodes`.

## Tester

```bash
npm run test          # Enhetstester (Vitest)
npm run test:e2e      # E2E-tester (Playwright)
npm run build         # TypeScript-check + produktionsbygge
```
