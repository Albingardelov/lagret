# Lagret mobile (Expo)

This app is part of the Lagret monorepo. Shared logic lives in `@lagret/core`, linked from this package as `file:../../packages/core` so Metro and TypeScript can resolve imports once you wire them up.

## Environment variables

Expo exposes variables prefixed with `EXPO_PUBLIC_` to the JavaScript bundle. For Supabase, set:

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL (same value as `VITE_SUPABASE_URL` in the web app, e.g. `https://<project>.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (same value as `VITE_SUPABASE_ANON_KEY`) |

Create a local env file (not committed), for example `.env.local` in this directory or use your shell / CI secrets:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Restart the dev server after changing env vars. See [Expo environment variables](https://docs.expo.dev/guides/environment-variables/) for details.

## Scripts

From the repository root:

- `npm run dev:mobile` — start Expo
- `npm run build:mobile` — `expo export` for this workspace

Or from `apps/mobile`: `npm run start`, `npm run android`, `npm run ios`, `npm run web`.
